from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.schemas import CandidateResponse

router = APIRouter(prefix="/api/v1/candidates", tags=["Candidates"])

@router.get("", response_model=List[CandidateResponse])
def get_candidates(
    tag_inea: Optional[bool] = None,
    municipio: Optional[str] = None,
    nivel_educativo: Optional[str] = None,
    limit: int = Query(100, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna la lista de operarios y candidatos perfilados, con filtro de estatus INEA y municipio.
    """
    query = db.query(User)
    if tag_inea is not None:
        query = query.filter(User.tag_inea == tag_inea)
    if municipio:
        query = query.filter(User.municipio.ilike(f"%{municipio}%"))
    if nivel_educativo:
        query = query.filter(User.nivel_educativo == nivel_educativo)
        
    return query.order_by(User.id.desc()).limit(limit).all()

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    cand = db.query(User).filter(User.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    return cand


