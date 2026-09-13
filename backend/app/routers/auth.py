from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ChatSession
from app.services.matchmaking import MUNICIPIOS_NL_COORDS
import json

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

class GoogleProfileSyncRequest(BaseModel):
    email: str
    nombre: str
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    session_id: Optional[str] = None
    municipio: Optional[str] = "Monterrey"
    nivel_educativo: Optional[str] = "Secundaria"
    tag_inea: Optional[bool] = False
    telefono: Optional[str] = None

from app.services.email_service import send_real_verification_email

class VerificationCodeRequest(BaseModel):
    email: str

@router.get("/email-status")
def get_email_status():
    import os
    resend_key = os.getenv("RESEND_API_KEY")
    resend_from = os.getenv("RESEND_FROM")
    smtp_user = os.getenv("SMTP_USER")
    return {
        "resend_key_set": bool(resend_key),
        "resend_key_prefix": (resend_key[:6] + "...") if resend_key and len(resend_key) > 6 else None,
        "resend_from": resend_from or "Chambachat <onboarding@resend.dev>",
        "smtp_configured": bool(smtp_user and os.getenv("SMTP_PASSWORD"))
    }

@router.post("/send-verification-code")
def send_verification_code(req: VerificationCodeRequest):
    """
    Envía el código de confirmación de 4 dígitos al correo personal del usuario.
    Si SMTP o Resend están configurados, despacha el correo real a su bandeja.
    """
    import random
    code = f"{random.randint(1000, 9999)}"
    email_result = send_real_verification_email(req.email, code)

    if email_result.get("sent"):
        return {
            "status": "sent",
            "email": req.email,
            "code": code,
            "real_email_sent": True,
            "provider": email_result.get("provider"),
            "message": f"Código enviado exitosamente a tu correo {req.email}"
        }
    else:
        error_msg = email_result.get("error", "SMTP_NOT_CONFIGURED")
        return {
            "status": "warning" if error_msg == "SMTP_NOT_CONFIGURED" else "error",
            "email": req.email,
            "code": code,
            "real_email_sent": False,
            "error_detail": error_msg,
            "message": "Servidor de correo SMTP aún no configurado en el servidor." if error_msg == "SMTP_NOT_CONFIGURED" else f"Error al enviar correo: {error_msg}"
        }

@router.post("/sync-google-profile")
def sync_google_profile(req: GoogleProfileSyncRequest, db: Session = Depends(get_db)):
    """
    Sincroniza o crea el perfil de operario en Supabase a partir de la autenticación con Google o Correo Personal.
    """
    # Buscar si ya existe por nombre o teléfono/email
    coords = MUNICIPIOS_NL_COORDS.get((req.municipio or "monterrey").lower(), (25.6866, -100.3161))

    user = db.query(User).filter(User.nombre == req.nombre).first()
    if not user:
        user = User(
            nombre=req.nombre,
            telefono=req.telefono,
            municipio=req.municipio or "Monterrey",
            nivel_educativo=req.nivel_educativo or "Secundaria",
            tag_inea=bool(req.tag_inea),
            latitud=coords[0],
            longitud=coords[1],
            sueldo_deseado=2400.0,
            activo=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if req.tag_inea:
            user.tag_inea = True
        if req.municipio:
            user.municipio = req.municipio
        if req.telefono:
            user.telefono = req.telefono
        db.commit()
        db.refresh(user)

    # Si hay una sesión de chat activa, enlazarla
    if req.session_id:
        chat_sess = db.query(ChatSession).filter(ChatSession.session_id == req.session_id).first()
        if chat_sess:
            data = json.loads(chat_sess.collected_data or "{}")
            data["user_id"] = user.id
            data["email"] = req.email
            if req.telefono:
                data["telefono"] = req.telefono
            data["logged_in"] = True
            chat_sess.collected_data = json.dumps(data)
            db.commit()

    return {
        "status": "success",
        "user_id": user.id,
        "nombre": user.nombre,
        "email": req.email,
        "telefono": user.telefono,
        "municipio": user.municipio,
        "nivel_educativo": user.nivel_educativo,
        "tag_inea": user.tag_inea,
        "avatar_url": req.avatar_url
    }
