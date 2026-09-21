from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Job, HiringHistory
from app.schemas import AnalyticsSummary

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


def _avg_where(db: Session, condition) -> float:
    """Promedio de meses de permanencia filtrado por una condición, calculado en SQL."""
    value = db.query(func.avg(HiringHistory.meses_permanencia)).filter(condition).scalar()
    return round(float(value), 2) if value is not None else 0.0


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Métricas de People Analytics calculadas con agregados SQL.
    Cuando no existe histórico de contrataciones, `has_data` es False y las
    métricas de permanencia se devuelven en cero: nunca se inventan valores.
    """
    total_operarios = db.query(func.count(User.id)).scalar() or 0
    total_vacantes = db.query(func.count(Job.id)).scalar() or 0
    total_inea = db.query(func.count(User.id)).filter(User.tag_inea == True).scalar() or 0  # noqa: E712
    tasa_inea = round((total_inea / max(1, total_operarios)) * 100, 1)

    total_history = db.query(func.count(HiringHistory.id)).scalar() or 0
    has_data = total_history > 0

    if has_data:
        promedio_meses = _avg_where(db, HiringHistory.id.isnot(None))
        perm_inea = _avg_where(db, HiringHistory.apoyo_inea == True)  # noqa: E712
        perm_no_inea = _avg_where(db, HiringHistory.apoyo_inea == False)  # noqa: E712
        perm_fijos = _avg_where(db, HiringHistory.turnos_fijos == True)  # noqa: E712
        perm_rot = _avg_where(db, HiringHistory.turnos_fijos == False)  # noqa: E712

        motivos_rows = (
            db.query(HiringHistory.motivo_baja, func.count(HiringHistory.id).label("n"))
            .filter(HiringHistory.motivo_baja.isnot(None))
            .group_by(HiringHistory.motivo_baja)
            .order_by(func.count(HiringHistory.id).desc())
            .limit(5)
            .all()
        )
        motivos_list = [
            {"motivo": motivo, "frecuencia": n, "porcentaje": round((n / total_history) * 100, 1)}
            for motivo, n in motivos_rows
        ]
    else:
        promedio_meses = perm_inea = perm_no_inea = perm_fijos = perm_rot = 0.0
        motivos_list = []

    escolaridad_rows = (
        db.query(User.nivel_educativo, func.count(User.id))
        .group_by(User.nivel_educativo)
        .all()
    )
    municipios_rows = (
        db.query(User.municipio, func.count(User.id))
        .filter(User.municipio.isnot(None))
        .group_by(User.municipio)
        .all()
    )

    return AnalyticsSummary(
        has_data=has_data,
        total_operarios=total_operarios,
        total_vacantes=total_vacantes,
        total_inea_canalizados=total_inea,
        tasa_inea_pct=tasa_inea,
        promedio_permanencia_meses=promedio_meses,
        permanencia_con_inea=perm_inea,
        permanencia_sin_inea=perm_no_inea,
        permanencia_turnos_fijos=perm_fijos,
        permanencia_turnos_rotativos=perm_rot,
        distribucion_escolaridad={(k or "Sin dato"): v for k, v in escolaridad_rows},
        distribucion_municipios={k: v for k, v in municipios_rows},
        principales_motivos_baja=motivos_list,
    )
