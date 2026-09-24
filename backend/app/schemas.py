from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.constants import job_catalog

# Longitud del código de verificación por correo. Fuente única de verdad:
# la usan el router de auth (generación) y VerifyCodeRequest (validación).
VERIFICATION_CODE_LENGTH = 6
_CODE_LENGTH = VERIFICATION_CODE_LENGTH

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
    candidate_lat: Optional[float] = None
    candidate_lon: Optional[float] = None
    candidate_colonia: Optional[str] = None
    candidate_municipio: Optional[str] = None

class ChatOption(BaseModel):
    label: str
    value: str

class ChatMessageResponse(BaseModel):
    session_id: str
    current_step: str
    bot_messages: List[str]
    options: List[ChatOption] = []
    matched_jobs: List[Dict[str, Any]] = []
    nearby_routes: Optional[List[Dict[str, Any]]] = []  # solo cuando el candidato pide rutas
    completed: bool = False
    candidate_profile: Optional[Dict[str, Any]] = None
    should_ask_login: Optional[bool] = False
    ask_location: Optional[bool] = False     # el bot pide (o vuelve a pedir) la ubicación en este turno
    location_known: Optional[bool] = False   # la sesión ya tiene ubicación precisa del candidato


class UserLocationUpdate(BaseModel):
    """Ubicación confirmada del candidato desde su perfil (GPS o mapa)."""
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)
    colonia: Optional[str] = Field(None, max_length=150)
    municipio: Optional[str] = Field(None, max_length=100)

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

class ToggleBotRequest(BaseModel):
    silenced: Optional[bool] = None

class MessageCreateRequest(BaseModel):
    sender_type: str = "recruiter"  # 'recruiter' | 'candidate' | 'bot' | 'system'
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

    model_config = ConfigDict(from_attributes=True)

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    session_id: Optional[str] = None
    candidate_name: str
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    municipio: Optional[str] = None
    status: str
    match_score: Optional[int] = None  # Afinidad estimada (heurística), ver compute_match_score
    bot_silenced: bool = False
    last_candidate_message_at: Optional[datetime] = None
    last_recruiter_message_at: Optional[datetime] = None
    created_at: datetime
    job_titulo: Optional[str] = None
    empresa_nombre: Optional[str] = None
    job_details: Optional[dict] = None
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# JOBS SCHEMAS
# ==========================================
def _in_catalog(value: Optional[str], options: List[str], field: str) -> Optional[str]:
    if value is None or value == "":
        return None
    if value not in options:
        raise ValueError(f"{field} no válido: '{value}'. Opciones: {', '.join(options)}")
    return value


def _free_tags(values: Optional[List[str]], field: str, max_items: int = 20, max_len: int = 60) -> Optional[List[str]]:
    """Etiquetas libres (catálogo abierto): limpia espacios, quita vacíos y duplicados sin distinguir mayúsculas."""
    if values is None:
        return None
    seen, out = set(), []
    for raw in values:
        tag = " ".join(str(raw or "").split())[:max_len]
        if not tag:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(tag)
    if len(out) > max_items:
        raise ValueError(f"{field}: máximo {max_items} etiquetas")
    return out


def _subset_of_catalog(values: Optional[List[str]], options: List[str], field: str) -> Optional[List[str]]:
    if values is None:
        return None
    values = values or []
    bad = [v for v in values if v not in options]
    if bad:
        raise ValueError(f"{field} con valores no válidos: {', '.join(bad)}")
    return list(dict.fromkeys(values))  # sin duplicados, orden estable


class JobStructuredFields(BaseModel):
    """Campos cerrados de la vacante (ver app/constants/job_catalog.py)."""
    categoria: Optional[str] = None
    tipo_turno: Optional[str] = None
    shift_id: Optional[int] = None
    hora_entrada: Optional[str] = None
    hora_salida: Optional[str] = None
    dias_laborales: Optional[str] = None
    tipo_contrato: Optional[str] = None
    vacantes_disponibles: int = Field(1, ge=1, le=500)
    escolaridad_minima: Optional[str] = None
    experiencia_minima: Optional[str] = None
    certificaciones: List[str] = []
    prestaciones: List[str] = []
    requisitos_fisicos: List[str] = []
    bono_semanal: float = Field(0, ge=0)
    vales_despensa_semanal: float = Field(0, ge=0)
    direccion: Optional[str] = None
    activa: bool = True

    @field_validator("categoria")
    @classmethod
    def _v_categoria(cls, v): return _in_catalog(v, job_catalog.CATEGORIAS, "categoria")

    @field_validator("tipo_turno")
    @classmethod
    def _v_turno(cls, v): return _in_catalog(v, job_catalog.TIPOS_TURNO, "tipo_turno")

    @field_validator("dias_laborales")
    @classmethod
    def _v_dias(cls, v): return _in_catalog(v, job_catalog.DIAS_LABORALES, "dias_laborales")

    @field_validator("tipo_contrato")
    @classmethod
    def _v_contrato(cls, v): return _in_catalog(v, job_catalog.TIPOS_CONTRATO, "tipo_contrato")

    @field_validator("escolaridad_minima")
    @classmethod
    def _v_escolaridad(cls, v): return _in_catalog(v, job_catalog.ESCOLARIDADES, "escolaridad_minima")

    @field_validator("experiencia_minima")
    @classmethod
    def _v_experiencia(cls, v): return _in_catalog(v, job_catalog.EXPERIENCIAS, "experiencia_minima")

    @field_validator("certificaciones")
    @classmethod
    def _v_cert(cls, v): return _free_tags(v, "certificaciones")

    @field_validator("prestaciones")
    @classmethod
    def _v_prest(cls, v): return _subset_of_catalog(v, job_catalog.PRESTACIONES, "prestaciones")

    @field_validator("requisitos_fisicos")
    @classmethod
    def _v_fis(cls, v): return _free_tags(v, "requisitos_fisicos")


class JobBase(JobStructuredFields):
    empresa_nombre: str = "Manufactura Monterrey"
    company_id: Optional[int] = None
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


class JobUpdate(JobStructuredFields):
    """
    Edición parcial de una vacante. Hereda los campos estructurados (con su validación de
    catálogo) y añade los básicos; todo opcional: solo se aplica lo que venga en el body.
    La empresa (company_id) y la ubicación no se editan aquí: se heredan de la planta.
    """
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    sueldo_semanal_libre: Optional[float] = Field(None, gt=0)
    vacantes_disponibles: Optional[int] = Field(None, ge=1, le=500)
    bono_semanal: Optional[float] = Field(None, ge=0)
    vales_despensa_semanal: Optional[float] = Field(None, ge=0)
    certificaciones: Optional[List[str]] = None
    prestaciones: Optional[List[str]] = None
    requisitos_fisicos: Optional[List[str]] = None
    activa: Optional[bool] = None
    transporte_incluido: Optional[bool] = None
    apoyo_inea: Optional[bool] = None
    turnos_fijos: Optional[bool] = None

    @field_validator("certificaciones", "prestaciones", "requisitos_fisicos", mode="before")
    @classmethod
    def _keep_none(cls, v):
        return v  # None = no tocar; la validación de catálogo corre solo cuando hay lista


class JobCatalogResponse(BaseModel):
    categorias: List[str]
    tipos_turno: List[str]
    dias_laborales: List[str]
    tipos_contrato: List[str]
    escolaridades: List[str]
    experiencias: List[str]
    prestaciones: List[str]
    certificaciones: List[str]
    requisitos_fisicos: List[str]

class JobResponse(JobBase):
    id: int
    empresa_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("certificaciones", "prestaciones", "requisitos_fisicos", mode="before")
    @classmethod
    def _none_to_list(cls, v):
        return v or []

    @field_validator("categoria", "tipo_turno", "dias_laborales", "tipo_contrato", "escolaridad_minima", "experiencia_minima", mode="before")
    @classmethod
    def _legacy_values_pass(cls, v):
        # Filas históricas (seed) pueden tener valores fuera de catálogo o None: no romper la respuesta
        return v if v else None

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

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

class PromptUpdate(BaseModel):
    titulo_admin: Optional[str] = None
    prompt_texto: str
    opciones_json: Optional[str] = None
    activo: Optional[bool] = None

# ==========================================
# ANALYTICS SCHEMAS
# ==========================================
class AnalyticsSummary(BaseModel):
    has_data: bool = False  # False cuando no hay histórico de contrataciones suficiente
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
# --- SCHEMAS ---

class CompanyCreate(BaseModel):
    nombre: str
    municipio: Optional[str] = "Apodaca"
    industria: Optional[str] = "Manufactura y Logística"
    rfc: Optional[str] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    telefono_contacto: Optional[str] = None
    constancia_fiscal_url: Optional[str] = None
    regimen_fiscal: Optional[str] = None
    creator_email: Optional[str] = None  # ignorado: se usa el email del JWT
    creator_name: Optional[str] = None

    # Campos oficiales SAT / CSF
    idcif: Optional[str] = None
    curp: Optional[str] = None
    razon_social: Optional[str] = None
    regimen_capital: Optional[str] = None
    fecha_inicio_operaciones: Optional[str] = None
    estatus_padron: Optional[str] = None
    fecha_ultimo_cambio_estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    entidad_federativa: Optional[str] = None
    colonia: Optional[str] = None
    tipo_vialidad: Optional[str] = None
    calle: Optional[str] = None
    numero_exterior: Optional[str] = None
    numero_interior: Optional[str] = None
    sat_url_validacion: Optional[str] = None
    sat_validado: Optional[bool] = False
    sat_raw_data: Optional[str] = None

class CompanyUpdate(BaseModel):
    nombre: Optional[str] = None
    municipio: Optional[str] = None
    industria: Optional[str] = None
    rfc: Optional[str] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    telefono_contacto: Optional[str] = None
    constancia_fiscal_url: Optional[str] = None
    regimen_fiscal: Optional[str] = None

    # Campos oficiales SAT / CSF
    idcif: Optional[str] = None
    curp: Optional[str] = None
    razon_social: Optional[str] = None
    regimen_capital: Optional[str] = None
    fecha_inicio_operaciones: Optional[str] = None
    estatus_padron: Optional[str] = None
    fecha_ultimo_cambio_estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    entidad_federativa: Optional[str] = None
    colonia: Optional[str] = None
    tipo_vialidad: Optional[str] = None
    calle: Optional[str] = None
    numero_exterior: Optional[str] = None
    numero_interior: Optional[str] = None
    sat_url_validacion: Optional[str] = None
    sat_validado: Optional[bool] = None
    sat_raw_data: Optional[str] = None

class CompanyLocationUpdate(BaseModel):
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    municipio: Optional[str] = None

class CompanyShiftCreate(BaseModel):
    nombre: str
    hora_entrada: str
    hora_salida: str
    dias: Optional[str] = "Lunes a Sábado"
    tipo: Optional[str] = "Fijo"
    descripcion: Optional[str] = None

class CompanyShiftUpdate(BaseModel):
    nombre: Optional[str] = None
    hora_entrada: Optional[str] = None
    hora_salida: Optional[str] = None
    dias: Optional[str] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class InviteMemberRequest(BaseModel):
    email: str
    nombre: Optional[str] = None
    role: Optional[str] = "recruiter"  # "admin" | "recruiter"
    inviter_name: Optional[str] = None  # por defecto, el nombre del usuario autenticado
    inviter_email: Optional[str] = None  # ignorado: se usa el email del JWT
    origin_url: Optional[str] = None

class AcceptInvitationRequest(BaseModel):
    token: str
    user_email: Optional[str] = None  # ignorado: se usa el email del JWT
    user_name: Optional[str] = None


# --- ENDPOINTS ---
class VerificationCodeRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or "@" not in v:
            raise ValueError("Correo electrónico inválido.")
        return v


class VerifyCodeRequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or "@" not in v:
            raise ValueError("Correo electrónico inválido.")
        return v

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.strip()
        if not v or not v.isdigit() or len(v) != _CODE_LENGTH:
            raise ValueError(f"El código debe ser de {_CODE_LENGTH} dígitos.")
        return v


class ProfileSyncRequest(BaseModel):
    email: str
    nombre: str
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    role: Optional[str] = "candidate"
    empresa_nombre: Optional[str] = None
    session_id: Optional[str] = None
    municipio: Optional[str] = "Monterrey"
    nivel_educativo: Optional[str] = "Secundaria"
    tag_inea: Optional[bool] = False
    telefono: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower() if v else ""

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> str:
        allowed = {"candidate", "recruiter", "admin"}
        if v and v not in allowed:
            raise ValueError(f"Rol inválido. Permitidos: {', '.join(allowed)}")
        return v or "candidate"
class RouteStopIn(BaseModel):
    id: Optional[int] = None
    orden: int
    nombre: str
    horario: str
    latitud: float
    longitud: float
    colonia_referencia: Optional[str] = None
    referencia_visual: Optional[str] = None


class TransportRouteCreate(BaseModel):
    nombre: str
    turno: Optional[str] = "Turno 1 (Matutino)"
    color_hex: Optional[str] = "#059669"
    descripcion: Optional[str] = None
    activa: Optional[bool] = True
    hora_inicio: Optional[str] = None
    hora_llegada_planta: Optional[str] = None
    tiempo_estimado_min: Optional[int] = None
    stops: List[RouteStopIn] = []


class TransportRouteUpdate(BaseModel):
    nombre: Optional[str] = None
    turno: Optional[str] = None
    color_hex: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    hora_inicio: Optional[str] = None
    hora_llegada_planta: Optional[str] = None
    tiempo_estimado_min: Optional[int] = None
    stops: Optional[List[RouteStopIn]] = None




# ==========================================
# AUTH RESPONSE SCHEMAS
# ==========================================
class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: Optional[str] = None
    role: str = "candidate"
    empresa_nombre: Optional[str] = None
    telefono: Optional[str] = None
    municipio: Optional[str] = None
    colonia: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    ubicacion_confirmada: Optional[bool] = False
    nivel_educativo: Optional[str] = None
    avatar_url: Optional[str] = None
    tag_inea: Optional[bool] = False

    @field_validator("role", mode="before")
    @classmethod
    def default_role(cls, v):
        return v or "candidate"


class SendCodeResponse(BaseModel):
    status: str
    email: str
    real_email_sent: bool
    expires_in_minutes: int
    code_length: int
    message: str
    provider: Optional[str] = None
    error_detail: Optional[str] = None


class VerifyCodeResponse(BaseModel):
    status: str
    token: str
    user: AuthUserResponse


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=20, description="ID token (JWT) emitido por Google Identity Services")
    role: Optional[str] = "candidate"  # rol deseado solo para usuarios nuevos: candidate | recruiter

    @field_validator("role")
    @classmethod
    def _valid_role(cls, v: Optional[str]) -> str:
        v = (v or "candidate").strip().lower()
        return v if v in {"candidate", "recruiter"} else "candidate"


class AuthConfigResponse(BaseModel):
    google_client_id: Optional[str] = None


class ProfileSyncResponse(AuthUserResponse):
    status: str = "success"
    user_id: int


class RefreshTokenResponse(BaseModel):
    status: str = "success"
    token: str
    user: AuthUserResponse


# ==========================================
# COMPANY / TEAM / SHIFT RESPONSE SCHEMAS
# ==========================================
class StatusMessageResponse(BaseModel):
    status: str = "success"
    message: str


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    municipio: Optional[str] = None
    industria: Optional[str] = None
    rfc: Optional[str] = None
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    telefono_contacto: Optional[str] = None
    constancia_fiscal_url: Optional[str] = None
    estado_verificacion: str = "verificada"
    regimen_fiscal: Optional[str] = None
    created_by_email: Optional[str] = None
    created_at: Optional[datetime] = None
    members_count: int = 1
    # Metadatos oficiales del SAT / CSF
    idcif: Optional[str] = None
    curp: Optional[str] = None
    razon_social: Optional[str] = None
    regimen_capital: Optional[str] = None
    fecha_inicio_operaciones: Optional[str] = None
    estatus_padron: str = "ACTIVO"
    fecha_ultimo_cambio_estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    entidad_federativa: Optional[str] = None
    colonia: Optional[str] = None
    tipo_vialidad: Optional[str] = None
    calle: Optional[str] = None
    numero_exterior: Optional[str] = None
    numero_interior: Optional[str] = None
    sat_url_validacion: Optional[str] = None
    sat_validado: bool = False

    @field_validator("estado_verificacion", mode="before")
    @classmethod
    def default_estado(cls, v):
        return v or "verificada"

    @field_validator("estatus_padron", mode="before")
    @classmethod
    def default_padron(cls, v):
        return v or "ACTIVO"

    @field_validator("sat_validado", mode="before")
    @classmethod
    def default_sat_validado(cls, v):
        return bool(v)

    @field_validator("members_count", mode="before")
    @classmethod
    def min_members(cls, v):
        return max(int(v or 0), 1)

    @model_validator(mode="after")
    def derive_sat_validado(self):
        if not self.sat_validado and self.constancia_fiscal_url:
            self.sat_validado = True
        return self


class CompanyMutationResponse(StatusMessageResponse):
    company: CompanyResponse


class CompanyMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nombre: Optional[str] = None
    role: Optional[str] = "recruiter"
    status: Optional[str] = "active"
    invited_by_email: Optional[str] = None
    joined_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @model_validator(mode="after")
    def default_nombre(self):
        if not self.nombre and self.email:
            self.nombre = self.email.split("@")[0]
        return self


class CompanyInvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    email: str
    nombre: Optional[str] = None
    role: Optional[str] = "recruiter"
    token: str
    status: Optional[str] = "pending"
    invited_by: Optional[str] = Field(default=None, validation_alias="invited_by_email")
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class CompanyTeamResponse(BaseModel):
    company_id: int
    company_name: str
    active_members: List[CompanyMemberResponse]
    pending_invitations: List[CompanyInvitationResponse]
    total_members: int
    total_pending: int


class InviteMemberResponse(StatusMessageResponse):
    token: str
    invite_url: str
    email_sent: bool = False
    email_provider: Optional[str] = None
    email_error: Optional[str] = None


class CompanyBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    municipio: Optional[str] = None
    industria: Optional[str] = None


class AcceptInvitationResponse(StatusMessageResponse):
    company: CompanyBriefResponse
    member: CompanyMemberResponse


class InvitationLookupResponse(BaseModel):
    """Datos públicos de una invitación (el token es el secreto). Sirve para guiar el acceso del invitado."""
    email: str
    nombre: Optional[str] = None
    role: str = "recruiter"
    status: str
    expired: bool = False
    has_account: bool = False
    company: CompanyBriefResponse
    inviter_name: Optional[str] = None
    inviter_email: Optional[str] = None


class CompanyShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    nombre: str
    hora_entrada: str
    hora_salida: str
    dias: str = "Lunes a Sábado"
    tipo: str = "Fijo"
    descripcion: Optional[str] = None
    activo: bool = True
    created_at: Optional[datetime] = None

    @field_validator("dias", mode="before")
    @classmethod
    def default_dias(cls, v):
        return v or "Lunes a Sábado"

    @field_validator("tipo", mode="before")
    @classmethod
    def default_tipo(cls, v):
        return v or "Fijo"


class CompanyShiftMutationResponse(StatusMessageResponse):
    shift: CompanyShiftResponse


class CsfUploadResponse(BaseModel):
    status: str = "success"
    filename: str
    file_url: str
    sat_validado: bool = False
    qr_detectado: bool = False
    sat_data: Dict[str, Any]
    message: str


# ==========================================
# TRANSPORT ROUTES RESPONSE SCHEMAS
# ==========================================
class RouteStopResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    route_id: int
    orden: int
    nombre: str
    horario: str
    latitud: float
    longitud: float
    colonia_referencia: Optional[str] = None
    referencia_visual: Optional[str] = None


class RouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    empresa_nombre: Optional[str] = None
    nombre: str
    turno: Optional[str] = None
    color_hex: str = "#059669"
    descripcion: Optional[str] = None
    activa: bool = True
    hora_inicio: Optional[str] = None
    hora_llegada_planta: Optional[str] = None
    tiempo_estimado_min: Optional[int] = None
    total_stops: int = 0
    stops: List[RouteStopResponse] = []
    created_at: Optional[datetime] = None

    @field_validator("color_hex", mode="before")
    @classmethod
    def default_color(cls, v):
        return v or "#059669"

    @field_validator("activa", mode="before")
    @classmethod
    def default_activa(cls, v):
        return True if v is None else bool(v)

    @model_validator(mode="after")
    def derive_from_stops(self):
        # Paradas siempre ordenadas por 'orden'
        self.stops = sorted(self.stops, key=lambda s: s.orden)
        self.total_stops = len(self.stops)
        if self.stops and not self.hora_inicio:
            self.hora_inicio = self.stops[0].horario
        if len(self.stops) > 1 and not self.hora_llegada_planta:
            self.hora_llegada_planta = self.stops[-1].horario
        if not self.tiempo_estimado_min:
            self.tiempo_estimado_min = len(self.stops) * 12 if self.stops else 30
        return self


class RouteMutationResponse(StatusMessageResponse):
    route: RouteResponse


class NearbyStopsResponse(BaseModel):
    total_encontradas: int
    stops_cercanas: List[Dict[str, Any]]
