"""
Router para el feed "Explorar" — vista tipo TikTok de vacantes.

GET  /api/v1/feed              → Listado paginado de vacantes con likes/comentarios
POST /api/v1/feed/{id}/like    → Toggle like (dar/quitar)
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, JobComment, JobLike, JobPhotoLog, User
from app.dependencies import get_current_user_optional, get_current_user
from app.schemas import JobFeedItem, LikeToggleResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/feed", tags=["Feed"])


@router.get("", response_model=List[JobFeedItem])
def get_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Lista vacantes activas para el feed, enriquecidas con likes y comentarios."""
    jobs = (
        db.query(Job)
        .filter(Job.activa.is_(True))
        .order_by(Job.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    if not jobs:
        return []

    job_ids = [j.id for j in jobs]

    # Conteo de likes por vacante
    likes_counts = dict(
        db.query(JobLike.job_id, func.count(JobLike.id))
        .filter(JobLike.job_id.in_(job_ids))
        .group_by(JobLike.job_id)
        .all()
    )

    # Conteo de comentarios por vacante
    comments_counts = dict(
        db.query(JobComment.job_id, func.count(JobComment.id))
        .filter(JobComment.job_id.in_(job_ids))
        .group_by(JobComment.job_id)
        .all()
    )

    # Likes del usuario actual
    user_liked_ids = set()
    if current_user:
        user_liked_ids = set(
            row[0] for row in
            db.query(JobLike.job_id)
            .filter(JobLike.job_id.in_(job_ids), JobLike.user_id == current_user.id)
            .all()
        )

    # Nombres de quien reportó (para fotos comunitarias)
    reporter_map = {}
    community_jobs = [j for j in jobs if j.origen == "foto_comunitaria" and j.reportada_por_email]
    if community_jobs:
        emails = [j.reportada_por_email for j in community_jobs]
        reporters = db.query(User.email, User.nombre).filter(User.email.in_(emails)).all()
        reporter_map = {r.email: r.nombre for r in reporters}

    # Jobs con foto disponible
    photo_job_ids = set(
        row[0] for row in
        db.query(JobPhotoLog.job_id)
        .filter(JobPhotoLog.job_id.in_(job_ids), JobPhotoLog.success.is_(True))
        .distinct()
        .all()
    )

    result = []
    for job in jobs:
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
            has_photo=job.id in photo_job_ids,
        )
        result.append(item)

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
