from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    role = Column(String(50), default="candidate", index=True)  # "candidate" | "recruiter" | "admin"
    empresa_nombre = Column(String(255), nullable=True)  # Empresa asignada si es reclutador
    telefono = Column(String(50), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
    municipio = Column(String(100), nullable=True)
    nivel_educativo = Column(String(50), nullable=False, default="Secundaria")
    tag_inea = Column(Boolean, default=False, index=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    sueldo_deseado = Column(Float, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    google_id = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    hiring_records = relationship("HiringHistory", back_populates="user", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, default=1)
    empresa_nombre = Column(String(255), default="Manufactura Monterrey")
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    sueldo_semanal_libre = Column(Float, nullable=False)
    turnos_fijos = Column(Boolean, default=False)
    apoyo_inea = Column(Boolean, default=False, index=True)
    transporte_incluido = Column(Boolean, default=True)
    municipio = Column(String(100), nullable=False)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    hiring_records = relationship("HiringHistory", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")


class HiringHistory(Base):
    __tablename__ = "hiring_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True)
    sueldo_inicial = Column(Float, nullable=False)
    tiempo_traslado_min = Column(Integer, nullable=False)
    turnos_fijos = Column(Boolean, default=False)
    apoyo_inea = Column(Boolean, default=False)
    fecha_contratacion = Column(Date, default=date.today)
    fecha_baja = Column(Date, nullable=True)
    meses_permanencia = Column(Float, nullable=False, index=True)
    motivo_baja = Column(String(255), nullable=True)

    user = relationship("User", back_populates="hiring_records")
    job = relationship("Job", back_populates="hiring_records")


class BotFlowConfig(Base):
    __tablename__ = "bot_flow_config"

    step_key = Column(String(50), primary_key=True)
    step_order = Column(Integer, nullable=False)
    titulo_admin = Column(String(100), nullable=False)
    prompt_texto = Column(Text, nullable=False)
    opciones_json = Column(Text, default="[]")  # JSON string of buttons/options
    activo = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    session_id = Column(String(100), primary_key=True)
    current_step = Column(String(50), default="welcome")
    collected_data = Column(Text, default="{}")  # JSON string
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(100), nullable=True, index=True)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=True)
    candidate_phone = Column(String(50), nullable=True)
    municipio = Column(String(100), nullable=True)
    status = Column(String(50), default="Pendiente")  # Pendiente, Contactado, En Proceso, Contratado
    match_score = Column(Integer, default=85)  # Compatibilidad IA 0 - 100%
    bot_silenced = Column(Boolean, default=False)
    last_candidate_message_at = Column(DateTime, nullable=True)
    last_recruiter_message_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="applications")
    messages = relationship("ApplicationMessage", back_populates="application", cascade="all, delete-orphan")


class ApplicationMessage(Base):
    __tablename__ = "application_messages"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)  # 'recruiter' | 'candidate'
    sender_name = Column(String(255), nullable=False)
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("JobApplication", back_populates="messages")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False, index=True)
    rfc = Column(String(50), nullable=True)
    industria = Column(String(100), default="Manufactura y Logística")
    municipio = Column(String(100), default="Apodaca")
    direccion = Column(Text, nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    telefono_contacto = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)
    constancia_fiscal_url = Column(String(500), nullable=True)
    estado_verificacion = Column(String(50), default="verificada")  # "verificada" | "pendiente_revision"
    regimen_fiscal = Column(String(100), nullable=True)
    
    # Campos oficiales extraídos del SAT / Constancia Fiscal
    idcif = Column(String(50), nullable=True)
    curp = Column(String(20), nullable=True)
    razon_social = Column(String(255), nullable=True)
    regimen_capital = Column(String(150), nullable=True)
    fecha_inicio_operaciones = Column(String(50), nullable=True)
    estatus_padron = Column(String(50), nullable=True)  # "ACTIVO", "SUSPENDIDO", etc.
    fecha_ultimo_cambio_estado = Column(String(50), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
    entidad_federativa = Column(String(100), nullable=True)
    colonia = Column(String(150), nullable=True)
    tipo_vialidad = Column(String(50), nullable=True)
    calle = Column(String(255), nullable=True)
    numero_exterior = Column(String(50), nullable=True)
    numero_interior = Column(String(50), nullable=True)
    sat_url_validacion = Column(String(500), nullable=True)
    sat_validado = Column(Boolean, default=False)
    sat_raw_data = Column(Text, nullable=True)  # JSON con metadatos completos

    created_by_email = Column(String(255), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("CompanyMember", back_populates="company", cascade="all, delete-orphan")
    invitations = relationship("CompanyInvitation", back_populates="company", cascade="all, delete-orphan")
    routes = relationship("TransportRoute", back_populates="company", cascade="all, delete-orphan")
    shifts = relationship("CompanyShift", back_populates="company", cascade="all, delete-orphan", order_by="CompanyShift.id")



class CompanyMember(Base):
    __tablename__ = "company_members"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), nullable=False, index=True)
    nombre = Column(String(255), nullable=True)
    role = Column(String(50), default="recruiter")  # "admin" | "recruiter"
    status = Column(String(50), default="active")  # "active" | "pending"
    invited_by_email = Column(String(255), nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="members")


class CompanyInvitation(Base):
    __tablename__ = "company_invitations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    nombre = Column(String(255), nullable=True)
    role = Column(String(50), default="recruiter")  # "admin" | "recruiter"
    token = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(50), default="pending")  # "pending" | "accepted" | "revoked"
    invited_by_email = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    company = relationship("Company", back_populates="invitations")


class TransportRoute(Base):
    __tablename__ = "transport_routes"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    turno = Column(String(100), default="Turno 1 (Matutino)")
    color_hex = Column(String(20), default="#059669")
    descripcion = Column(Text, nullable=True)
    activa = Column(Boolean, default=True)
    hora_inicio = Column(String(20), nullable=True)
    hora_llegada_planta = Column(String(20), nullable=True)
    tiempo_estimado_min = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="routes")
    stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan", order_by="RouteStop.orden")


class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False, index=True)
    orden = Column(Integer, nullable=False, default=1)
    nombre = Column(String(255), nullable=False)
    horario = Column(String(20), nullable=False)  # ej. "05:45 AM"
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    colonia_referencia = Column(String(255), nullable=True)
    referencia_visual = Column(String(255), nullable=True)
    route = relationship("TransportRoute", back_populates="stops")


class CompanyShift(Base):
    __tablename__ = "company_shifts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(100), nullable=False)  # ej. "Turno 1 - Matutino"
    hora_entrada = Column(String(20), nullable=False)  # ej. "06:00" o "06:00 AM"
    hora_salida = Column(String(20), nullable=False)   # ej. "14:00" o "02:00 PM"
    dias = Column(String(100), nullable=True, default="Lunes a Sábado")  # ej. "Lunes a Sábado", "Lunes a Viernes", "4x3"
    tipo = Column(String(50), nullable=True, default="Fijo")  # "Fijo", "Rolado", "Administrativo", "Especial"
    descripcion = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="shifts")


