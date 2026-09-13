from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import JobApplication, ApplicationMessage, Job
from app.schemas import (
    ApplicationCreateRequest, 
    ApplicationResponse, 
    MessageCreateRequest, 
    MessageResponse,
    ToggleBotRequest
)

router = APIRouter(prefix="/api/v1/applications", tags=["Applications & Recruiter Chat"])

def compute_match_score(job: Optional[Job], candidate_muni: Optional[str], candidate_phone: Optional[str]) -> int:
    score = 70
    if job and candidate_muni:
        if candidate_muni.lower() in job.municipio.lower() or job.municipio.lower() in candidate_muni.lower():
            score += 18
        elif candidate_muni in ["Apodaca", "Pesquería", "San Nicolás", "Guadalupe", "Escobedo", "Monterrey"]:
            score += 12
    if candidate_phone and len(candidate_phone.strip()) >= 7:
        score += 8
    if job and job.turnos_fijos:
        score += 2
    return min(98, max(72, score))

def build_app_response(app: JobApplication) -> ApplicationResponse:
    job = app.job
    score = app.match_score or compute_match_score(job, app.municipio, app.candidate_phone)
    job_details = None
    if job:
        job_details = {
            "id": job.id,
            "titulo": job.titulo,
            "empresa_nombre": job.empresa_nombre,
            "descripcion": job.descripcion,
            "sueldo_semanal_libre": job.sueldo_semanal_libre,
            "sueldo_mensual_aprox": round(job.sueldo_semanal_libre * 4.33, 2),
            "turnos_fijos": job.turnos_fijos,
            "apoyo_inea": job.apoyo_inea,
            "transporte_incluido": job.transporte_incluido,
            "municipio": job.municipio
        }

    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        session_id=app.session_id,
        candidate_name=app.candidate_name,
        candidate_email=app.candidate_email,
        candidate_phone=app.candidate_phone,
        municipio=app.municipio,
        status=app.status,
        match_score=score,
        bot_silenced=bool(app.bot_silenced),
        last_candidate_message_at=app.last_candidate_message_at,
        last_recruiter_message_at=app.last_recruiter_message_at,
        created_at=app.created_at,
        job_titulo=job.titulo if job else "Vacante",
        empresa_nombre=job.empresa_nombre if job else "Empresa",
        job_details=job_details,
        messages=[
            MessageResponse(
                id=m.id,
                application_id=m.application_id,
                sender_type=m.sender_type,
                sender_name=m.sender_name,
                mensaje=m.mensaje,
                leido=m.leido,
                created_at=m.created_at
            ) for m in app.messages
        ]
    )

@router.post("/apply", response_model=ApplicationResponse)
def apply_to_job(payload: ApplicationCreateRequest, db: Session = Depends(get_db)):
    """
    Registra la postulación de un candidato a una vacante y crea el chat grupal tripartito:
    Candidato + Reclutador de la Empresa + Chambot (IA).
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="La vacante especificada no existe")

    calculated_score = compute_match_score(job, payload.municipio or job.municipio, payload.candidate_phone)

    application = JobApplication(
        job_id=payload.job_id,
        session_id=payload.session_id,
        candidate_name=payload.candidate_name,
        candidate_email=payload.candidate_email,
        candidate_phone=payload.candidate_phone,
        municipio=payload.municipio or job.municipio,
        status="Pendiente",
        match_score=calculated_score,
        bot_silenced=False
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # 1. Mensaje de bienvenida del reclutador
    recruiter_greeting = ApplicationMessage(
        application_id=application.id,
        sender_type="recruiter",
        sender_name=f"Reclutamiento {job.empresa_nombre}",
        mensaje=f"¡Hola {payload.candidate_name}! Recibimos con gusto tu interés en la vacante de {job.titulo}. En breve un reclutador de nuestra planta revisará tus datos aquí mismo."
    )
    db.add(recruiter_greeting)

    # 2. Mensaje inicial de Chambot en el chat grupal
    bot_greeting = ApplicationMessage(
        application_id=application.id,
        sender_type="bot",
        sender_name="Chambot (IA)",
        mensaje=f"🤖 ¡Qué onda {payload.candidate_name}! Conecté este chat directo con el equipo de {job.empresa_nombre}. Si el reclutador tarda más de 2 minutos en responder, con gusto te apoyo con dudas sobre turnos, sueldo o transporte de esta vacante."
    )
    db.add(bot_greeting)

    db.commit()
    db.refresh(application)

    return build_app_response(application)

@router.get("", response_model=List[ApplicationResponse])
def get_all_applications(db: Session = Depends(get_db)):
    """
    Retorna la lista de todas las postulaciones recibidas para el Portal Empresa.
    """
    applications = db.query(JobApplication).order_by(JobApplication.created_at.desc()).all()
    return [build_app_response(app) for app in applications]

@router.get("/by-session/{session_id}", response_model=List[ApplicationResponse])
def get_applications_by_session(session_id: str, db: Session = Depends(get_db)):
    """
    Retorna las postulaciones y mensajes asociados a una sesión específica del chat del candidato.
    """
    applications = db.query(JobApplication).filter(JobApplication.session_id == session_id).all()
    return [build_app_response(app) for app in applications]

@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application_by_id(application_id: int, db: Session = Depends(get_db)):
    """
    Retorna una postulación específica por ID.
    """
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    return build_app_response(app)

@router.post("/{application_id}/messages", response_model=MessageResponse)
def send_message_to_application(application_id: int, payload: MessageCreateRequest, db: Session = Depends(get_db)):
    """
    Envía un mensaje en el chat grupal:
    - Si el reclutador responde ('recruiter'): Chambot se silencia en automático (bot_silenced = True).
    - Si el candidato responde ('candidate'): Se actualiza last_candidate_message_at para el timer de 2 min.
    """
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")

    now = datetime.utcnow()
    msg = ApplicationMessage(
        application_id=application_id,
        sender_type=payload.sender_type,
        sender_name=payload.sender_name,
        mensaje=payload.mensaje
    )
    db.add(msg)

    if payload.sender_type == "recruiter":
        app.status = "Contactado"
        app.last_recruiter_message_at = now
        # Regla: Si el reclutador responde, el bot se silencia automáticamente
        app.bot_silenced = True
    elif payload.sender_type == "candidate":
        app.last_candidate_message_at = now

    db.commit()
    db.refresh(msg)

    return MessageResponse(
        id=msg.id,
        application_id=msg.application_id,
        sender_type=msg.sender_type,
        sender_name=msg.sender_name,
        mensaje=msg.mensaje,
        leido=msg.leido,
        created_at=msg.created_at
    )

@router.post("/{application_id}/toggle-bot")
def toggle_bot_state(application_id: int, payload: ToggleBotRequest, db: Session = Depends(get_db)):
    """
    Permite al reclutador reactivar o silenciar manualmente a Chambot en el chat grupal.
    """
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")

    new_state = payload.silenced if payload.silenced is not None else not bool(app.bot_silenced)
    app.bot_silenced = new_state

    sys_text = "🤫 El reclutador ha silenciado a Chambot en este chat." if new_state else "🤖 El reclutador ha reactivado a Chambot para apoyar con respuestas."
    sys_msg = ApplicationMessage(
        application_id=application_id,
        sender_type="system",
        sender_name="Sistema ChambaChat",
        mensaje=sys_text
    )
    db.add(sys_msg)
    db.commit()

    return {
        "status": "success",
        "bot_silenced": app.bot_silenced,
        "message": sys_text
    }

@router.post("/{application_id}/check-bot-fallback")
def check_bot_fallback(application_id: int, force: bool = False, db: Session = Depends(get_db)):
    """
    Evalúa la regla de 2 minutos:
    Si el candidato envió un mensaje y el reclutador no ha respondido en 120 segundos,
    Chambot responde con la información y conocimiento de la vacante.
    """
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")

    if app.bot_silenced:
        return {"triggered": False, "reason": "BOT_SILENCED"}

    # Obtener el último mensaje del hilo
    last_msg = db.query(ApplicationMessage).filter(
        ApplicationMessage.application_id == application_id
    ).order_by(ApplicationMessage.created_at.desc()).first()

    if not last_msg or last_msg.sender_type != "candidate":
        return {"triggered": False, "reason": "LAST_MSG_NOT_CANDIDATE"}

    now = datetime.utcnow()
    ref_time = app.last_candidate_message_at or last_msg.created_at
    elapsed_seconds = (now - ref_time).total_seconds() if ref_time else 0

    if not force and elapsed_seconds < 120:
        return {
            "triggered": False,
            "reason": "WAITING_RECRUITER",
            "remaining_seconds": max(0, int(120 - elapsed_seconds))
        }

    job = app.job
    q_text = last_msg.mensaje.lower()

    if any(w in q_text for w in ["sueldo", "pagan", "cuanto", "dinero", "semanal", "salario"]):
        bot_reply = f"Para la vacante de {job.titulo} en {job.empresa_nombre}, el sueldo es de ${job.sueldo_semanal_libre:,.0f} semanales libres (~${round(job.sueldo_semanal_libre * 4.33):,.0f} al mes), más prestaciones de ley. En breve el reclutador te dará más pormenores de nómina."
    elif any(w in q_text for w in ["turno", "horario", "hora", "rolar", "fijo"]):
        turnos_txt = "turnos fijos sin rolación" if job.turnos_fijos else "turnos que pueden ser rotativos según la línea de producción"
        bot_reply = f"Sobre los horarios en {job.empresa_nombre}: esta posición cuenta con {turnos_txt}. El reclutador confirmará la disponibilidad exacta del turno contigo."
    elif any(w in q_text for w in ["camion", "transporte", "ruta", "parada", "llegar"]):
        trans_txt = "cuenta con rutas de transporte de personal incluidas" if job.transporte_incluido else "no cuenta con transporte directo, pero tiene acceso rápido a rutas urbanas"
        bot_reply = f"Para la planta en {job.municipio}, la empresa {trans_txt}. Cuando el reclutador responda te indicará la ruta y parada más cercana a tu domicilio."
    elif any(w in q_text for w in ["estudio", "secundaria", "prepa", "inea", "certificado"]):
        inea_txt = "cuenta con aula y facilidades del programa INEA en planta para certificar tu educación básica" if job.apoyo_inea else "solicita secundaria o educación básica"
        bot_reply = f"Respecto a los estudios: para {job.titulo}, {job.empresa_nombre} {inea_txt}."
    elif any(w in q_text for w in ["donde", "ubicacion", "direccion", "planta"]):
        bot_reply = f"La planta está ubicada en el municipio de {job.municipio}, Nuevo León. El equipo de reclutamiento te proporcionará la dirección exacta y referencias para tu entrevista."
    else:
        bot_reply = f"¡Hola! El reclutador de {job.empresa_nombre} se encuentra atendiendo operaciones en planta, pero tu mensaje quedó registrado. Mientras tanto, si tienes dudas sobre sueldos (${job.sueldo_semanal_libre:,.0f}/sem), turnos o rutas de transporte, ¡aquí sigo con gusto para ayudarte!"

    bot_msg = ApplicationMessage(
        application_id=application_id,
        sender_type="bot",
        sender_name="Chambot (IA)",
        mensaje=f"🤖 {bot_reply}"
    )
    db.add(bot_msg)
    db.commit()
    db.refresh(bot_msg)

    return {
        "triggered": True,
        "reason": "RECRUITER_TIMEOUT_REPLIED",
        "message": {
            "id": bot_msg.id,
            "application_id": bot_msg.application_id,
            "sender_type": bot_msg.sender_type,
            "sender_name": bot_msg.sender_name,
            "mensaje": bot_msg.mensaje,
            "leido": bot_msg.leido,
            "created_at": bot_msg.created_at
        }
    }
