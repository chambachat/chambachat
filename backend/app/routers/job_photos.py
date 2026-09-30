"""
Endpoints para el flujo de vacantes comunitarias desde fotos.

POST /api/v1/jobs/from-photo        → Analiza foto con Gemini Flash, devuelve extracción preliminar.
POST /api/v1/jobs/from-photo/confirm → Crea la vacante final a partir de los datos confirmados por el usuario.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuraEvent, Job, User, UserAura
from app.routers.auth import get_current_user
from app.schemas import JobFromPhotoConfirm, JobFromPhotoRequest, JobPhotoExtraction, JobResponse
from app.services.job_vision_service import analyze_job_photo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/jobs", tags=["Job Photos"])

# ─── Puntos de Aura por acción ────────────────────────────────────────
AURA_POINTS_PHOTO_JOB = 10


def _grant_aura(db: Session, user: User, event_type: str, points: int, description: str, reference_id: int) -> int:
    """Registra un evento de Aura y actualiza el acumulado del usuario. Retorna el total nuevo."""
    aura = db.query(UserAura).filter(UserAura.user_id == user.id).first()
    if not aura:
        aura = UserAura(
            user_id=user.id,
            email=user.email or "",
            total_points=0,
            vacantes_reportadas=0,
            colocaciones_ayudadas=0,
        )
        db.add(aura)
        db.flush()

    aura.total_points += points
    if event_type == "foto_vacante":
        aura.vacantes_reportadas += 1
    elif event_type == "vacante_colocacion":
        aura.colocaciones_ayudadas += 1
    aura.updated_at = datetime.utcnow()

    event = AuraEvent(
        user_id=user.id,
        event_type=event_type,
        points=points,
        description=description,
        reference_id=reference_id,
    )
    db.add(event)

    return aura.total_points


@router.post("/from-photo", response_model=JobPhotoExtraction)
async def analyze_photo(
    payload: JobFromPhotoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recibe una foto en base64 de una oferta laboral callejera,
    la analiza con Gemini Flash y devuelve los datos extraídos y normalizados.

    El usuario debe revisar y confirmar antes de publicar.
    """
    import base64
    from app.services.job_vision_service import _preprocess_image
    from app.models import JobPhotoLog

    # Rate limiting: ilimitado para admin, 20 fotos por día en beta
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    uploads_today = (
        db.query(func.count(JobPhotoLog.id))
        .filter(JobPhotoLog.user_id == current_user.id, JobPhotoLog.created_at >= today_start)
        .scalar()
    )
    if current_user.role != 'admin' and uploads_today >= 20:
        raise HTTPException(
            status_code=429,
            detail="Has alcanzado el límite de 20 fotos por día. Intenta mañana.",
        )
    
    # 1. Comprimir la imagen antes de intentar guardarla o mandarla a Gemini
    processed_b64, mime_type = "", ""
    try:
        processed_b64, mime_type = _preprocess_image(payload.image_base64)
        file_bytes = base64.b64decode(processed_b64)
    except Exception as e:
        logger.warning(f"No se pudo procesar la imagen: {e}")
        raise HTTPException(status_code=400, detail="Formato de imagen inválido o corrupto")
        
    # 2. Guardar registro inicial (sin job_id, asumiendo falla por default)
    photo_log = JobPhotoLog(
        user_id=current_user.id,
        file_data=file_bytes,
        success=False
    )
    db.add(photo_log)
    db.commit()
    db.refresh(photo_log)

    try:
        extraction = await analyze_job_photo(
            image_b64=processed_b64,
            latitud=payload.latitud,
            longitud=payload.longitud,
            municipio=payload.municipio,
        )
    except ValueError as exc:
        logger.warning("Configuración faltante para visión: %s", exc)
        photo_log.error_message = f"Configuración faltante: {exc}"
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Error en análisis de foto: %s", exc)
        photo_log.error_message = f"Error en análisis: {exc}"
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not extraction.es_oferta_laboral:
        motivo = extraction.motivo_rechazo or "no_es_oferta"
        messages = {
            "contenido_inapropiado": "La imagen contiene contenido inapropiado y no puede ser publicada.",
            "screenshot_digital": "La imagen parece ser un screenshot de otra app. Por favor toma una foto directa del anuncio impreso (lona, volante, poster).",
            "montaje_digital": "La imagen parece ser un montaje o documento digital. Solo se aceptan fotos de anuncios físicos reales.",
            "no_es_oferta": "La imagen no parece contener una oferta de empleo. Intenta con otra foto.",
        }
        photo_log.error_message = f"Rechazada: {motivo}"
        db.commit()
        raise HTTPException(
            status_code=422,
            detail=messages.get(motivo, messages["no_es_oferta"]),
        )
        
    photo_log.success = True
    db.commit()

    extraction.photo_log_id = photo_log.id
    return extraction


@router.post("/from-photo/confirm", response_model=JobResponse)
async def confirm_photo_job(
    payload: JobFromPhotoConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea una vacante comunitaria a partir de los datos confirmados por el usuario.
    Suma +10 puntos de Aura al usuario que reportó la vacante.
    """
    job = Job(
        empresa_nombre=payload.empresa_nombre,
        titulo=payload.titulo,
        descripcion=payload.descripcion,
        sueldo_semanal_libre=payload.sueldo_semanal_libre,
        municipio=payload.municipio,
        latitud=payload.latitud,
        longitud=payload.longitud,
        categoria=payload.categoria,
        tipo_turno=payload.tipo_turno,
        dias_laborales=payload.dias_laborales,
        tipo_contrato=payload.tipo_contrato,
        escolaridad_minima=payload.escolaridad_minima,
        experiencia_minima=payload.experiencia_minima,
        certificaciones=payload.certificaciones or [],
        prestaciones=payload.prestaciones or [],
        requisitos_fisicos=payload.requisitos_fisicos or [],
        vacantes_disponibles=payload.vacantes_disponibles,
        # Campos exclusivos de vacantes comunitarias
        origen="foto_comunitaria",
        fuente_contacto_telefono=payload.fuente_contacto_telefono,
        fuente_contacto_email=payload.fuente_contacto_email,
        fuente_contacto_whatsapp=payload.fuente_contacto_whatsapp,
        reportada_por_email=current_user.email,
        texto_ocr=payload.texto_ocr,
        # Flags derivados de prestaciones
        transporte_incluido="Transporte de personal" in (payload.prestaciones or []),
        apoyo_inea="Apoyo para terminar estudios (INEA)" in (payload.prestaciones or []),
    )
    db.add(job)
    db.flush()

    # Registrar Aura
    total_aura = _grant_aura(
        db=db,
        user=current_user,
        event_type="foto_vacante",
        points=AURA_POINTS_PHOTO_JOB,
        description=f"Vacante reportada desde foto: {payload.titulo}",
        reference_id=job.id,
    )
    
    # Ligar log de foto si existe
    if payload.photo_log_id:
        from app.models import JobPhotoLog
        photo_log = db.query(JobPhotoLog).filter(JobPhotoLog.id == payload.photo_log_id).first()
        if photo_log:
            photo_log.job_id = job.id

    db.commit()
    db.refresh(job)

    logger.info(
        "Vacante comunitaria #%d creada por %s (+%d Aura, total: %d)",
        job.id, current_user.email, AURA_POINTS_PHOTO_JOB, total_aura,
    )

    return job
