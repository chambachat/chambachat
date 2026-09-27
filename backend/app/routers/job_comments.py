"""
Router para comentarios comunitarios en vacantes.

GET  /api/v1/jobs/{job_id}/comments  → Lista comentarios (público)
POST /api/v1/jobs/{job_id}/comments  → Agregar comentario (requiere auth)
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, JobComment, User
from app.routers.auth import get_current_user
from app.schemas import JobCommentCreate, JobCommentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/jobs", tags=["Job Comments"])

MAX_COMMENTS_PER_JOB = 50


@router.get("/{job_id}/comments", response_model=List[JobCommentResponse])
def list_comments(job_id: int, db: Session = Depends(get_db)):
    """Lista los comentarios de una vacante (público, sin auth)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    comments = (
        db.query(JobComment)
        .filter(JobComment.job_id == job_id)
        .order_by(JobComment.created_at.asc())
        .limit(MAX_COMMENTS_PER_JOB)
        .all()
    )
    return comments


@router.post("/{job_id}/comments", response_model=JobCommentResponse, status_code=201)
def add_comment(
    job_id: int,
    payload: JobCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Agrega un comentario a una vacante (requiere auth)."""
    job = db.query(Job).filter(Job.id == job_id, Job.activa.is_(True)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada o inactiva")

    comment = JobComment(
        job_id=job_id,
        user_id=current_user.id,
        user_email=current_user.email or "anónimo",
        user_name=current_user.nombre,
        texto=payload.texto.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    logger.info("Comentario #%d en vacante #%d por %s", comment.id, job_id, current_user.email)
    return comment
