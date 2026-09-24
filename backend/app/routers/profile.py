"""
Currículum operativo del candidato: consulta y edición directa desde su perfil.
El chat (onboarding progresivo y menciones de pasada) y la entrevista rápida escriben en el
mismo lugar, así que aquí siempre se ve lo último que sabemos del candidato.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import CandidateProfileResponse, CandidateProfileUpdate
from app.services import profile_service

router = APIRouter(prefix="/api/v1/profile", tags=["Candidate Profile"])


@router.get("/me", response_model=CandidateProfileResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Perfil consolidado con completitud, campos faltantes y catálogos para editarlo."""
    return CandidateProfileResponse(**profile_service.build_profile_response(current_user))


@router.patch("/me", response_model=CandidateProfileResponse)
def update_my_profile(payload: CandidateProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Edición parcial: solo se aplican los campos enviados (validados contra los catálogos)."""
    updates = payload.model_dump(exclude_unset=True)
    profile_service.apply_profile_updates(current_user, updates)
    db.commit()
    db.refresh(current_user)
    return CandidateProfileResponse(**profile_service.build_profile_response(current_user))
