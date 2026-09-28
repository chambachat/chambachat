"""
Router para reclamar vacantes comunitarias como empresa.

GET  /api/v1/claims/discover       → Busca vacantes que matcheen con la empresa
POST /api/v1/claims/{job_id}/start  → Inicia verificación (envía OTP)
POST /api/v1/claims/{job_id}/verify → Verifica OTP y reclama la vacante
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, Company, CompanyMember, VacancyClaim, JobPhotoLog, User
from app.dependencies import get_current_user
from app.schemas import (
    ClaimableVacancy, ClaimStartRequest, ClaimStartResponse,
    ClaimVerifyRequest, ClaimVerifyResponse,
)
from app.services.email_service import send_real_verification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/claims", tags=["Claims"])

_CODE_LENGTH = 6
_CODE_EXPIRATION_MINUTES = 15
_MAX_ATTEMPTS = 5


def _generate_code() -> str:
    return "".join([str(secrets.randbelow(10)) for _ in range(_CODE_LENGTH)])


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _mask_phone(phone: str) -> str:
    """81327559​03 → 81****5903"""
    if not phone or len(phone) < 6:
        return phone or ""
    return phone[:2] + "****" + phone[-4:]


def _mask_email(email: str) -> str:
    """reclutamiento@enramada.com → r***@enramada.com"""
    if not email or "@" not in email:
        return email or ""
    local, domain = email.split("@", 1)
    return local[0] + "***@" + domain


def _get_user_company(db: Session, user: User) -> Company:
    """Obtiene la empresa a la que pertenece el usuario. Lanza 403 si no tiene."""
    member = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == user.id, CompanyMember.status == "active")
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="No perteneces a ninguna empresa.")
    company = db.query(Company).filter(Company.id == member.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")
    return company


@router.get("/discover", response_model=List[ClaimableVacancy])
def discover_claimable(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Busca vacantes comunitarias cuyo teléfono o email coincida con la empresa."""
    company = _get_user_company(db, current_user)

    # Campos de la empresa para matchear
    company_phone = (company.telefono_contacto or "").strip()
    member_emails = [
        row[0] for row in
        db.query(CompanyMember.email)
        .filter(CompanyMember.company_id == company.id, CompanyMember.status == "active")
        .all()
    ]

    # Buscar vacantes comunitarias con contacto
    community_jobs = (
        db.query(Job)
        .filter(
            Job.origen == "foto_comunitaria",
            Job.empresa_id.is_(None),
            Job.activa.is_(True),
        )
        .all()
    )

    # IDs de jobs con foto
    job_ids = [j.id for j in community_jobs]
    photo_ids = set()
    if job_ids:
        photo_ids = set(
            row[0] for row in
            db.query(JobPhotoLog.job_id)
            .filter(JobPhotoLog.job_id.in_(job_ids), JobPhotoLog.success.is_(True))
            .distinct().all()
        )

    # Ya reclamadas (no mostrar de nuevo)
    already_claimed = set(
        row[0] for row in
        db.query(VacancyClaim.job_id)
        .filter(VacancyClaim.company_id == company.id, VacancyClaim.verification_status == "verified")
        .all()
    )

    results = []
    for job in community_jobs:
        if job.id in already_claimed:
            continue

        match_field = None
        match_value = None

        # Match por teléfono
        if company_phone and job.fuente_contacto_telefono:
            job_phone = job.fuente_contacto_telefono.replace(" ", "").replace("-", "")
            comp_phone = company_phone.replace(" ", "").replace("-", "")
            if job_phone[-10:] == comp_phone[-10:]:  # Últimos 10 dígitos
                match_field = "telefono"
                match_value = job.fuente_contacto_telefono

        # Match por WhatsApp
        if not match_field and company_phone and job.fuente_contacto_whatsapp:
            job_wa = job.fuente_contacto_whatsapp.replace(" ", "").replace("-", "")
            comp_phone = company_phone.replace(" ", "").replace("-", "")
            if job_wa[-10:] == comp_phone[-10:]:
                match_field = "whatsapp"
                match_value = job.fuente_contacto_whatsapp

        # Match por email
        if not match_field and job.fuente_contacto_email:
            job_email = job.fuente_contacto_email.strip().lower()
            if job_email in [e.lower() for e in member_emails]:
                match_field = "email"
                match_value = job.fuente_contacto_email

        if match_field:
            masked = _mask_phone(match_value) if match_field != "email" else _mask_email(match_value)
            results.append(ClaimableVacancy(
                job_id=job.id,
                titulo=job.titulo,
                empresa_nombre=job.empresa_nombre,
                municipio=job.municipio,
                match_field=match_field,
                match_value_masked=masked,
                created_at=job.created_at,
                has_photo=job.id in photo_ids,
            ))

    logger.info("Discover claims: user=%s company=%d found=%d", current_user.email, company.id, len(results))
    return results


@router.post("/{job_id}/start", response_model=ClaimStartResponse)
def start_claim(
    job_id: int,
    payload: ClaimStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Inicia el proceso de verificación: envía OTP al email detectado en la vacante."""
    company = _get_user_company(db, current_user)

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada.")
    if job.origen != "foto_comunitaria" or job.empresa_id is not None:
        raise HTTPException(status_code=400, detail="Esta vacante no es comunitaria o ya fue reclamada.")

    # Determinar target de verificación
    if payload.verification_method == "email":
        target = (job.fuente_contacto_email or "").strip()
        if not target:
            raise HTTPException(status_code=400, detail="La vacante no tiene email de contacto.")
    else:
        raise HTTPException(status_code=400, detail="Método de verificación no soportado aún. Usa 'email'.")

    # Invalidar claims previos pendientes
    db.query(VacancyClaim).filter(
        VacancyClaim.job_id == job_id,
        VacancyClaim.company_id == company.id,
        VacancyClaim.verification_status == "pending",
    ).update({"verification_status": "expired"})

    # Generar código y claim
    code = _generate_code()
    claim = VacancyClaim(
        job_id=job_id,
        company_id=company.id,
        claimed_by_user_id=current_user.id,
        verification_method=payload.verification_method,
        verification_target=target,
        verification_code_hash=_hash_code(code),
        verification_attempts=0,
        expires_at=datetime.utcnow() + timedelta(minutes=_CODE_EXPIRATION_MINUTES),
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    # Enviar email
    email_result = send_real_verification_email(target, code, expiration_minutes=_CODE_EXPIRATION_MINUTES)
    sent = bool(email_result.get("sent"))

    masked = _mask_email(target)
    logger.info(
        "Claim started: job=%d company=%d method=%s target=%s sent=%s",
        job_id, company.id, payload.verification_method, masked, sent,
    )

    msg = f"Código enviado a {masked}" if sent else "No se pudo enviar el email. Verifica la configuración SMTP."
    return ClaimStartResponse(
        claim_id=claim.id,
        verification_method=payload.verification_method,
        target_masked=masked,
        message=msg,
    )


@router.post("/{job_id}/verify", response_model=ClaimVerifyResponse)
def verify_claim(
    job_id: int,
    payload: ClaimVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verifica el OTP. Si es correcto, reclama la vacante para la empresa."""
    company = _get_user_company(db, current_user)

    claim = (
        db.query(VacancyClaim)
        .filter(
            VacancyClaim.job_id == job_id,
            VacancyClaim.company_id == company.id,
            VacancyClaim.verification_status == "pending",
        )
        .order_by(VacancyClaim.id.desc())
        .first()
    )
    if not claim:
        raise HTTPException(status_code=404, detail="No hay una solicitud de verificación pendiente.")

    # Expiración
    if claim.expires_at and datetime.utcnow() > claim.expires_at:
        claim.verification_status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="El código expiró. Solicita uno nuevo.")

    # Intentos
    if claim.verification_attempts >= _MAX_ATTEMPTS:
        claim.verification_status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Demasiados intentos. Solicita un nuevo código.")

    claim.verification_attempts += 1

    # Verificar código
    if _hash_code(payload.code.strip()) != claim.verification_code_hash:
        db.commit()
        remaining = _MAX_ATTEMPTS - claim.verification_attempts
        raise HTTPException(
            status_code=400,
            detail=f"Código incorrecto. Te quedan {remaining} intento(s).",
        )

    # ¡Éxito! Reclamar la vacante
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada.")

    job.empresa_id = company.id
    job.empresa_nombre = company.nombre
    job.origen = "reclamada"

    claim.verification_status = "verified"
    claim.verified_at = datetime.utcnow()

    db.commit()

    logger.info(
        "Vacancy claimed! job=%d company=%s (%d) by=%s",
        job_id, company.nombre, company.id, current_user.email,
    )

    return ClaimVerifyResponse(
        success=True,
        job_id=job_id,
        message=f"¡Vacante '{job.titulo}' reclamada! Ya aparece en tu bolsa de vacantes.",
    )
