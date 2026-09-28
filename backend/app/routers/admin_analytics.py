"""
Estadísticas del sitio — solo accesible por usuarios @chambachat.com.

Endpoints:
  GET /api/v1/admin/analytics/overview  — resumen general
  GET /api/v1/admin/analytics/dau       — usuarios activos por día (últimos 30 días)
  GET /api/v1/admin/analytics/jobs      — vacantes publicadas por día
  GET /api/v1/admin/analytics/views     — top vacantes por vistas únicas
  POST /api/v1/admin/analytics/track-view — registrar vista de vacante (llamado por el frontend)
"""
import logging
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, case, distinct
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import (
    DailyActiveUser, JobView, Job, User, JobApplication,
    CompanyMember, Company,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin/analytics", tags=["Admin Analytics"])


# ─── Helpers ──────────────────────────────────────────────────────────

def _require_admin(user: User):
    """Solo usuarios con email @chambachat.com pueden acceder."""
    if not user.email or not user.email.endswith("@chambachat.com"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo disponible para administradores de ChambaChat.",
        )


def _log_dau(db: Session, user: User):
    """Registra actividad diaria del usuario (silencioso, sin romper el flujo)."""
    try:
        today = date.today()
        exists = db.query(DailyActiveUser.id).filter(
            DailyActiveUser.user_id == user.id,
            DailyActiveUser.date == today,
        ).first()
        if not exists:
            role = "recruiter" if (user.role or "").startswith("rec") else "candidate"
            db.add(DailyActiveUser(user_id=user.id, date=today, role=role))
            db.commit()
    except Exception:
        db.rollback()


# ─── Track View (público, lo llama el frontend al ver una vacante) ────

@router.post("/track-view", status_code=204)
def track_job_view(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Registra que un usuario vio una vacante (una vez por día por vacante)."""
    try:
        today = date.today()
        exists = db.query(JobView.id).filter(
            JobView.job_id == job_id,
            JobView.user_id == current_user.id,
            JobView.date == today,
        ).first()
        if not exists:
            db.add(JobView(job_id=job_id, user_id=current_user.id, date=today))
            db.commit()
        # También registrar DAU
        _log_dau(db, current_user)
    except Exception:
        db.rollback()


# ─── Track DAU (público, lo llama el frontend al cargar la app) ───────

@router.post("/track-active", status_code=204)
def track_active_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Registra al usuario como activo hoy."""
    _log_dau(db, current_user)


# ─── Overview (admin) ─────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resumen general del sitio."""
    _require_admin(current_user)

    today = date.today()
    last_7 = today - timedelta(days=7)
    last_30 = today - timedelta(days=30)

    # Usuarios totales
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_candidates = db.query(func.count(User.id)).filter(User.role == "candidate").scalar() or 0
    total_recruiters = db.query(func.count(User.id)).filter(User.role == "recruiter").scalar() or 0

    # DAU hoy
    dau_today = db.query(func.count(DailyActiveUser.id)).filter(DailyActiveUser.date == today).scalar() or 0
    dau_today_candidates = db.query(func.count(DailyActiveUser.id)).filter(
        DailyActiveUser.date == today, DailyActiveUser.role == "candidate"
    ).scalar() or 0
    dau_today_recruiters = db.query(func.count(DailyActiveUser.id)).filter(
        DailyActiveUser.date == today, DailyActiveUser.role == "recruiter"
    ).scalar() or 0

    # DAU últimos 7 días (promedio)
    dau_7d = db.query(func.count(distinct(DailyActiveUser.user_id))).filter(
        DailyActiveUser.date >= last_7
    ).scalar() or 0

    # Vacantes activas
    active_jobs = db.query(func.count(Job.id)).filter(Job.activa.is_(True)).scalar() or 0
    jobs_last_7 = db.query(func.count(Job.id)).filter(Job.created_at >= last_7).scalar() or 0

    # Postulaciones últimos 7 días
    apps_7d = db.query(func.count(JobApplication.id)).filter(
        JobApplication.created_at >= last_7
    ).scalar() or 0

    # Empresas
    total_companies = db.query(func.count(Company.id)).scalar() or 0

    # Vistas totales últimos 30 días
    views_30d = db.query(func.count(JobView.id)).filter(JobView.date >= last_30).scalar() or 0

    return {
        "total_users": total_users,
        "total_candidates": total_candidates,
        "total_recruiters": total_recruiters,
        "total_companies": total_companies,
        "dau_today": dau_today,
        "dau_today_candidates": dau_today_candidates,
        "dau_today_recruiters": dau_today_recruiters,
        "dau_unique_7d": dau_7d,
        "active_jobs": active_jobs,
        "jobs_published_last_7d": jobs_last_7,
        "applications_last_7d": apps_7d,
        "job_views_last_30d": views_30d,
    }


# ─── DAU por día (admin) ──────────────────────────────────────────────

@router.get("/dau")
def get_dau(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Usuarios activos únicos por día, desglosados por rol."""
    _require_admin(current_user)
    cutoff = date.today() - timedelta(days=days)

    rows = (
        db.query(
            DailyActiveUser.date,
            DailyActiveUser.role,
            func.count(DailyActiveUser.id),
        )
        .filter(DailyActiveUser.date >= cutoff)
        .group_by(DailyActiveUser.date, DailyActiveUser.role)
        .order_by(DailyActiveUser.date)
        .all()
    )

    # Agrupar por fecha
    by_date = {}
    for d, role, cnt in rows:
        key = d.isoformat()
        if key not in by_date:
            by_date[key] = {"date": key, "candidates": 0, "recruiters": 0, "total": 0}
        if role == "candidate":
            by_date[key]["candidates"] = cnt
        else:
            by_date[key]["recruiters"] = cnt
        by_date[key]["total"] += cnt

    return list(by_date.values())


# ─── Vacantes publicadas por día (admin) ──────────────────────────────

@router.get("/jobs")
def get_jobs_per_day(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vacantes nuevas por día, desglosadas por origen."""
    _require_admin(current_user)
    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            func.date(Job.created_at),
            Job.origen,
            func.count(Job.id),
        )
        .filter(Job.created_at >= cutoff)
        .group_by(func.date(Job.created_at), Job.origen)
        .order_by(func.date(Job.created_at))
        .all()
    )

    by_date = {}
    for d, origen, cnt in rows:
        key = str(d)
        if key not in by_date:
            by_date[key] = {"date": key, "empresa": 0, "foto_comunitaria": 0, "scraping": 0, "reclamada": 0, "total": 0}
        if origen in by_date[key]:
            by_date[key][origen] = cnt
        by_date[key]["total"] += cnt

    return list(by_date.values())


# ─── Top vacantes por vistas únicas (admin) ───────────────────────────

@router.get("/views")
def get_top_viewed_jobs(
    days: int = 30,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Top vacantes por vistas únicas en los últimos N días."""
    _require_admin(current_user)
    cutoff = date.today() - timedelta(days=days)

    rows = (
        db.query(
            JobView.job_id,
            func.count(distinct(JobView.user_id)).label("unique_viewers"),
            func.count(JobView.id).label("total_views"),
        )
        .filter(JobView.date >= cutoff)
        .group_by(JobView.job_id)
        .order_by(func.count(distinct(JobView.user_id)).desc())
        .limit(limit)
        .all()
    )

    # Enriquecer con datos de la vacante
    job_ids = [r[0] for r in rows]
    jobs_map = {}
    if job_ids:
        jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()
        jobs_map = {j.id: j for j in jobs}

    result = []
    for job_id, unique_viewers, total_views in rows:
        j = jobs_map.get(job_id)
        result.append({
            "job_id": job_id,
            "titulo": j.titulo if j else "—",
            "empresa_nombre": j.empresa_nombre if j else "—",
            "origen": j.origen if j else "—",
            "unique_viewers": unique_viewers,
            "total_views": total_views,
        })

    return result
