from fastapi import APIRouter
from app.schemas import PredictRetentionRequest, PredictRetentionResponse
from app.services.predictor import calculate_predicted_retention

router = APIRouter(prefix="/api/v1", tags=["Predictor"])

@router.post("/predict-retention", response_model=PredictRetentionResponse)
def predict_retention(request: PredictRetentionRequest):
    """
    Calcula la permanencia estimada (en meses) del operario con base en:
    - sueldo semanal libre
    - tiempo estimado de traslado (minutos)
    - turnos fijos (booleano)
    - apoyo educativo INEA (booleano)
    """
    result = calculate_predicted_retention(
        sueldo=request.sueldo,
        tiempo_traslado_min=request.tiempo_traslado_min,
        turnos_fijos_bool=request.turnos_fijos,
        apoyo_inea_bool=request.apoyo_inea
    )
    return result
