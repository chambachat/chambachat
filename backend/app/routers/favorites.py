"""
Candidatos preferidos por empresa: el reclutador marca a un candidato desde su chat y luego
lo encuentra en "Candidatos preferidos" para retomar la conversación cuando haga falta.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_company_member
from app.models import CandidateFavorite, ChatBlock, Job, JobApplication, User
from app.schemas import FavoriteApplicationBrief, FavoriteCreate, FavoriteResponse

router = APIRouter(prefix="/api/v1/companies/{company_id}/favorites", tags=["Favorites"])


def _latest_application(db: Session, company_id: int, email: str, application_id: Optional[int] = None) -> Optional[JobApplication]:
    query = db.query(JobApplication).join(Job).filter(Job.empresa_id == company_id, JobApplication.candidate_email == email)
    if application_id:
        app = query.filter(JobApplication.id == application_id).first()
        if app:
            return app
    return query.order_by(JobApplication.created_at.desc()).first()


def _to_response(db: Session, fav: CandidateFavorite, blocked_emails: set) -> FavoriteResponse:
    app = _latest_application(db, fav.company_id, fav.candidate_email, fav.application_id)
    brief = None
    phone = None
    if app:
        last = max((m.created_at for m in app.messages if m.created_at), default=None)
        brief = FavoriteApplicationBrief(
            id=app.id,
            job_titulo=app.job.titulo if app.job else None,
            status=app.status,
            match_score=app.match_score,
            match_level=app.match_level,
            last_message_at=last,
        )
        phone = app.candidate_phone
    return FavoriteResponse(
        id=fav.id,
        company_id=fav.company_id,
        candidate_email=fav.candidate_email,
        candidate_name=fav.candidate_name or (app.candidate_name if app else None),
        candidate_phone=phone,
        nota=fav.nota,
        added_by_email=fav.added_by_email,
        created_at=fav.created_at,
        application=brief,
        blocked=fav.candidate_email in blocked_emails,
    )


def _blocked_emails(db: Session, company_id: int) -> set:
    return {
        b.candidate_email for b in db.query(ChatBlock).filter(
            ChatBlock.company_id == company_id, ChatBlock.blocker_type == "company",
        ).all()
    }


@router.get("", response_model=List[FavoriteResponse])
def list_favorites(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_company_member(company_id, current_user, db)
    favs = db.query(CandidateFavorite).filter(CandidateFavorite.company_id == company_id).order_by(CandidateFavorite.created_at.desc()).all()
    blocked = _blocked_emails(db, company_id)
    return [_to_response(db, f, blocked) for f in favs]


@router.post("", response_model=FavoriteResponse)
def add_favorite(company_id: int, payload: FavoriteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Marca (o actualiza) un candidato como preferido de la empresa. Idempotente por correo."""
    require_company_member(company_id, current_user, db)
    email = payload.candidate_email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Correo del candidato no válido")

    fav = db.query(CandidateFavorite).filter(
        CandidateFavorite.company_id == company_id, CandidateFavorite.candidate_email == email,
    ).first()
    if fav:
        if payload.nota is not None:
            fav.nota = payload.nota.strip() or None
        if payload.application_id:
            fav.application_id = payload.application_id
        if payload.candidate_name:
            fav.candidate_name = payload.candidate_name.strip()
    else:
        fav = CandidateFavorite(
            company_id=company_id,
            candidate_email=email,
            candidate_name=(payload.candidate_name or "").strip() or None,
            application_id=payload.application_id,
            nota=(payload.nota or "").strip() or None,
            added_by_email=current_user.email,
            created_at=datetime.utcnow(),
        )
        db.add(fav)
    db.commit()
    db.refresh(fav)
    return _to_response(db, fav, _blocked_emails(db, company_id))


@router.delete("/{favorite_id}")
def remove_favorite(company_id: int, favorite_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_company_member(company_id, current_user, db)
    fav = db.query(CandidateFavorite).filter(CandidateFavorite.id == favorite_id, CandidateFavorite.company_id == company_id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Candidato preferido no encontrado")
    db.delete(fav)
    db.commit()
    return {"status": "success", "deleted_id": favorite_id}
