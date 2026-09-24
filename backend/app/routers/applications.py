"""
Postulaciones y chat directo candidato ↔ reclutadores de la planta (con Chambot de respaldo).

Cada postulación abre un hilo propio (ApplicationMessage). El candidato lo ve como una
conversación aparte en su chat; los reclutadores de la empresa lo atienden desde el portal.

Permisos:
- Candidato: solo sus postulaciones (por el correo de su sesión).
- Reclutador: solo postulaciones a vacantes de empresas donde es miembro activo.
- Admin: todo.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import false as sa_false
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional
from app.models import ApplicationMessage, CompanyMember, Job, JobApplication, User
from app.schemas import (
    ApplicationCreateRequest,
    ApplicationResponse,
    MessageCreateRequest,
    MessageResponse,
    ToggleBotRequest,
)
from app.services import screening_service

router = APIRouter(prefix="/api/v1/applications", tags=["Applications & Recruiter Chat"])

RECRUITER_TIMEOUT_SECONDS = 120


# ─── Helpers ─────────────────────────────────────────────────────────

def compute_match_score(job: Optional[Job], candidate_muni: Optional[str], candidate_phone: Optional[str]) -> int:
    """
    Compatibilidad estimada candidato ↔ vacante (72-98):
    base 70, +18 mismo municipio (+12 si es del área metropolitana), +8 teléfono válido, +2 turno fijo.
    """
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


def _message_response(m: ApplicationMessage) -> MessageResponse:
    return MessageResponse(
        id=m.id, application_id=m.application_id, sender_type=m.sender_type,
        sender_name=m.sender_name, mensaje=m.mensaje, leido=m.leido, created_at=m.created_at,
    )


def build_app_response(app: JobApplication) -> ApplicationResponse:
    job = app.job
    score = app.match_score or compute_match_score(job, app.municipio, app.candidate_phone)
    job_details = None
    if job:
        job_details = {
            "id": job.id,
            "titulo": job.titulo,
            "empresa_nombre": job.empresa_nombre,
            "empresa_id": job.empresa_id,
            "descripcion": job.descripcion,
            "sueldo_semanal_libre": job.sueldo_semanal_libre,
            "sueldo_mensual_aprox": round(job.sueldo_semanal_libre * 4.33, 2),
            "turnos_fijos": job.turnos_fijos,
            "apoyo_inea": job.apoyo_inea,
            "transporte_incluido": job.transporte_incluido,
            "municipio": job.municipio,
            "tipo_turno": job.tipo_turno,
            "hora_entrada": job.hora_entrada,
            "hora_salida": job.hora_salida,
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
        messages=[_message_response(m) for m in sorted(app.messages, key=lambda m: (m.created_at, m.id))],
        screening_status=app.screening_status or "none",
        screening=screening_service.current_screening(app),
        screening_answers=app.screening_answers,
        match_breakdown=app.match_breakdown,
        match_level=app.match_level,
        screening_completed_at=app.screening_completed_at,
    )


def _get_app_or_404(db: Session, application_id: int) -> JobApplication:
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    return app


def _member_company_ids(db: Session, user: User) -> List[int]:
    return [
        m.company_id for m in db.query(CompanyMember).filter(
            CompanyMember.email == user.email, CompanyMember.status == "active",
        ).all()
    ]


def _is_candidate(app: JobApplication, user: User) -> bool:
    return bool(app.candidate_email and user.email and app.candidate_email.lower() == user.email.lower())


def _is_recruiter_of(app: JobApplication, user: User, db: Session) -> bool:
    if user.role == "admin":
        return True
    job = app.job
    if job and job.empresa_id:
        return job.empresa_id in _member_company_ids(db, user)
    # Vacantes históricas sin empresa ligada: cualquier reclutador puede atenderlas
    return user.role == "recruiter"


def _ensure_can_view(app: JobApplication, user: User, db: Session) -> None:
    if not (_is_candidate(app, user) or _is_recruiter_of(app, user, db)):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta postulación")


def _ensure_recruiter(app: JobApplication, user: User, db: Session) -> None:
    if not _is_recruiter_of(app, user, db):
        raise HTTPException(status_code=403, detail="Solo los reclutadores de la empresa pueden hacer esto")


# ─── Endpoints ───────────────────────────────────────────────────────

@router.post("/apply", response_model=ApplicationResponse)
def apply_to_job(
    payload: ApplicationCreateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Registra la postulación y abre el chat directo con los reclutadores de la planta.
    Con sesión, el correo del candidato es el del token. Es idempotente: si ya existe una
    postulación del mismo candidato a la misma vacante, devuelve esa (con su historial).
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="La vacante especificada no existe")

    candidate_email = (current_user.email if current_user and current_user.email else payload.candidate_email or "").strip().lower() or None
    candidate_name = (payload.candidate_name or "").strip() or (current_user.nombre if current_user else "") or "Candidato"
    candidate_phone = payload.candidate_phone or (current_user.telefono if current_user else None)

    if candidate_email:
        existing = db.query(JobApplication).filter(
            JobApplication.job_id == job.id,
            JobApplication.candidate_email == candidate_email,
        ).order_by(JobApplication.created_at.desc()).first()
        if existing:
            if payload.session_id and not existing.session_id:
                existing.session_id = payload.session_id
            if (existing.screening_status or "none") == "none":
                # Postulación creada antes de la entrevista rápida: abrirla ahora para conocer al candidato
                screening_service.start_screening(db, existing, job, current_user)
            db.commit()
            db.refresh(existing)
            return build_app_response(existing)

    application = JobApplication(
        job_id=job.id,
        session_id=payload.session_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone,
        municipio=payload.municipio or job.municipio,
        status="Pendiente",
        match_score=compute_match_score(job, payload.municipio or job.municipio, candidate_phone),
        bot_silenced=False,
    )
    db.add(application)
    db.flush()

    db.add(ApplicationMessage(
        application_id=application.id,
        sender_type="recruiter",
        sender_name=f"Reclutamiento {job.empresa_nombre}",
        mensaje=(
            f"¡Hola {candidate_name}! Recibimos con gusto tu interés en la vacante de {job.titulo}. "
            "En breve un reclutador de nuestra planta revisará tus datos y te responderá aquí mismo."
        ),
    ))
    screening_service.start_screening(db, application, job, current_user)
    db.commit()
    db.refresh(application)
    return build_app_response(application)


@router.get("", response_model=List[ApplicationResponse])
def get_all_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Bandeja del Portal Empresa: postulaciones a vacantes de las empresas donde el usuario es miembro."""
    company_ids = _member_company_ids(db, current_user)
    query = db.query(JobApplication).join(Job)
    if current_user.role != "admin":
        query = query.filter(Job.empresa_id.in_(company_ids)) if company_ids else query.filter(sa_false())
    applications = query.order_by(JobApplication.created_at.desc()).all()
    return [build_app_response(app) for app in applications]


@router.get("/mine", response_model=List[ApplicationResponse])
def get_my_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Chats directos del candidato autenticado (sus postulaciones con todo el historial)."""
    if not current_user.email:
        return []
    applications = db.query(JobApplication).filter(
        JobApplication.candidate_email == current_user.email.lower(),
    ).order_by(JobApplication.created_at.desc()).all()
    return [build_app_response(app) for app in applications]


@router.get("/by-session/{session_id}", response_model=List[ApplicationResponse])
def get_applications_by_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Postulaciones ligadas a una sesión de chat del candidato autenticado (compatibilidad)."""
    applications = db.query(JobApplication).filter(JobApplication.session_id == session_id).all()
    return [build_app_response(app) for app in applications if _is_candidate(app, current_user) or not app.candidate_email]


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application_by_id(application_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Detalle e historial de una postulación (candidato dueño o reclutador de la empresa)."""
    app = _get_app_or_404(db, application_id)
    _ensure_can_view(app, current_user, db)
    return build_app_response(app)


@router.post("/{application_id}/messages", response_model=MessageResponse)
def send_message_to_application(
    application_id: int,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mensaje en el chat directo.
    - 'candidate': solo el candidato dueño; su nombre sale de la sesión. Arranca el timer de respaldo de Chambot.
    - 'recruiter': solo reclutadores de la empresa; al responder, Chambot se silencia en automático.
    """
    app = _get_app_or_404(db, application_id)
    mensaje = (payload.mensaje or "").strip()
    if not mensaje:
        raise HTTPException(status_code=422, detail="El mensaje no puede estar vacío")

    now = datetime.utcnow()
    if payload.sender_type == "candidate":
        if not _is_candidate(app, current_user):
            raise HTTPException(status_code=403, detail="Solo el candidato de esta postulación puede escribir aquí")
        sender_name = current_user.nombre or app.candidate_name
        app.last_candidate_message_at = now
    elif payload.sender_type == "recruiter":
        _ensure_recruiter(app, current_user, db)
        sender_name = (payload.sender_name or "").strip() or current_user.nombre or "Reclutador"
        app.status = "Contactado" if app.status == "Pendiente" else app.status
        app.last_recruiter_message_at = now
        app.bot_silenced = True  # el humano tomó la conversación
    else:
        _ensure_recruiter(app, current_user, db)
        sender_name = (payload.sender_name or "").strip() or ("Chambot (IA)" if payload.sender_type == "bot" else "Sistema ChambaChat")

    msg = ApplicationMessage(application_id=application_id, sender_type=payload.sender_type, sender_name=sender_name, mensaje=mensaje)
    db.add(msg)
    db.flush()
    if payload.sender_type == "candidate":
        if (app.screening_status or "none") == "none":
            # Postulación creada antes de la entrevista rápida: Chambot la abre ahora (el mensaje queda para el reclutador)
            screening_service.start_screening(db, app, app.job, current_user)
        elif app.screening_status == "in_progress":
            # Entrevista rápida en curso: Chambot registra la respuesta y publica la siguiente pregunta
            screening_service.handle_candidate_answer(db, app, current_user, mensaje)
    db.commit()
    db.refresh(msg)
    return _message_response(msg)


@router.post("/{application_id}/toggle-bot")
def toggle_bot_state(
    application_id: int,
    payload: ToggleBotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El reclutador silencia o reactiva a Chambot en este chat."""
    app = _get_app_or_404(db, application_id)
    _ensure_recruiter(app, current_user, db)

    new_state = payload.silenced if payload.silenced is not None else not bool(app.bot_silenced)
    app.bot_silenced = new_state
    sys_text = "🤫 El reclutador ha silenciado a Chambot en este chat." if new_state else "🤖 El reclutador ha reactivado a Chambot para apoyar con respuestas."
    db.add(ApplicationMessage(application_id=application_id, sender_type="system", sender_name="Sistema ChambaChat", mensaje=sys_text))
    db.commit()
    return {"status": "success", "bot_silenced": app.bot_silenced, "message": sys_text}


@router.post("/{application_id}/check-bot-fallback")
def check_bot_fallback(
    application_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Regla de respaldo: si el último mensaje es del candidato y el reclutador no ha respondido
    en 2 minutos (o force=True por el reclutador), Chambot contesta con datos de la vacante.
    """
    app = _get_app_or_404(db, application_id)
    _ensure_can_view(app, current_user, db)
    if force:
        _ensure_recruiter(app, current_user, db)

    if app.bot_silenced:
        return {"triggered": False, "reason": "BOT_SILENCED"}
    if app.screening_status == "in_progress" and not force:
        return {"triggered": False, "reason": "SCREENING_IN_PROGRESS"}

    last_msg = db.query(ApplicationMessage).filter(
        ApplicationMessage.application_id == application_id
    ).order_by(ApplicationMessage.created_at.desc(), ApplicationMessage.id.desc()).first()
    if not last_msg or last_msg.sender_type != "candidate":
        return {"triggered": False, "reason": "LAST_MSG_NOT_CANDIDATE"}

    ref_time = app.last_candidate_message_at or last_msg.created_at
    elapsed = (datetime.utcnow() - ref_time).total_seconds() if ref_time else 0
    if not force and elapsed < RECRUITER_TIMEOUT_SECONDS:
        return {"triggered": False, "reason": "WAITING_RECRUITER", "remaining_seconds": max(0, int(RECRUITER_TIMEOUT_SECONDS - elapsed))}

    bot_msg = ApplicationMessage(
        application_id=application_id,
        sender_type="bot",
        sender_name="Chambot (IA)",
        mensaje=f"🤖 {screening_service.answer_job_question(app.job, last_msg.mensaje)}",
    )
    db.add(bot_msg)
    db.commit()
    db.refresh(bot_msg)
    return {"triggered": True, "reason": "RECRUITER_TIMEOUT_REPLIED", "message": _message_response(bot_msg).model_dump()}
