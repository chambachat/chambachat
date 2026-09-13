import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, CompanyMember, CompanyInvitation, User
from app.services.email_service import send_team_invitation_email

router = APIRouter(prefix="/api/v1/companies", tags=["Companies & Team"])

# --- SCHEMAS ---

class CompanyCreate(BaseModel):
    nombre: str
    municipio: Optional[str] = "Apodaca"
    industria: Optional[str] = "Manufactura y Logística"
    rfc: Optional[str] = None
    direccion: Optional[str] = None
    telefono_contacto: Optional[str] = None
    creator_email: str
    creator_name: Optional[str] = None

class CompanyUpdate(BaseModel):
    nombre: Optional[str] = None
    municipio: Optional[str] = None
    industria: Optional[str] = None
    rfc: Optional[str] = None
    direccion: Optional[str] = None
    telefono_contacto: Optional[str] = None

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

@router.get("")
def list_user_companies(
    user_email: Optional[str] = Query(None),
    empresa_hint: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lista las empresas donde el usuario es miembro o creador.
    Si el usuario aún no tiene ninguna registrada, crea su empresa inicial
    a partir de su empresa_hint (ej. 'Kia Mobis Logistics') para que inicie de inmediato.
    """
    clean_email = user_email.strip().lower() if user_email else None
    
    user_companies = []
    if clean_email:
        memberships = db.query(CompanyMember).filter(
            CompanyMember.email == clean_email,
            CompanyMember.status == "active"
        ).all()
        comp_ids = [m.company_id for m in memberships]
        if comp_ids:
            user_companies = db.query(Company).filter(Company.id.in_(comp_ids)).all()

    # Si no tiene empresas asociadas y proporcionó correo, auto-inicializamos su primera empresa
    if not user_companies and clean_email:
        init_name = empresa_hint or "Kia Mobis Logistics"
        existing = db.query(Company).filter(Company.nombre == init_name).first()
        if not existing:
            existing = Company(
                nombre=init_name,
                municipio="Apodaca",
                industria="Manufactura y Logística",
                created_by_email=clean_email
            )
            db.add(existing)
            db.commit()
            db.refresh(existing)

        # Vincularlo como Admin de esta empresa
        member = db.query(CompanyMember).filter(
            CompanyMember.company_id == existing.id,
            CompanyMember.email == clean_email
        ).first()
        if not member:
            member = CompanyMember(
                company_id=existing.id,
                email=clean_email,
                nombre=clean_email.split('@')[0].capitalize(),
                role="admin",
                status="active"
            )
            db.add(member)
            db.commit()

        user_companies = [existing]

    # Si aún así no hay empresas en el sistema (modo invitado), traer las empresas principales
    if not user_companies:
        user_companies = db.query(Company).limit(10).all()
        if not user_companies:
            default_c = Company(
                nombre="Kia Mobis Logistics",
                municipio="Pesquería",
                industria="Automotriz",
                created_by_email="sistema@chambachat.com"
            )
            db.add(default_c)
            db.commit()
            db.refresh(default_c)
            user_companies = [default_c]

    result = []
    for c in user_companies:
        members_count = db.query(CompanyMember).filter(
            CompanyMember.company_id == c.id,
            CompanyMember.status == "active"
        ).count()
        result.append({
            "id": c.id,
            "nombre": c.nombre,
            "municipio": c.municipio,
            "industria": c.industria,
            "rfc": c.rfc,
            "direccion": c.direccion,
            "telefono_contacto": c.telefono_contacto,
            "created_by_email": c.created_by_email,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "members_count": max(members_count, 1)
        })

    return result


@router.post("")
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
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
        telefono_contacto=payload.telefono_contacto,
        created_by_email=clean_email
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
        "company": {
            "id": company.id,
            "nombre": company.nombre,
            "municipio": company.municipio,
            "industria": company.industria,
            "rfc": company.rfc,
            "direccion": company.direccion,
            "telefono_contacto": company.telefono_contacto,
            "members_count": 1
        }
    }


@router.put("/{company_id}")
def update_company(company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db)):
    """
    Actualiza la configuración de una empresa/planta existente.
    """
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
    if payload.telefono_contacto is not None:
        company.telefono_contacto = payload.telefono_contacto.strip()

    db.commit()
    db.refresh(company)

    return {
        "status": "success",
        "message": "Empresa actualizada correctamente",
        "company": {
            "id": company.id,
            "nombre": company.nombre,
            "municipio": company.municipio,
            "industria": company.industria,
            "rfc": company.rfc,
            "direccion": company.direccion,
            "telefono_contacto": company.telefono_contacto
        }
    }


@router.get("/{company_id}/members")
def get_company_team(company_id: int, db: Session = Depends(get_db)):
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
def accept_team_invitation(payload: AcceptInvitationRequest, db: Session = Depends(get_db)):
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
def remove_team_member(company_id: int, member_id: int, db: Session = Depends(get_db)):
    """
    Elimina a un miembro del equipo o cancela una invitación.
    """
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
