"""
Router de autenticación para ChambaChat V2.

Flujo de autenticación por correo:
1. POST /send-verification-code → genera código, lo hashea y guarda en DB, envía por email
2. POST /verify-code → valida código contra DB, emite JWT
3. Todas las demás llamadas usan el JWT en header Authorization: Bearer <token>

Flujo Google Sign-In:
1. El frontend obtiene un ID token con Google Identity Services (GOOGLE_CLIENT_ID)
2. POST /google → el backend verifica el token contra Google y emite el mismo JWT propio
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta
import jwt
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, ChatSession, EmailVerificationCode
from app.services.email_service import send_real_verification_email
from app.services import profile_service
from app.services.geo import MUNICIPIOS_NL_COORDS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ─── Constantes de seguridad ─────────────────────────────────────────
_CODE_EXPIRATION_MINUTES = 15
_MAX_VERIFICATION_ATTEMPTS = 5


# ─── Schemas ─────────────────────────────────────────────────────────

from app.schemas import (
    VERIFICATION_CODE_LENGTH as _CODE_LENGTH,
    AuthConfigResponse,
    AuthUserResponse,
    GoogleAuthRequest,
    ProfileSyncRequest,
    ProfileSyncResponse,
    RefreshTokenResponse,
    SendCodeResponse,
    UserLocationUpdate,
    VerificationCodeRequest,
    VerifyCodeRequest,
    VerifyCodeResponse,
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

@router.post("/send-verification-code", response_model=SendCodeResponse)
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
    email_result = send_real_verification_email(email, code, expiration_minutes=_CODE_EXPIRATION_MINUTES)
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


@router.post("/verify-code", response_model=VerifyCodeResponse)
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

    return VerifyCodeResponse(status="verified", token=token, user=AuthUserResponse.model_validate(user))


# ─── Google Sign-In ──────────────────────────────────────────────────

_GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def _verify_google_id_token(credential: str) -> dict:
    """
    Valida el ID token con el endpoint tokeninfo de Google y comprueba que fue emitido
    para nuestro GOOGLE_CLIENT_ID. Lanza ValueError si no es válido.
    """
    res = requests.get(_GOOGLE_TOKENINFO_URL, params={"id_token": credential}, timeout=8)
    if res.status_code != 200:
        raise ValueError("Google no reconoce este token de acceso.")
    payload = res.json()
    if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise ValueError("El token de Google no corresponde a esta aplicación.")
    if payload.get("iss") not in _GOOGLE_ISSUERS:
        raise ValueError("Emisor del token de Google no válido.")
    return payload


@router.get("/config", response_model=AuthConfigResponse)
def auth_config():
    """Configuración pública de acceso: el frontend la usa para saber si mostrar el botón de Google."""
    return AuthConfigResponse(google_client_id=settings.GOOGLE_CLIENT_ID or None)


@router.post("/google", response_model=VerifyCodeResponse)
def login_with_google(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Inicia sesión (o crea la cuenta) con una cuenta de Google verificada y emite el JWT propio."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="El acceso con Google no está habilitado en este servidor.")
    try:
        info = _verify_google_id_token(req.credential)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 - red / timeout
        logger.error("[Google Sign-In] error verificando token: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="No se pudo validar tu cuenta con Google. Intenta de nuevo.")

    email = (info.get("email") or "").strip().lower()
    verified = info.get("email_verified") in (True, "true", "1")
    if not email or not verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Tu cuenta de Google no tiene un correo verificado.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            nombre=(info.get("name") or email.split("@")[0].replace(".", " ").title()).strip(),
            email=email,
            role=req.role or "candidate",
            municipio="Monterrey",
            nivel_educativo="Secundaria",
            activo=True,
        )
        db.add(user)
        logger.info("Nuevo usuario creado via Google: %s", email)

    user.google_id = info.get("sub") or user.google_id
    if info.get("picture"):
        user.avatar_url = info["picture"]
    if not user.nombre and info.get("name"):
        user.nombre = info["name"]
    db.commit()
    db.refresh(user)

    return VerifyCodeResponse(status="verified", token=_create_jwt(user), user=AuthUserResponse.model_validate(user))


@router.post("/sync-google-profile", response_model=ProfileSyncResponse)
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
            elif field == "municipio" and user.ubicacion_confirmada:
                continue  # el municipio de residencia confirmado (GPS/mapa) manda sobre el genérico del login
            else:
                setattr(user, field, value)

    # Coordenadas aproximadas del municipio solo si el usuario aún no tiene ubicación confirmada
    if req.municipio and not user.ubicacion_confirmada:
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
            # Datos de perfil dichos en el chat como invitado → currículum del usuario
            profile_service.merge_session_profile(user, data)
            chat_sess.collected_data = json.dumps(data)
            db.commit()

    return ProfileSyncResponse(status="success", user_id=user.id, **AuthUserResponse.model_validate(user).model_dump())


@router.post("/refresh-token", response_model=RefreshTokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Emite un nuevo JWT para el usuario autenticado (extensión de sesión)."""
    new_token = _create_jwt(current_user)
    return RefreshTokenResponse(token=new_token, user=AuthUserResponse.model_validate(current_user))


@router.get("/me", response_model=AuthUserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Devuelve la información del usuario autenticado."""
    return AuthUserResponse.model_validate(current_user)


@router.patch("/me/location", response_model=AuthUserResponse)
def update_my_location(req: UserLocationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Registra o actualiza la ubicación del candidato desde su perfil (GPS o mapa).
    Queda marcada como confirmada: el chat la reutiliza sin volver a pedirla.
    """
    current_user.latitud = req.latitud
    current_user.longitud = req.longitud
    current_user.ubicacion_confirmada = True
    if req.colonia is not None:
        current_user.colonia = req.colonia.strip() or None
    if req.municipio and req.municipio.strip():
        current_user.municipio = req.municipio.strip()
    db.commit()
    db.refresh(current_user)
    return AuthUserResponse.model_validate(current_user)
