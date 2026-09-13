from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ==========================================
# RETENTION PREDICTOR SCHEMAS
# ==========================================
class PredictRetentionRequest(BaseModel):
    sueldo: float = Field(..., description="Sueldo semanal libre en MXN (ej: 2100)")
    tiempo_traslado_min: int = Field(..., description="Tiempo estimado de traslado en minutos (ej: 35)")
    turnos_fijos: bool = Field(False, description="Si el puesto ofrece turnos fijos o rotativos")
    apoyo_inea: bool = Field(False, description="Si la empresa brinda apoyo/facilidades para el INEA")

class PredictRetentionResponse(BaseModel):
    retention_months: float
    base_months: float
    sueldo_impact: float
    traslado_impact: float
    turnos_impact: float
    inea_impact: float
    retention_level: str
    risk_category: str
    recommendations: List[str]

# ==========================================
# CHATBOT SCHEMAS
# ==========================================
class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: Optional[str] = None
    selected_option: Optional[str] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    user_email: Optional[str] = None

class ChatOption(BaseModel):
    label: str
    value: str

class ChatMessageResponse(BaseModel):
    session_id: str
    current_step: str
    bot_messages: List[str]
    options: List[ChatOption] = []
    matched_jobs: List[Dict[str, Any]] = []
    completed: bool = False
    candidate_profile: Optional[Dict[str, Any]] = None
    should_ask_login: Optional[bool] = False

# ==========================================
# APPLICATION & RECRUITER MESSAGES SCHEMAS
# ==========================================
class ApplicationCreateRequest(BaseModel):
    job_id: int
    session_id: Optional[str] = None
    candidate_name: str
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    municipio: Optional[str] = "Apodaca"

class MessageCreateRequest(BaseModel):
    sender_type: str = "recruiter"  # 'recruiter' | 'candidate'
    sender_name: str
    mensaje: str

class MessageResponse(BaseModel):
    id: int
    application_id: int
    sender_type: str
    sender_name: str
    mensaje: str
    leido: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    session_id: Optional[str] = None
    candidate_name: str
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    municipio: Optional[str] = None
    status: str
    created_at: datetime
    job_titulo: Optional[str] = None
    empresa_nombre: Optional[str] = None
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# ==========================================
# JOBS SCHEMAS
# ==========================================
class JobBase(BaseModel):
    empresa_nombre: str = "Manufactura Monterrey"
    titulo: str
    descripcion: Optional[str] = None
    sueldo_semanal_libre: float
    turnos_fijos: bool = False
    apoyo_inea: bool = False
    transporte_incluido: bool = True
    municipio: str
    latitud: float
    longitud: float

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==========================================
# CANDIDATES SCHEMAS
# ==========================================
class CandidateResponse(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str] = None
    codigo_postal: Optional[str] = None
    municipio: Optional[str] = None
    nivel_educativo: str
    tag_inea: bool
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    sueldo_deseado: Optional[float] = None
    activo: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==========================================
# ADMIN PROMPTS SCHEMAS
# ==========================================
class PromptResponse(BaseModel):
    step_key: str
    step_order: int
    titulo_admin: str
    prompt_texto: str
    opciones_json: str
    activo: bool
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PromptUpdate(BaseModel):
    titulo_admin: Optional[str] = None
    prompt_texto: str
    opciones_json: Optional[str] = None
    activo: Optional[bool] = None

# ==========================================
# ANALYTICS SCHEMAS
# ==========================================
class AnalyticsSummary(BaseModel):
    total_operarios: int
    total_vacantes: int
    total_inea_canalizados: int
    tasa_inea_pct: float
    promedio_permanencia_meses: float
    permanencia_con_inea: float
    permanencia_sin_inea: float
    permanencia_turnos_fijos: float
    permanencia_turnos_rotativos: float
    distribucion_escolaridad: Dict[str, int]
    distribucion_municipios: Dict[str, int]
    principales_motivos_baja: List[Dict[str, Any]]
