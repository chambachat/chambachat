from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Job, HiringHistory
from app.schemas import AnalyticsSummary

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Retorna métricas de People Analytics basadas en el histórico de contrataciones y operarios registrados.
    """
    total_operarios = db.query(User).count()
    total_vacantes = db.query(Job).count()
    total_inea_canalizados = db.query(User).filter(User.tag_inea == True).count()
    
    tasa_inea = round((total_inea_canalizados / max(1, total_operarios)) * 100, 1)

    # Métricas de HiringHistory
    history = db.query(HiringHistory).all()
    
    if history:
        promedio_meses = round(sum(h.meses_permanencia for h in history) / len(history), 2)
        
        inea_recs = [h.meses_permanencia for h in history if h.apoyo_inea]
        no_inea_recs = [h.meses_permanencia for h in history if not h.apoyo_inea]
        perm_inea = round(sum(inea_recs) / max(1, len(inea_recs)), 2) if inea_recs else 0.0
        perm_no_inea = round(sum(no_inea_recs) / max(1, len(no_inea_recs)), 2) if no_inea_recs else 0.0

        fijos_recs = [h.meses_permanencia for h in history if h.turnos_fijos]
        rot_recs = [h.meses_permanencia for h in history if not h.turnos_fijos]
        perm_fijos = round(sum(fijos_recs) / max(1, len(fijos_recs)), 2) if fijos_recs else 0.0
        perm_rot = round(sum(rot_recs) / max(1, len(rot_recs)), 2) if rot_recs else 0.0

        motivos_counter = Counter(h.motivo_baja for h in history if h.motivo_baja)
        motivos_list = [
            {"motivo": k, "frecuencia": v, "porcentaje": round((v / len(history)) * 100, 1)}
            for k, v in motivos_counter.most_common(5)
        ]
    else:
        promedio_meses = 0.0
        perm_inea = 0.0
        perm_no_inea = 0.0
        perm_fijos = 0.0
        perm_rot = 0.0
        motivos_list = []

    # Distribución de escolaridad y municipios
    users = db.query(User).all()
    escolaridad_counts = Counter(u.nivel_educativo for u in users)
    municipios_counts = Counter(u.municipio for u in users if u.municipio)

    return AnalyticsSummary(
        total_operarios=total_operarios,
        total_vacantes=total_vacantes,
        total_inea_canalizados=total_inea_canalizados,
        tasa_inea_pct=tasa_inea,
        promedio_permanencia_meses=promedio_meses,
        permanencia_con_inea=perm_inea,
        permanencia_sin_inea=perm_no_inea,
        permanencia_turnos_fijos=perm_fijos,
        permanencia_turnos_rotativos=perm_rot,
        distribucion_escolaridad=dict(escolaridad_counts),
        distribucion_municipios=dict(municipios_counts),
        principales_motivos_baja=motivos_list
    )
