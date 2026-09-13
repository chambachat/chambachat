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

@router.post("/sync-google-profile")
def sync_google_profile(req: GoogleProfileSyncRequest, db: Session = Depends(get_db)):
    """
    Sincroniza o crea el perfil de operario en Supabase a partir de la autenticación con Google.
    """
    # Buscar si ya existe por nombre o teléfono/email
    coords = MUNICIPIOS_NL_COORDS.get((req.municipio or "monterrey").lower(), (25.6866, -100.3161))

    user = db.query(User).filter(User.nombre == req.nombre).first()
    if not user:
        user = User(
            nombre=req.nombre,
            telefono=None,
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
        db.commit()
        db.refresh(user)

    # Si hay una sesión de chat activa, enlazarla
    if req.session_id:
        chat_sess = db.query(ChatSession).filter(ChatSession.session_id == req.session_id).first()
        if chat_sess:
            data = json.loads(chat_sess.collected_data or "{}")
            data["user_id"] = user.id
            data["email"] = req.email
            data["google_logged_in"] = True
            chat_sess.collected_data = json.dumps(data)
            db.commit()

    return {
        "status": "success",
        "user_id": user.id,
        "nombre": user.nombre,
        "email": req.email,
        "municipio": user.municipio,
        "nivel_educativo": user.nivel_educativo,
        "tag_inea": user.tag_inea,
        "avatar_url": req.avatar_url
    }
