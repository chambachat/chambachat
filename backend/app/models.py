from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    codigo_postal = Column(String(10), nullable=True)
    municipio = Column(String(100), nullable=True)
    nivel_educativo = Column(String(50), nullable=False, default="Secundaria")
    tag_inea = Column(Boolean, default=False, index=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    sueldo_deseado = Column(Float, nullable=True)
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
