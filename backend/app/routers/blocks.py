"""
Bloqueos en ambos sentidos (ver services/blocks_service.py).

- La empresa bloquea a un candidato: no puede postularse a sus vacantes ni escribirle.
- El candidato bloquea a una empresa: sus reclutadores no pueden escribirle y sus vacantes
  dejan de proponérsele. Solo el lado que bloqueó puede quitar el bloqueo.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, false as sa_false, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_company_member
from app.models import ChatBlock, Company, JobApplication, User
from app.schemas import BlockCreate, BlockResponse
from app.services.blocks_service import member_company_ids

router = APIRouter(prefix="/api/v1/blocks", tags=["Blocks"])


def _is_mine(block: ChatBlock, user: User, company_ids: List[int]) -> bool:
    email = (user.email or "").lower()
    if block.blocker_type == "candidate":
        return block.candidate_email.lower() == email
    return block.company_id in company_ids or user.role == "admin"


def _to_response(db: Session, block: ChatBlock, mine: bool) -> BlockResponse:
    company = db.query(Company).filter(Company.id == block.company_id).first()
    candidate = db.query(User).filter(User.email == block.candidate_email).first()
    candidate_name = candidate.nombre if candidate else None
    if not candidate_name:
        app = db.query(JobApplication).filter(JobApplication.candidate_email == block.candidate_email).order_by(JobApplication.created_at.desc()).first()
        candidate_name = app.candidate_name if app else None
    return BlockResponse(
        id=block.id,
        blocker_type=block.blocker_type,
        company_id=block.company_id,
        company_nombre=company.nombre if company else None,
        candidate_email=block.candidate_email,
        candidate_name=candidate_name,
        reason=block.reason,
        created_at=block.created_at,
        mine=mine,
    )


@router.get("/mine", response_model=List[BlockResponse])
def my_blocks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Bloqueos que me afectan: como candidato, las empresas que bloqueé; como reclutador, los
    bloqueos de mis empresas (los que hicimos y los candidatos que nos bloquearon).
    """
    email = (current_user.email or "").lower()
    company_ids = member_company_ids(db, current_user)
    conditions = [and_(ChatBlock.blocker_type == "candidate", ChatBlock.candidate_email == email)]
    if company_ids:
        conditions.append(ChatBlock.company_id.in_(company_ids))
    rows = db.query(ChatBlock).filter(or_(*conditions) if conditions else sa_false()).order_by(ChatBlock.created_at.desc()).all()
    return [_to_response(db, b, _is_mine(b, current_user, company_ids)) for b in rows]


@router.post("", response_model=BlockResponse)
def create_block(payload: BlockCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if payload.blocker_type == "company":
        require_company_member(company.id, current_user, db)
        email = (payload.candidate_email or "").strip().lower()
        if not email or "@" not in email:
            raise HTTPException(status_code=422, detail="Indica el correo del candidato a bloquear")
    else:
        email = (current_user.email or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Tu cuenta no tiene correo; no es posible registrar el bloqueo")

    block = db.query(ChatBlock).filter(
        ChatBlock.blocker_type == payload.blocker_type,
        ChatBlock.company_id == company.id,
        ChatBlock.candidate_email == email,
    ).first()
    if not block:
        block = ChatBlock(
            blocker_type=payload.blocker_type,
            company_id=company.id,
            candidate_email=email,
            reason=(payload.reason or "").strip() or None,
            created_by_email=current_user.email,
            created_at=datetime.utcnow(),
        )
        db.add(block)
        db.commit()
        db.refresh(block)
    return _to_response(db, block, True)


@router.delete("/{block_id}")
def delete_block(block_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Quita un bloqueo. Solo puede hacerlo el lado que lo creó."""
    block = db.query(ChatBlock).filter(ChatBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")
    if not _is_mine(block, current_user, member_company_ids(db, current_user)):
        raise HTTPException(status_code=403, detail="Solo quien hizo el bloqueo puede quitarlo")
    db.delete(block)
    db.commit()
    return {"status": "success", "deleted_id": block_id}
