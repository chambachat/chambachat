"""
Router para el feed "Explorar" â€” vista tipo TikTok de vacantes.

GET  /api/v1/feed              â†’ Listado con shuffle ponderado por relevancia
POST /api/v1/feed/{id}/like    â†’ Toggle like (dar/quitar)
"""

import logging
import random
import math
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, JobComment, JobLike, JobPhotoLog, JobReport, User, PlatformVideo, UserVideoQueue
from app.dependencies import get_current_user_optional, get_current_user
from app.schemas import JobFeedItem, LikeToggleResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/feed", tags=["Feed"])


# â”€â”€â”€ Scoring helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _haversine(lat1, lon1, lat2, lon2):
    """Distancia en km entre dos puntos."""
    if None in (lat1, lon1, lat2, lon2):
        return 999.0
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _score_job(job: Job, user: Optional[User], likes_map: dict) -> float:
    """Calcula un score de relevancia para una vacante vs el usuario en sesiÃ³n."""
    score = 50.0  # base

    # 1. CercanÃ­a geogrÃ¡fica (max +30)
    if user and user.latitud and user.longitud and job.latitud and job.longitud:
        dist_km = _haversine(user.latitud, user.longitud, job.latitud, job.longitud)
        if dist_km <= 5:
            score += 30.0
        elif dist_km <= 15:
            score += 20.0
        elif dist_km <= 30:
            score += 10.0
        elif dist_km <= 50:
            score += 5.0
    elif user and user.municipio and job.municipio:
        if user.municipio.lower().strip() == (job.municipio or "").lower().strip():
            score += 25.0

    # 2. Match de puesto deseado (max +35)
    puesto = ""
    if user and user.perfil_operativo and isinstance(user.perfil_operativo, dict):
        puesto = (user.perfil_operativo.get("puesto_deseado") or "").lower().strip()
    if puesto:
        titulo = (job.titulo or "").lower()
        cat = (job.categoria or "").lower()
        desc = (job.descripcion or "").lower()
        if puesto in titulo or any(w in titulo for w in puesto.split() if len(w) > 3):
            score += 35.0
        elif puesto in cat or any(w in cat for w in puesto.split() if len(w) > 3):
            score += 25.0
        elif puesto in desc:
            score += 15.0

    # 3. Recencia (max +15): las mÃ¡s nuevas tienen bonus
    age_days = (datetime.utcnow() - (job.created_at or datetime.utcnow())).days
    if age_days <= 1:
        score += 15.0
    elif age_days <= 3:
        score += 12.0
    elif age_days <= 7:
        score += 8.0
    elif age_days <= 14:
        score += 4.0

    # 4. Engagement: likes como seÃ±al de calidad (max +10)
    likes = likes_map.get(job.id, 0)
    score += min(10.0, likes * 2.0)

    # 5. Tiene foto = mÃ¡s atractiva visualmente (+5)
    if getattr(job, '_has_photo', False):
        score += 5.0

    # 6. Empresa verificada (+3)
    if job.empresa_id:
        score += 3.0

    return score


def _weighted_shuffle(items: list, scores: list, seed: int = None) -> list:
    """
    Shuffle ponderado: items con mayor score tienden a quedar primero
    pero con aleatoriedad para que no sea siempre el mismo orden.
    FÃ³rmula: sort_key = score + random(0, max_score * 0.4)
    """
    if not items:
        return []
    rng = random.Random(seed)
    max_score = max(scores) if scores else 1.0
    noise_range = max_score * 0.4  # 40% de ruido aleatorio
    paired = list(zip(items, scores))
    paired.sort(key=lambda x: -(x[1] + rng.uniform(0, noise_range)))
    return [item for item, _ in paired]


@router.get("", response_model=List[JobFeedItem])
def get_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    q: Optional[str] = Query(None, max_length=120, description="BÃºsqueda por texto libre"),
    seed: Optional[int] = Query(None, description="Semilla para reproducir el mismo shuffle dentro de una sesiÃ³n"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Feed con shuffle ponderado por relevancia del usuario."""
    from sqlalchemy import or_

    query = db.query(Job).filter(Job.activa.is_(True))

    # BÃºsqueda por texto
    if q and q.strip():
        for term in q.strip().split()[:5]:
            like = f"%{term}%"
            query = query.filter(or_(
                Job.titulo.ilike(like),
                Job.empresa_nombre.ilike(like),
                Job.categoria.ilike(like),
                Job.municipio.ilike(like),
                Job.descripcion.ilike(like),
            ))

    # Cargar TODAS las vacantes activas para scoring (el shuffle necesita ver todo)
    all_jobs = query.all()

    if not all_jobs:
        return []

    all_job_ids = [j.id for j in all_jobs]

    # Likes para scoring + display
    likes_counts = dict(
        db.query(JobLike.job_id, func.count(JobLike.id))
        .filter(JobLike.job_id.in_(all_job_ids))
        .group_by(JobLike.job_id)
        .all()
    )

    # Jobs con foto
    photo_job_ids = set(
        row[0] for row in
        db.query(JobPhotoLog.job_id)
        .filter(JobPhotoLog.job_id.in_(all_job_ids), JobPhotoLog.success.is_(True))
        .distinct()
        .all()
    )
    for j in all_jobs:
        j._has_photo = j.id in photo_job_ids

    # Calcular scores y hacer shuffle ponderado
    scores = [_score_job(j, current_user, likes_counts) for j in all_jobs]
    session_seed = seed if seed is not None else random.randint(0, 999999)
    shuffled = _weighted_shuffle(all_jobs, scores, seed=session_seed)

    # Paginar sobre el resultado shuffled
    page = shuffled[offset:offset + limit]

    if not page:
        return []

    page_ids = [j.id for j in page]

    # Comentarios
    comments_counts = dict(
        db.query(JobComment.job_id, func.count(JobComment.id))
        .filter(JobComment.job_id.in_(page_ids))
        .group_by(JobComment.job_id)
        .all()
    )

    # User likes
    user_liked_ids = set()
    if current_user:
        user_liked_ids = set(
            row[0] for row in
            db.query(JobLike.job_id)
            .filter(JobLike.job_id.in_(page_ids), JobLike.user_id == current_user.id)
            .all()
        )

    # Reporter names
    reporter_map = {}
    community_jobs = [j for j in page if j.origen == "foto_comunitaria" and j.reportada_por_email]
    if community_jobs:
        emails = [j.reportada_por_email for j in community_jobs]
        reporters = db.query(User.email, User.nombre).filter(User.email.in_(emails)).all()
        reporter_map = {r.email: r.nombre for r in reporters}

    result = []
    for job in page:
        item = JobFeedItem(
            id=job.id,
            titulo=job.titulo,
            empresa_nombre=job.empresa_nombre or "Empresa no identificada",
            descripcion=job.descripcion,
            sueldo_semanal_libre=job.sueldo_semanal_libre,
            categoria=job.categoria,
            tipo_turno=job.tipo_turno,
            dias_laborales=job.dias_laborales,
            municipio=job.municipio,
            transporte_incluido=job.transporte_incluido or False,
            escolaridad_minima=job.escolaridad_minima,
            experiencia_minima=job.experiencia_minima,
            prestaciones=job.prestaciones or [],
            origen=job.origen or "empresa",
            created_at=job.created_at,
            likes_count=likes_counts.get(job.id, 0),
            comments_count=comments_counts.get(job.id, 0),
            user_liked=job.id in user_liked_ids,
            reportada_por=reporter_map.get(job.reportada_por_email) if job.reportada_por_email else None,
            reportada_por_email=job.reportada_por_email,
            has_photo=job.id in photo_job_ids,
            fuente_contacto_telefono=job.fuente_contacto_telefono if job.origen == "foto_comunitaria" else None,
            fuente_contacto_whatsapp=job.fuente_contacto_whatsapp if job.origen == "foto_comunitaria" else None,
        )
        result.append(item)

    # Inyectar video de TikTok si hay alguno en la cola del usuario y estamos en la primera pÃ¡gina
    if offset == 0 and current_user:
        queued_video = (
            db.query(UserVideoQueue)
            .filter(UserVideoQueue.user_id == current_user.id, UserVideoQueue.viewed.is_(False))
            .first()
        )
        if queued_video:
            video = db.query(PlatformVideo).filter(PlatformVideo.id == queued_video.video_id, PlatformVideo.is_active.is_(True)).first()
            if video:
                # Marcar como visto
                queued_video.viewed = True
                db.commit()

                # Crear un item mock para el video
                video_item = JobFeedItem(
                    id=-video.id,  # IDs negativos para videos
                    titulo=video.title,
                    empresa_nombre="ChambaChat",
                    descripcion=video.title,
                    is_tiktok=True,
                    tiktok_url=video.tiktok_url
                )
                # Inyectarlo aleatoriamente en los primeros 3 resultados
                insert_idx = random.randint(1, min(3, len(result)))
                result.insert(insert_idx, video_item)

    return result


@router.post("/{job_id}/like", response_model=LikeToggleResponse)
def toggle_like(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle like: si ya le dio like, lo quita; si no, lo agrega."""
    job = db.query(Job).filter(Job.id == job_id, Job.activa.is_(True)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    existing = (
        db.query(JobLike)
        .filter(JobLike.job_id == job_id, JobLike.user_id == current_user.id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        db.add(JobLike(job_id=job_id, user_id=current_user.id))
        db.commit()
        liked = True

    total = db.query(func.count(JobLike.id)).filter(JobLike.job_id == job_id).scalar()
    logger.info("Like toggle: job=%d user=%s liked=%s total=%d", job_id, current_user.email, liked, total)

    return LikeToggleResponse(liked=liked, likes_count=total)


@router.get("/{job_id}/photo")
def get_job_photo(job_id: int, db: Session = Depends(get_db)):
    """Sirve la foto comprimida de una vacante comunitaria (si existe)."""
    photo = (
        db.query(JobPhotoLog)
        .filter(JobPhotoLog.job_id == job_id, JobPhotoLog.success.is_(True))
        .order_by(JobPhotoLog.id.desc())
        .first()
    )
    if not photo or not photo.file_data:
        raise HTTPException(status_code=404, detail="Sin foto")
    return Response(content=photo.file_data, media_type="image/jpeg")


@router.post("/{job_id}/report")
def report_job(
    job_id: int,
    motivo: str = "falsa",
    detalle: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Denuncia una vacante. 5 reportes de usuarios o 1 de @chambachat.com la pausa."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    # Evitar duplicados
    existing = db.query(JobReport).filter(
        JobReport.job_id == job_id, JobReport.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya reportaste esta vacante")

    valid_motivos = {"falsa", "ofensiva", "spam", "otro"}
    if motivo not in valid_motivos:
        motivo = "otro"

    report = JobReport(
        job_id=job_id,
        user_id=current_user.id,
        user_email=current_user.email,
        motivo=motivo,
        detalle=detalle[:500] if detalle else None,
    )
    db.add(report)
    db.flush()

    # Auto-pause: 1 reporte de @chambachat.com O 5 de usuarios regulares
    is_admin_report = current_user.email.endswith("@chambachat.com")
    total_reports = db.query(func.count(JobReport.id)).filter(JobReport.job_id == job_id).scalar()

    paused = False
    if is_admin_report or total_reports >= 5:
        job.activa = False
        paused = True
        logger.info("Job %d auto-paused: reports=%d admin=%s", job_id, total_reports, is_admin_report)

    db.commit()

    return {
        "reported": True,
        "total_reports": total_reports,
        "paused": paused,
        "message": "Vacante pausada por reportes. Gracias por ayudar a mantener la comunidad segura." if paused
                   else "Reporte registrado. Gracias por ayudar a mantener la comunidad segura.",
    }

