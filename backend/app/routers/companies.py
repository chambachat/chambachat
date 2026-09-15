import os
import json
import shutil
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, CompanyMember, CompanyInvitation, User, CompanyShift
from app.dependencies import get_current_user, get_current_user_optional, require_company_member
from app.services.email_service import send_team_invitation_email
from app.services.sat_service import process_csf_document

router = APIRouter(prefix="/api/v1/companies", tags=["Companies & Team"])

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
    creator_email: str
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
    inviter_name: str
    inviter_email: str
    origin_url: Optional[str] = None

class AcceptInvitationRequest(BaseModel):
    token: str
    user_email: str
    user_name: Optional[str] = None


# --- ENDPOINTS ---

@router.post("/upload-csf")
def upload_constancia_fiscal(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """
    Recibe y procesa la Constancia de Situación Fiscal (CSF) emitida por el SAT (PDF o Imagen).
    Extrae y decodifica el código QR para validar con el portal del SAT (siat.sat.gob.mx),
    y analiza la capa de texto del PDF para extraer todos los datos fiscales.
    """
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "csf")
    os.makedirs(upload_dir, exist_ok=True)
    clean_filename = f"csf_{secrets.token_hex(4)}_{file.filename.replace(' ', '_')}"
    filepath = os.path.join(upload_dir, clean_filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_url = f"/uploads/csf/{clean_filename}"

    # Procesar documento con sat_service
    sat_data = process_csf_document(filepath, filename=file.filename)

    label = sat_data.get("tipo_documento_label", "Constancia Fiscal")
    msg = f"{label} procesada y validada con el SAT exitosamente" if sat_data.get("sat_validado") else "Documento fiscal cargado correctamente"

    return {
        "status": "success",
        "filename": file.filename,
        "file_url": file_url,
        "sat_validado": sat_data.get("sat_validado", False),
        "qr_detectado": sat_data.get("qr_detectado", False),
        "sat_data": sat_data,
        "message": msg
    }


def serialize_company(c: Company, members_count: int = 1) -> dict:
    return {
        "id": c.id,
        "nombre": c.nombre,
        "municipio": c.municipio,
        "industria": c.industria,
        "rfc": c.rfc,
        "direccion": c.direccion,
        "latitud": c.latitud,
        "longitud": c.longitud,
        "telefono_contacto": c.telefono_contacto,
        "constancia_fiscal_url": c.constancia_fiscal_url,
        "estado_verificacion": c.estado_verificacion or "verificada",
        "regimen_fiscal": c.regimen_fiscal,
        "created_by_email": c.created_by_email,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "members_count": max(members_count, 1),
        # Metadatos oficiales del SAT / CSF
        "idcif": c.idcif,
        "curp": c.curp,
        "razon_social": c.razon_social,
        "regimen_capital": c.regimen_capital,
        "fecha_inicio_operaciones": c.fecha_inicio_operaciones,
        "estatus_padron": c.estatus_padron or "ACTIVO",
        "fecha_ultimo_cambio_estado": c.fecha_ultimo_cambio_estado,
        "codigo_postal": c.codigo_postal,
        "entidad_federativa": c.entidad_federativa,
        "colonia": c.colonia,
        "tipo_vialidad": c.tipo_vialidad,
        "calle": c.calle,
        "numero_exterior": c.numero_exterior,
        "numero_interior": c.numero_interior,
        "sat_url_validacion": c.sat_url_validacion,
        "sat_validado": c.sat_validado or bool(c.constancia_fiscal_url)
    }

@router.get("")
def list_user_companies(
    user_email: Optional[str] = Query(None),
    empresa_hint: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lista las empresas donde el usuario es miembro activo.
    Si el usuario aún no tiene ninguna registrada, retorna lista vacía para
    que complete el formulario de alta de empresa y suba su Constancia de Situación Fiscal (CSF).
    """
    clean_email = user_email.strip().lower() if user_email else None
    
    if clean_email:
        memberships = db.query(CompanyMember).filter(
            CompanyMember.email == clean_email,
            CompanyMember.status == "active"
        ).all()
        comp_ids = [m.company_id for m in memberships]
        if comp_ids:
            user_companies = db.query(Company).filter(Company.id.in_(comp_ids)).all()
        else:
            user_companies = []

        result = []
        for c in user_companies:
            members_count = db.query(CompanyMember).filter(
                CompanyMember.company_id == c.id,
                CompanyMember.status == "active"
            ).count()
            result.append(serialize_company(c, members_count))
        return result

    # Modo general (sin filtro por usuario): devolver empresas registradas
    all_companies = db.query(Company).limit(20).all()
    result = []
    for c in all_companies:
        members_count = db.query(CompanyMember).filter(
            CompanyMember.company_id == c.id,
            CompanyMember.status == "active"
        ).count()
        result.append(serialize_company(c, members_count))

    return result


@router.post("")
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Crea una nueva empresa o planta industrial y registra al creador como Administrador.
    """
    clean_email = payload.creator_email.strip().lower()
    clean_name = payload.nombre.strip()

    company = Company(
        nombre=clean_name,
        municipio=payload.municipio or "Apodaca",
        industria=payload.industria or "Manufactura y Logística",
        rfc=payload.rfc,
        direccion=payload.direccion,
        latitud=payload.latitud,
        longitud=payload.longitud,
        telefono_contacto=payload.telefono_contacto,
        constancia_fiscal_url=payload.constancia_fiscal_url,
        regimen_fiscal=payload.regimen_fiscal,
        estado_verificacion="verificada" if (payload.constancia_fiscal_url or payload.sat_validado) else "pendiente_revision",
        created_by_email=clean_email,
        # Campos SAT oficiales
        idcif=payload.idcif,
        curp=payload.curp,
        razon_social=payload.razon_social,
        regimen_capital=payload.regimen_capital,
        fecha_inicio_operaciones=payload.fecha_inicio_operaciones,
        estatus_padron=payload.estatus_padron or "ACTIVO",
        fecha_ultimo_cambio_estado=payload.fecha_ultimo_cambio_estado,
        codigo_postal=payload.codigo_postal,
        entidad_federativa=payload.entidad_federativa,
        colonia=payload.colonia,
        tipo_vialidad=payload.tipo_vialidad,
        calle=payload.calle,
        numero_exterior=payload.numero_exterior,
        numero_interior=payload.numero_interior,
        sat_url_validacion=payload.sat_url_validacion,
        sat_validado=payload.sat_validado or bool(payload.constancia_fiscal_url),
        sat_raw_data=payload.sat_raw_data
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # Registrar al creador como Administrador en company_members
    creator_user = db.query(User).filter(User.email == clean_email).first()
    member = CompanyMember(
        company_id=company.id,
        user_id=creator_user.id if creator_user else None,
        email=clean_email,
        nombre=payload.creator_name or (creator_user.nombre if creator_user else clean_email.split('@')[0]),
        role="admin",
        status="active"
    )
    db.add(member)

    # Si el usuario no tenía empresa asignada en su perfil, actualizarla
    if creator_user and not creator_user.empresa_nombre:
        creator_user.empresa_nombre = clean_name

    db.commit()

    return {
        "status": "success",
        "message": f"Empresa {clean_name} registrada exitosamente",
        "company": serialize_company(company, 1)
    }


@router.put("/{company_id}")
def update_company(company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Actualiza la configuración de una empresa/planta existente."""
    require_company_member(company_id, current_user, db)

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if payload.nombre is not None:
        company.nombre = payload.nombre.strip()
    if payload.municipio is not None:
        company.municipio = payload.municipio.strip()
    if payload.industria is not None:
        company.industria = payload.industria.strip()
    if payload.rfc is not None:
        company.rfc = payload.rfc.strip()
    if payload.direccion is not None:
        company.direccion = payload.direccion.strip()
    if payload.latitud is not None:
        company.latitud = payload.latitud
    if payload.longitud is not None:
        company.longitud = payload.longitud
    if payload.telefono_contacto is not None:
        company.telefono_contacto = payload.telefono_contacto.strip()
    if payload.constancia_fiscal_url is not None:
        company.constancia_fiscal_url = payload.constancia_fiscal_url
        company.estado_verificacion = "verificada"
    if payload.regimen_fiscal is not None:
        company.regimen_fiscal = payload.regimen_fiscal.strip()

    # Campos SAT opcionales
    if payload.idcif is not None:
        company.idcif = payload.idcif
    if payload.curp is not None:
        company.curp = payload.curp
    if payload.razon_social is not None:
        company.razon_social = payload.razon_social
    if payload.regimen_capital is not None:
        company.regimen_capital = payload.regimen_capital
    if payload.fecha_inicio_operaciones is not None:
        company.fecha_inicio_operaciones = payload.fecha_inicio_operaciones
    if payload.estatus_padron is not None:
        company.estatus_padron = payload.estatus_padron
    if payload.fecha_ultimo_cambio_estado is not None:
        company.fecha_ultimo_cambio_estado = payload.fecha_ultimo_cambio_estado
    if payload.codigo_postal is not None:
        company.codigo_postal = payload.codigo_postal
    if payload.entidad_federativa is not None:
        company.entidad_federativa = payload.entidad_federativa
    if payload.colonia is not None:
        company.colonia = payload.colonia
    if payload.tipo_vialidad is not None:
        company.tipo_vialidad = payload.tipo_vialidad
    if payload.calle is not None:
        company.calle = payload.calle
    if payload.numero_exterior is not None:
        company.numero_exterior = payload.numero_exterior
    if payload.numero_interior is not None:
        company.numero_interior = payload.numero_interior
    if payload.sat_url_validacion is not None:
        company.sat_url_validacion = payload.sat_url_validacion
    if payload.sat_validado is not None:
        company.sat_validado = payload.sat_validado
    if payload.sat_raw_data is not None:
        company.sat_raw_data = payload.sat_raw_data

    db.commit()
    db.refresh(company)

    return {
        "status": "success",
        "message": "Empresa actualizada correctamente",
        "company": serialize_company(company)
    }


@router.patch("/{company_id}/location")
def update_company_location(company_id: int, payload: CompanyLocationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Actualiza las coordenadas GPS (latitud, longitud) y opcionalmente dirección y municipio de la planta."""
    require_company_member(company_id, current_user, db)
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    company.latitud = payload.latitud
    company.longitud = payload.longitud
    if payload.direccion is not None:
        company.direccion = payload.direccion.strip()
    if payload.municipio is not None:
        company.municipio = payload.municipio.strip()

    db.commit()
    db.refresh(company)

    return {
        "status": "success",
        "message": "Ubicación de planta actualizada exitosamente",
        "company": serialize_company(company)
    }



@router.get("/{company_id}/members")
def get_company_team(company_id: int, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Retorna la lista de miembros activos e invitaciones pendientes de una empresa.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # Miembros activos
    members = db.query(CompanyMember).filter(CompanyMember.company_id == company_id).all()
    active_list = []
    for m in members:
        active_list.append({
            "id": m.id,
            "email": m.email,
            "nombre": m.nombre or m.email.split('@')[0],
            "role": m.role,
            "status": m.status,
            "invited_by_email": m.invited_by_email,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    # Invitaciones pendientes
    invites = db.query(CompanyInvitation).filter(
        CompanyInvitation.company_id == company_id,
        CompanyInvitation.status == "pending"
    ).all()
    pending_list = []
    for inv in invites:
        pending_list.append({
            "id": inv.id,
            "email": inv.email,
            "nombre": inv.nombre,
            "role": inv.role,
            "token": inv.token,
            "status": inv.status,
            "invited_by": inv.invited_by_email,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None
        })

    return {
        "company_id": company.id,
        "company_name": company.nombre,
        "active_members": active_list,
        "pending_invitations": pending_list,
        "total_members": len(active_list),
        "total_pending": len(pending_list)
    }


@router.post("/{company_id}/invite")
def invite_team_member(company_id: int, payload: InviteMemberRequest, db: Session = Depends(get_db)):
    """
    Envía una invitación por correo electrónico a un reclutador para unirse a la empresa.
    Genera un token seguro y despacha el correo mediante Resend/SMTP.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    clean_email = payload.email.strip().lower()

    # Verificar si ya es miembro activo
    existing_member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.email == clean_email,
        CompanyMember.status == "active"
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail=f"El correo {clean_email} ya es miembro activo de {company.nombre}")

    # Generar token de invitación (6 dígitos o token alfanumérico seguro)
    token = f"inv_{secrets.token_hex(6)}"
    expires_at = datetime.utcnow() + timedelta(days=7)

    # Eliminar invitaciones pendientes anteriores para el mismo correo en esta empresa
    db.query(CompanyInvitation).filter(
        CompanyInvitation.company_id == company_id,
        CompanyInvitation.email == clean_email
    ).delete()

    invitation = CompanyInvitation(
        company_id=company_id,
        email=clean_email,
        nombre=payload.nombre.strip() if payload.nombre else clean_email.split('@')[0],
        role=payload.role or "recruiter",
        token=token,
        status="pending",
        invited_by_email=payload.inviter_email.strip().lower(),
        expires_at=expires_at
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # Construir enlace de invitación
    origin = payload.origin_url or "https://chambachat.onrender.com"
    invite_url = f"{origin.rstrip('/')}/?invitacion={token}"

    # Despachar correo electrónico real
    email_res = send_team_invitation_email(
        to_email=clean_email,
        inviter_name=payload.inviter_name,
        company_name=company.nombre,
        role=payload.role or "recruiter",
        token=token,
        invite_url=invite_url
    )

    return {
        "status": "success",
        "message": f"Invitación enviada a {clean_email}",
        "token": token,
        "invite_url": invite_url,
        "email_sent": email_res.get("sent", False),
        "email_provider": email_res.get("provider"),
        "email_error": email_res.get("error")
    }


@router.post("/accept-invitation")
def accept_team_invitation(payload: AcceptInvitationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Acepta una invitación mediante su token y asocia al usuario a la empresa.
    """
    clean_token = payload.token.strip()
    invitation = db.query(CompanyInvitation).filter(
        CompanyInvitation.token == clean_token,
        CompanyInvitation.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no válida o ya utilizada")

    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        invitation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Esta invitación ha expirado. Solicita una nueva al administrador.")

    company = db.query(Company).filter(Company.id == invitation.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    clean_email = payload.user_email.strip().lower()
    clean_name = payload.user_name.strip() if payload.user_name else clean_email.split('@')[0]

    # Buscar usuario registrado en users
    user = db.query(User).filter(User.email == clean_email).first()
    if user:
        user.empresa_nombre = company.nombre
        user.role = "recruiter"

    # Buscar o crear CompanyMember
    member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company.id,
        CompanyMember.email == clean_email
    ).first()

    if not member:
        member = CompanyMember(
            company_id=company.id,
            user_id=user.id if user else None,
            email=clean_email,
            nombre=clean_name,
            role=invitation.role,
            status="active",
            invited_by_email=invitation.invited_by_email,
            joined_at=datetime.utcnow()
        )
        db.add(member)
    else:
        member.status = "active"
        member.role = invitation.role
        member.joined_at = datetime.utcnow()
        if user:
            member.user_id = user.id

    invitation.status = "accepted"
    db.commit()

    return {
        "status": "success",
        "message": f"¡Te has unido exitosamente al equipo de {company.nombre}!",
        "company": {
            "id": company.id,
            "nombre": company.nombre,
            "municipio": company.municipio,
            "industria": company.industria
        },
        "member": {
            "email": member.email,
            "nombre": member.nombre,
            "role": member.role,
            "status": member.status
        }
    }


@router.delete("/{company_id}/members/{member_id}")
def remove_team_member(company_id: int, member_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Elimina a un miembro del equipo o cancela una invitación."""
    require_company_member(company_id, current_user, db)
    # Buscar si es un miembro
    member = db.query(CompanyMember).filter(
        CompanyMember.id == member_id,
        CompanyMember.company_id == company_id
    ).first()
    if member:
        db.delete(member)
        db.commit()
        return {"status": "success", "message": "Miembro eliminado del equipo"}

    # Buscar si es una invitación pendiente
    invitation = db.query(CompanyInvitation).filter(
        CompanyInvitation.id == member_id,
        CompanyInvitation.company_id == company_id
    ).first()
    if invitation:
        invitation.status = "revoked"
        db.delete(invitation)
        db.commit()
        return {"status": "success", "message": "Invitación revocada"}

    raise HTTPException(status_code=404, detail="Miembro o invitación no encontrada")


# --- GESTIÓN DE TURNOS LABORALES DE PLANTA ---

DEFAULT_INDUSTRIAL_SHIFTS = [
    {
        "nombre": "Turno 1 (Matutino)",
        "hora_entrada": "06:00",
        "hora_salida": "14:00",
        "dias": "Lunes a Sábado",
        "tipo": "Fijo",
        "descripcion": "Turno matutino estándar para manufactura y ensamble"
    },
    {
        "nombre": "Turno 2 (Vespertino)",
        "hora_entrada": "14:00",
        "hora_salida": "21:30",
        "dias": "Lunes a Sábado",
        "tipo": "Fijo",
        "descripcion": "Turno vespertino industrial"
    },
    {
        "nombre": "Turno 3 (Nocturno)",
        "hora_entrada": "21:30",
        "hora_salida": "06:00",
        "dias": "Lunes a Viernes",
        "tipo": "Fijo",
        "descripcion": "Turno nocturno con transporte a planta"
    },
    {
        "nombre": "Turno Mixto / Rolado",
        "hora_entrada": "07:00",
        "hora_salida": "19:00",
        "dias": "4x3 (Jornada 12 Horas)",
        "tipo": "Rolado",
        "descripcion": "4 días de trabajo por 3 de descanso"
    },
    {
        "nombre": "Turno Administrativo",
        "hora_entrada": "08:00",
        "hora_salida": "17:30",
        "dias": "Lunes a Viernes",
        "tipo": "Administrativo",
        "descripcion": "Horario de oficinas, almacén central y soporte"
    }
]

def serialize_shift(s: CompanyShift) -> dict:
    return {
        "id": s.id,
        "company_id": s.company_id,
        "nombre": s.nombre,
        "hora_entrada": s.hora_entrada,
        "hora_salida": s.hora_salida,
        "dias": s.dias or "Lunes a Sábado",
        "tipo": s.tipo or "Fijo",
        "descripcion": s.descripcion,
        "activo": s.activo,
        "created_at": s.created_at.isoformat() if s.created_at else None
    }

@router.get("/{company_id}/shifts")
def get_company_shifts(company_id: int, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Obtiene los turnos laborales dados de alta para esta empresa.
    Si la empresa aún no tiene turnos registrados, inicializa los turnos base industriales de NL.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    shifts = db.query(CompanyShift).filter(
        CompanyShift.company_id == company_id,
        CompanyShift.activo == True
    ).order_by(CompanyShift.id).all()

    if not shifts:
        for ds in DEFAULT_INDUSTRIAL_SHIFTS:
            new_s = CompanyShift(
                company_id=company_id,
                nombre=ds["nombre"],
                hora_entrada=ds["hora_entrada"],
                hora_salida=ds["hora_salida"],
                dias=ds["dias"],
                tipo=ds["tipo"],
                descripcion=ds["descripcion"],
                activo=True
            )
            db.add(new_s)
        db.commit()
        shifts = db.query(CompanyShift).filter(
            CompanyShift.company_id == company_id,
            CompanyShift.activo == True
        ).order_by(CompanyShift.id).all()

    return [serialize_shift(s) for s in shifts]

@router.post("/{company_id}/shifts")
def create_company_shift(company_id: int, payload: CompanyShiftCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Registra un nuevo turno laboral para la empresa."""
    require_company_member(company_id, current_user, db)
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    shift = CompanyShift(
        company_id=company_id,
        nombre=payload.nombre.strip(),
        hora_entrada=payload.hora_entrada.strip(),
        hora_salida=payload.hora_salida.strip(),
        dias=payload.dias.strip() if payload.dias else "Lunes a Sábado",
        tipo=payload.tipo.strip() if payload.tipo else "Fijo",
        descripcion=payload.descripcion.strip() if payload.descripcion else None,
        activo=True
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return {
        "status": "success",
        "message": f"Turno '{shift.nombre}' registrado correctamente",
        "shift": serialize_shift(shift)
    }

@router.put("/{company_id}/shifts/{shift_id}")
def update_company_shift(company_id: int, shift_id: int, payload: CompanyShiftUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Actualiza la configuración y horarios de un turno laboral existente."""
    require_company_member(company_id, current_user, db)
    shift = db.query(CompanyShift).filter(
        CompanyShift.id == shift_id,
        CompanyShift.company_id == company_id
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    if payload.nombre is not None:
        shift.nombre = payload.nombre.strip()
    if payload.hora_entrada is not None:
        shift.hora_entrada = payload.hora_entrada.strip()
    if payload.hora_salida is not None:
        shift.hora_salida = payload.hora_salida.strip()
    if payload.dias is not None:
        shift.dias = payload.dias.strip()
    if payload.tipo is not None:
        shift.tipo = payload.tipo.strip()
    if payload.descripcion is not None:
        shift.descripcion = payload.descripcion.strip()
    if payload.activo is not None:
        shift.activo = payload.activo

    db.commit()
    db.refresh(shift)
    return {
        "status": "success",
        "message": "Turno actualizado correctamente",
        "shift": serialize_shift(shift)
    }

@router.delete("/{company_id}/shifts/{shift_id}")
def delete_company_shift(company_id: int, shift_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Elimina un turno laboral de la empresa."""
    require_company_member(company_id, current_user, db)
    shift = db.query(CompanyShift).filter(
        CompanyShift.id == shift_id,
        CompanyShift.company_id == company_id
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    db.delete(shift)
    db.commit()
    return {
        "status": "success",
        "message": f"Turno '{shift.nombre}' eliminado correctamente"
    }

