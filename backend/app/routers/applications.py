from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import JobApplication, ApplicationMessage, Job
from app.schemas import (
    ApplicationCreateRequest, 
    ApplicationResponse, 
    MessageCreateRequest, 
    MessageResponse
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

@router.post("/apply", response_model=ApplicationResponse)
def apply_to_job(payload: ApplicationCreateRequest, db: Session = Depends(get_db)):
    """
    Registra la postulación de un candidato a una vacante y crea la conversación con la empresa.
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
        match_score=calculated_score
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Mensaje inicial de bienvenida automática del reclutador de la planta
    recruiter_greeting = ApplicationMessage(
        application_id=application.id,
        sender_type="recruiter",
        sender_name=f"Reclutamiento {job.empresa_nombre}",
        mensaje=f"¡Hola {payload.candidate_name}! Recibimos con gusto tu postulación para la vacante de {job.titulo}. En breve un reclutador de nuestra planta revisará tus datos aquí mismo."
    )
    db.add(recruiter_greeting)
    db.commit()
    db.refresh(application)

    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        session_id=application.session_id,
        candidate_name=application.candidate_name,
        candidate_email=application.candidate_email,
        candidate_phone=application.candidate_phone,
        municipio=application.municipio,
        status=application.status,
        match_score=application.match_score or calculated_score,
        created_at=application.created_at,
        job_titulo=job.titulo,
        empresa_nombre=job.empresa_nombre,
        messages=[
            MessageResponse(
                id=m.id,
                application_id=m.application_id,
                sender_type=m.sender_type,
                sender_name=m.sender_name,
                mensaje=m.mensaje,
                leido=m.leido,
                created_at=m.created_at
            ) for m in application.messages
        ]
    )

@router.get("", response_model=List[ApplicationResponse])
def get_all_applications(db: Session = Depends(get_db)):
    """
    Retorna la lista de todas las postulaciones recibidas para el Portal Empresa.
    """
    applications = db.query(JobApplication).order_by(JobApplication.created_at.desc()).all()
    results = []
    for app in applications:
        score = app.match_score or compute_match_score(app.job, app.municipio, app.candidate_phone)
        results.append(ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            session_id=app.session_id,
            candidate_name=app.candidate_name,
            candidate_email=app.candidate_email,
            candidate_phone=app.candidate_phone,
            municipio=app.municipio,
            status=app.status,
            match_score=score,
            created_at=app.created_at,
            job_titulo=app.job.titulo if app.job else "Vacante",
            empresa_nombre=app.job.empresa_nombre if app.job else "Empresa",
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
        ))
    return results

@router.get("/by-session/{session_id}", response_model=List[ApplicationResponse])
def get_applications_by_session(session_id: str, db: Session = Depends(get_db)):
    """
    Retorna las postulaciones y mensajes asociados a una sesión específica del chat del candidato.
    """
    applications = db.query(JobApplication).filter(JobApplication.session_id == session_id).all()
    results = []
    for app in applications:
        results.append(ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            session_id=app.session_id,
            candidate_name=app.candidate_name,
            candidate_email=app.candidate_email,
            candidate_phone=app.candidate_phone,
            municipio=app.municipio,
            status=app.status,
            created_at=app.created_at,
            job_titulo=app.job.titulo if app.job else "Vacante",
            empresa_nombre=app.job.empresa_nombre if app.job else "Empresa",
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
        ))
    return results

@router.post("/{application_id}/messages", response_model=MessageResponse)
def send_message_to_application(application_id: int, payload: MessageCreateRequest, db: Session = Depends(get_db)):
    """
    Envía un mensaje del reclutador al candidato (o viceversa).
    """
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")

    msg = ApplicationMessage(
        application_id=application_id,
        sender_type=payload.sender_type,
        sender_name=payload.sender_name,
        mensaje=payload.mensaje
    )
    db.add(msg)
    if payload.sender_type == "recruiter":
        app.status = "Contactado"
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
