"""
Router de autenticación para ChambaChat V2.

Flujo de autenticación por correo:
1. POST /send-verification-code → genera código, lo hashea y guarda en DB, envía por email
2. POST /verify-code → valida código contra DB, emite JWT
3. Todas las demás llamadas usan el JWT en header Authorization: Bearer <token>

Flujo Google OAuth (futuro):
- Se integrará con Supabase Auth cuando esté configurado.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, ChatSession, EmailVerificationCode
from app.services.email_service import send_real_verification_email
from app.services.matchmaking import MUNICIPIOS_NL_COORDS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ─── Constantes de seguridad ─────────────────────────────────────────
_CODE_EXPIRATION_MINUTES = 15
_MAX_VERIFICATION_ATTEMPTS = 5
_CODE_LENGTH = 6  # Código de 6 dígitos para mayor seguridad


# ─── Schemas ─────────────────────────────────────────────────────────

from app.schemas import (
    VerificationCodeRequest,
    VerifyCodeRequest,
    ProfileSyncRequest
)


# ─── Funciones auxiliares ─────────────────────────────────────────────

def _hash_code(code: str) -> str:
    """Hashea un código de verificación con SHA-256."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _generate_verification_code() -> str:
    """Genera un código numérico seguro de N dígitos."""
    return "".join([str(secrets.randbelow(10)) for _ in range(_CODE_LENGTH)])


def _create_jwt(user: User) -> str:
    """Genera un JWT con los datos del usuario."""
    now = datetime.utcnow()
    payload = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role or "candidate",
        "nombre": user.nombre,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _cleanup_expired_codes(db: Session, email: str) -> None:
    """Elimina códigos expirados para un email dado."""
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == email,
        EmailVerificationCode.expires_at < datetime.utcnow(),
    ).delete(synchronize_session=False)


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("/send-verification-code")
def send_verification_code(req: VerificationCodeRequest, db: Session = Depends(get_db)):
    """
    Genera un código de verificación de 6 dígitos, lo hashea y lo guarda en la DB.
    Envía el código al correo del usuario vía SMTP/Resend.
    NUNCA devuelve el código en la respuesta JSON.
    """
    email = req.email

    # Rate limiting: verificar cuántos códigos activos tiene este email
    _cleanup_expired_codes(db, email)
    active_codes_count = db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == email,
        EmailVerificationCode.expires_at >= datetime.utcnow(),
        EmailVerificationCode.verified == False,
    ).count()

    if active_codes_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados códigos solicitados. Espera unos minutos antes de intentar de nuevo.",
        )

    # Generar código y guardar hash en DB
    code = _generate_verification_code()
    code_hash = _hash_code(code)
    expires_at = datetime.utcnow() + timedelta(minutes=_CODE_EXPIRATION_MINUTES)

    verification = EmailVerificationCode(
        email=email,
        code_hash=code_hash,
        attempts=0,
        max_attempts=_MAX_VERIFICATION_ATTEMPTS,
        verified=False,
        expires_at=expires_at,
    )
    db.add(verification)
    db.commit()

    # Enviar el código por correo real
    email_result = send_real_verification_email(email, code)
    real_sent = bool(email_result.get("sent"))

    logger.info(
        "Código de verificación generado para %s (enviado: %s, provider: %s)",
        email, real_sent, email_result.get("provider", "ninguno")
    )

    # NUNCA devolver el código en la respuesta
    response = {
        "status": "sent" if real_sent else "warning",
        "email": email,
        "real_email_sent": real_sent,
        "expires_in_minutes": _CODE_EXPIRATION_MINUTES,
        "code_length": _CODE_LENGTH,
    }

    if real_sent:
        response["message"] = f"Código de {_CODE_LENGTH} dígitos enviado a {email}. Revisa tu bandeja de entrada."
        response["provider"] = email_result.get("provider")
    else:
        error_msg = email_result.get("error", "SMTP_NOT_CONFIGURED")
        response["message"] = (
            "El servidor de correo SMTP aún no está configurado. "
            "Contacta al administrador para habilitar el envío de correos."
            if error_msg == "SMTP_NOT_CONFIGURED"
            else f"Error al enviar correo: {error_msg}"
        )
        response["error_detail"] = error_msg

    return response


@router.post("/verify-code")
def verify_code(req: VerifyCodeRequest, db: Session = Depends(get_db)):
    """
    Valida el código de verificación contra la DB.
    Si es correcto: crea/actualiza usuario y emite JWT.
    Rate limiting: máximo 5 intentos por código.
    """
    email = req.email
    entered_hash = _hash_code(req.code)

    # Buscar el código más reciente no expirado y no verificado para este email
    verification = db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == email,
        EmailVerificationCode.expires_at >= datetime.utcnow(),
        EmailVerificationCode.verified == False,
    ).order_by(EmailVerificationCode.created_at.desc()).first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay un código de verificación activo para este correo. Solicita uno nuevo.",
        )

    # Verificar límite de intentos
    if verification.attempts >= verification.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Solicita un nuevo código.",
        )

    # Incrementar intentos
    verification.attempts += 1

    # Comparar hash del código
    if verification.code_hash != entered_hash:
        db.commit()
        remaining = verification.max_attempts - verification.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Código incorrecto. Te quedan {remaining} intento(s).",
        )

    # Código correcto — marcar como verificado
    verification.verified = True
    db.commit()

    # Buscar o crear usuario
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Crear usuario nuevo con datos básicos
        name_from_email = email.split("@")[0].replace(".", " ").replace("_", " ").title()
        user = User(
            nombre=name_from_email,
            email=email,
            role="candidate",
            municipio="Monterrey",
            nivel_educativo="Secundaria",
            activo=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Nuevo usuario creado via verificación de correo: %s (id=%d)", email, user.id)

    # Generar JWT
    token = _create_jwt(user)

    logger.info("Usuario autenticado exitosamente: %s (id=%d)", email, user.id)

    return {
        "status": "verified",
        "token": token,
        "user": {
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "role": user.role or "candidate",
            "empresa_nombre": user.empresa_nombre,
            "telefono": user.telefono,
            "municipio": user.municipio,
            "nivel_educativo": user.nivel_educativo,
            "avatar_url": user.avatar_url,
            "tag_inea": user.tag_inea,
        },
    }


@router.post("/sync-google-profile")
def sync_google_profile(
    req: ProfileSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sincroniza o actualiza el perfil del usuario autenticado.
    Requiere JWT válido — ya no permite acceso anónimo.
    """
    coords = MUNICIPIOS_NL_COORDS.get(
        (req.municipio or "monterrey").lower(), (25.6866, -100.3161)
    )

    # Usar el usuario del token, no buscar por nombre
    user = current_user

    # Actualizar campos que vengan en el request
    for field, value in req.model_dump(exclude_unset=True, exclude={"email", "session_id"}).items():
        if value is not None:
            if field == "tag_inea":
                setattr(user, field, bool(value))
            elif field == "nombre":
                setattr(user, field, value.strip() or user.nombre)
            else:
                setattr(user, field, value)

    # Actualizar coordenadas si cambió municipio
    if req.municipio:
        user.latitud = coords[0]
        user.longitud = coords[1]

    db.commit()
    db.refresh(user)

    # Si hay una sesión de chat activa, enlazarla
    if req.session_id:
        import json
        chat_sess = db.query(ChatSession).filter(
            ChatSession.session_id == req.session_id
        ).first()
        if chat_sess:
            data = json.loads(chat_sess.collected_data or "{}")
            data["user_id"] = user.id
            data["email"] = user.email
            if req.telefono:
                data["telefono"] = req.telefono
            data["logged_in"] = True
            chat_sess.collected_data = json.dumps(data)
            db.commit()

    return {
        "status": "success",
        "user_id": user.id,
        "nombre": user.nombre,
        "email": user.email,
        "role": user.role or "candidate",
        "empresa_nombre": user.empresa_nombre,
        "telefono": user.telefono,
        "municipio": user.municipio,
        "nivel_educativo": user.nivel_educativo,
        "tag_inea": user.tag_inea,
        "avatar_url": user.avatar_url,
    }


@router.post("/refresh-token")
def refresh_token(current_user: User = Depends(get_current_user)):
    """Emite un nuevo JWT para el usuario autenticado (extensión de sesión)."""
    new_token = _create_jwt(current_user)
    return {
        "status": "success",
        "token": new_token,
        "user": {
            "id": current_user.id,
            "nombre": current_user.nombre,
            "email": current_user.email,
            "role": current_user.role or "candidate",
        },
    }


@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Devuelve la información del usuario autenticado."""
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "role": current_user.role or "candidate",
        "empresa_nombre": current_user.empresa_nombre,
        "telefono": current_user.telefono,
        "municipio": current_user.municipio,
        "nivel_educativo": current_user.nivel_educativo,
        "tag_inea": current_user.tag_inea,
        "avatar_url": current_user.avatar_url,
    }
