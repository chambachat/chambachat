import os
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_optional, require_company_member
from app.models import Company, CompanyDocument, CompanyInvitation, CompanyMember, CompanyShift, User
from app.schemas import (
    AcceptInvitationRequest,
    AcceptInvitationResponse,
    CompanyBriefResponse,
    CompanyCreate,
    CompanyInvitationResponse,
    CompanyLocationUpdate,
    CompanyMemberResponse,
    CompanyMutationResponse,
    CompanyResponse,
    CompanyShiftCreate,
    CompanyShiftMutationResponse,
    CompanyShiftResponse,
    CompanyShiftUpdate,
    CompanyTeamResponse,
    CompanyUpdate,
    CsfUploadResponse,
    InviteMemberRequest,
    InvitationLookupResponse,
    InviteMemberResponse,
    StatusMessageResponse,
)
from app.services.email_service import send_team_invitation_email
from app.services.sat_service import process_csf_document
from app.services.shifts_service import ensure_default_shifts

router = APIRouter(prefix="/api/v1/companies", tags=["Companies & Team"])

_DEFAULT_ORIGIN = "https://chambachat.onrender.com"


# --- HELPERS ---

def _get_company_or_404(db: Session, company_id: int) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return company


def _active_members_count(db: Session, company_id: int) -> int:
    return db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.status == "active",
    ).count()


def company_to_response(db: Session, company: Company) -> CompanyResponse:
    resp = CompanyResponse.model_validate(company)
    resp.members_count = max(_active_members_count(db, company.id), 1)
    return resp


# --- ENDPOINTS ---

_MAX_CSF_BYTES = 10 * 1024 * 1024  # 10 MB
_ALLOWED_CSF_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


@router.post("/upload-csf", response_model=CsfUploadResponse)
def upload_constancia_fiscal(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recibe y procesa la Constancia de Situación Fiscal (CSF) emitida por el SAT (PDF o Imagen).
    Extrae y decodifica el código QR para validar con el portal del SAT (siat.sat.gob.mx),
    y analiza la capa de texto del PDF para extraer todos los datos fiscales.
    El archivo se guarda en la base de datos (el disco del servidor es efímero).
    """
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(content) > _MAX_CSF_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10 MB.")

    original_name = os.path.basename(file.filename or "documento.pdf")
    content_type = file.content_type or "application/octet-stream"
    if content_type not in _ALLOWED_CSF_TYPES and not original_name.lower().endswith((".pdf", ".jpg", ".jpeg", ".png", ".webp")):
        raise HTTPException(status_code=400, detail="Formato no permitido. Sube un PDF o una imagen (JPG, PNG, WEBP).")

    stored_name = f"csf_{secrets.token_hex(12)}_{original_name.replace(' ', '_')}"
    db.add(CompanyDocument(
        filename=stored_name,
        original_name=original_name,
        content_type=content_type,
        size_bytes=len(content),
        data=content,
        uploaded_by_email=current_user.email,
    ))
    db.commit()

    sat_data = process_csf_document(content, filename=original_name)

    label = sat_data.get("tipo_documento_label", "Constancia Fiscal")
    msg = (
        f"{label} procesada y validada con el SAT exitosamente"
        if sat_data.get("sat_validado")
        else "Documento fiscal cargado correctamente"
    )

    return CsfUploadResponse(
        filename=original_name,
        file_url=f"/uploads/csf/{stored_name}",
        sat_validado=bool(sat_data.get("sat_validado", False)),
        qr_detectado=bool(sat_data.get("qr_detectado", False)),
        sat_data=sat_data,
        message=msg,
    )


@router.get("", response_model=List[CompanyResponse])
def list_user_companies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Lista las empresas donde el usuario autenticado es miembro activo.
    Si aún no tiene ninguna, devuelve lista vacía para que complete el alta con su CSF.
    """
    memberships = db.query(CompanyMember).filter(
        CompanyMember.email == current_user.email,
        CompanyMember.status == "active",
    ).all()
    comp_ids = [m.company_id for m in memberships]
    if not comp_ids:
        return []

    companies = db.query(Company).filter(Company.id.in_(comp_ids)).order_by(Company.id).all()
    return [company_to_response(db, c) for c in companies]


@router.post("", response_model=CompanyMutationResponse)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Crea una nueva empresa o planta industrial y registra al usuario autenticado como Administrador."""
    creator_email = current_user.email
    clean_name = payload.nombre.strip()

    fields = payload.model_dump(exclude={"creator_email", "creator_name", "nombre"})
    company = Company(
        nombre=clean_name,
        created_by_email=creator_email,
        estado_verificacion="verificada" if (payload.constancia_fiscal_url or payload.sat_validado) else "pendiente_revision",
        **{
            **fields,
            "municipio": payload.municipio or "Apodaca",
            "industria": payload.industria or "Manufactura y Logística",
            "estatus_padron": payload.estatus_padron or "ACTIVO",
            "sat_validado": bool(payload.sat_validado or payload.constancia_fiscal_url),
        },
    )
    db.add(company)
    db.flush()

    db.add(CompanyMember(
        company_id=company.id,
        user_id=current_user.id,
        email=creator_email,
        nombre=payload.creator_name or current_user.nombre or creator_email.split("@")[0],
        role="admin",
        status="active",
    ))

    if not current_user.empresa_nombre:
        current_user.empresa_nombre = clean_name

    db.commit()
    db.refresh(company)

    return CompanyMutationResponse(
        message=f"Empresa {clean_name} registrada exitosamente",
        company=company_to_response(db, company),
    )


@router.put("/{company_id}", response_model=CompanyMutationResponse)
def update_company(company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Actualiza la configuración de una empresa/planta existente."""
    require_company_member(company_id, current_user, db)
    company = _get_company_or_404(db, company_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    if payload.constancia_fiscal_url is not None:
        company.estado_verificacion = "verificada"

    db.commit()
    db.refresh(company)

    return CompanyMutationResponse(
        message="Empresa actualizada correctamente",
        company=company_to_response(db, company),
    )


@router.patch("/{company_id}/location", response_model=CompanyMutationResponse)
def update_company_location(company_id: int, payload: CompanyLocationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Actualiza las coordenadas GPS (latitud, longitud) y opcionalmente dirección y municipio de la planta."""
    require_company_member(company_id, current_user, db)
    company = _get_company_or_404(db, company_id)

    company.latitud = payload.latitud
    company.longitud = payload.longitud
    if payload.direccion is not None:
        company.direccion = payload.direccion.strip()
    if payload.municipio is not None:
        company.municipio = payload.municipio.strip()

    db.commit()
    db.refresh(company)

    return CompanyMutationResponse(
        message="Ubicación de planta actualizada exitosamente",
        company=company_to_response(db, company),
    )


# --- EQUIPO E INVITACIONES ---

@router.get("/{company_id}/members", response_model=CompanyTeamResponse)
def get_company_team(company_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Miembros activos e invitaciones pendientes. Solo para miembros de la empresa (expone tokens de invitación)."""
    require_company_member(company_id, current_user, db)
    company = _get_company_or_404(db, company_id)

    members = db.query(CompanyMember).filter(CompanyMember.company_id == company_id).all()
    invites = db.query(CompanyInvitation).filter(
        CompanyInvitation.company_id == company_id,
        CompanyInvitation.status == "pending",
    ).all()

    active_list = [CompanyMemberResponse.model_validate(m) for m in members]
    pending_list = [CompanyInvitationResponse.model_validate(inv) for inv in invites]

    return CompanyTeamResponse(
        company_id=company.id,
        company_name=company.nombre,
        active_members=active_list,
        pending_invitations=pending_list,
        total_members=len(active_list),
        total_pending=len(pending_list),
    )


@router.post("/{company_id}/invite", response_model=InviteMemberResponse)
def invite_team_member(company_id: int, payload: InviteMemberRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Envía una invitación por correo a un reclutador para unirse a la empresa.
    Solo miembros activos de la empresa pueden invitar; el remitente es siempre el usuario autenticado.
    """
    require_company_member(company_id, current_user, db)
    company = _get_company_or_404(db, company_id)

    clean_email = payload.email.strip().lower()
    role = payload.role or "recruiter"

    existing_member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.email == clean_email,
        CompanyMember.status == "active",
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail=f"El correo {clean_email} ya es miembro activo de {company.nombre}")

    token = f"inv_{secrets.token_hex(6)}"

    db.query(CompanyInvitation).filter(
        CompanyInvitation.company_id == company_id,
        CompanyInvitation.email == clean_email,
    ).delete()

    invitation = CompanyInvitation(
        company_id=company_id,
        email=clean_email,
        nombre=payload.nombre.strip() if payload.nombre else clean_email.split("@")[0],
        role=role,
        token=token,
        status="pending",
        invited_by_email=current_user.email,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()

    origin = (payload.origin_url or _DEFAULT_ORIGIN).rstrip("/")
    invite_url = f"{origin}/?invitacion={token}"

    email_res = send_team_invitation_email(
        to_email=clean_email,
        inviter_name=payload.inviter_name or current_user.nombre or current_user.email,
        company_name=company.nombre,
        role=role,
        token=token,
        invite_url=invite_url,
    )

    return InviteMemberResponse(
        message=f"Invitación enviada a {clean_email}",
        token=token,
        invite_url=invite_url,
        email_sent=bool(email_res.get("sent", False)),
        email_provider=email_res.get("provider"),
        email_error=email_res.get("error"),
    )


@router.get("/invitations/{token}", response_model=InvitationLookupResponse)
def lookup_invitation(token: str, db: Session = Depends(get_db)):
    """
    Consulta pública de una invitación por su token (antes de iniciar sesión).
    Permite prellenar el correo del invitado y mostrar a qué empresa se une.
    """
    invitation = db.query(CompanyInvitation).filter(CompanyInvitation.token == token.strip()).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no válida. Pide al administrador que la vuelva a enviar.")

    company = _get_company_or_404(db, invitation.company_id)
    expired = bool(invitation.expires_at and invitation.expires_at < datetime.utcnow())
    inviter = db.query(User).filter(User.email == invitation.invited_by_email).first()
    has_account = db.query(User.id).filter(User.email == invitation.email).first() is not None

    return InvitationLookupResponse(
        email=invitation.email,
        nombre=invitation.nombre,
        role=invitation.role or "recruiter",
        status="expired" if expired and invitation.status == "pending" else invitation.status,
        expired=expired,
        has_account=has_account,
        company=CompanyBriefResponse.model_validate(company),
        inviter_name=inviter.nombre if inviter else None,
        inviter_email=invitation.invited_by_email,
    )


@router.post("/accept-invitation", response_model=AcceptInvitationResponse)
def accept_team_invitation(payload: AcceptInvitationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Acepta una invitación mediante su token y asocia al usuario autenticado a la empresa."""
    invitation = db.query(CompanyInvitation).filter(
        CompanyInvitation.token == payload.token.strip(),
        CompanyInvitation.status == "pending",
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no válida o ya utilizada")

    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        invitation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Esta invitación ha expirado. Solicita una nueva al administrador.")

    company = _get_company_or_404(db, invitation.company_id)

    # La invitación se acepta con la identidad del token, no con un correo arbitrario del body
    clean_email = current_user.email
    clean_name = (payload.user_name or "").strip() or current_user.nombre or clean_email.split("@")[0]

    current_user.empresa_nombre = company.nombre
    current_user.role = "recruiter"

    member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company.id,
        CompanyMember.email == clean_email,
    ).first()

    if not member:
        member = CompanyMember(
            company_id=company.id,
            user_id=current_user.id,
            email=clean_email,
            nombre=clean_name,
            role=invitation.role,
            status="active",
            invited_by_email=invitation.invited_by_email,
            joined_at=datetime.utcnow(),
        )
        db.add(member)
    else:
        member.status = "active"
        member.role = invitation.role
        member.joined_at = datetime.utcnow()
        member.user_id = current_user.id

    invitation.status = "accepted"
    db.commit()
    db.refresh(member)

    return AcceptInvitationResponse(
        message=f"¡Te has unido exitosamente al equipo de {company.nombre}!",
        company=CompanyBriefResponse.model_validate(company),
        member=CompanyMemberResponse.model_validate(member),
    )


@router.delete("/{company_id}/members/{member_id}", response_model=StatusMessageResponse)
def remove_team_member(
    company_id: int, 
    member_id: int, 
    type: Optional[str] = "member", 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Elimina a un miembro del equipo o cancela una invitación."""
    require_company_member(company_id, current_user, db)

    if type == "invitation":
        invitation = db.query(CompanyInvitation).filter(
            CompanyInvitation.id == member_id,
            CompanyInvitation.company_id == company_id,
        ).first()
        if invitation:
            db.delete(invitation)
            db.commit()
            return StatusMessageResponse(message="Invitación revocada")
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    else:
        member = db.query(CompanyMember).filter(
            CompanyMember.id == member_id,
            CompanyMember.company_id == company_id,
        ).first()
        if member:
            if member.user_id == current_user.id:
                raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo del equipo. Contacta a soporte.")
            db.delete(member)
            db.commit()
            return StatusMessageResponse(message="Miembro eliminado del equipo")
        raise HTTPException(status_code=404, detail="Miembro no encontrado")


# --- GESTIÓN DE TURNOS LABORALES DE PLANTA ---

@router.get("/{company_id}/shifts", response_model=List[CompanyShiftResponse])
def get_company_shifts(company_id: int, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Turnos laborales de la empresa. Si aún no tiene, inicializa el catálogo industrial base de NL.
    Lectura pública: los candidatos consultan turnos desde el chat.
    """
    _get_company_or_404(db, company_id)
    shifts = ensure_default_shifts(db, company_id)
    return [CompanyShiftResponse.model_validate(s) for s in shifts]


@router.post("/{company_id}/shifts", response_model=CompanyShiftMutationResponse)
def create_company_shift(company_id: int, payload: CompanyShiftCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Registra un nuevo turno laboral para la empresa."""
    require_company_member(company_id, current_user, db)
    _get_company_or_404(db, company_id)

    shift = CompanyShift(
        company_id=company_id,
        nombre=payload.nombre.strip(),
        hora_entrada=payload.hora_entrada.strip(),
        hora_salida=payload.hora_salida.strip(),
        dias=(payload.dias or "").strip() or "Lunes a Sábado",
        tipo=(payload.tipo or "").strip() or "Fijo",
        descripcion=payload.descripcion.strip() if payload.descripcion else None,
        activo=True,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return CompanyShiftMutationResponse(
        message=f"Turno '{shift.nombre}' registrado correctamente",
        shift=CompanyShiftResponse.model_validate(shift),
    )


@router.put("/{company_id}/shifts/{shift_id}", response_model=CompanyShiftMutationResponse)
def update_company_shift(company_id: int, shift_id: int, payload: CompanyShiftUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Actualiza la configuración y horarios de un turno laboral existente."""
    require_company_member(company_id, current_user, db)
    shift = db.query(CompanyShift).filter(
        CompanyShift.id == shift_id,
        CompanyShift.company_id == company_id,
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(shift, field, value)

    db.commit()
    db.refresh(shift)
    return CompanyShiftMutationResponse(
        message="Turno actualizado correctamente",
        shift=CompanyShiftResponse.model_validate(shift),
    )


@router.delete("/{company_id}/shifts/{shift_id}", response_model=StatusMessageResponse)
def delete_company_shift(company_id: int, shift_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Elimina un turno laboral de la empresa."""
    require_company_member(company_id, current_user, db)
    shift = db.query(CompanyShift).filter(
        CompanyShift.id == shift_id,
        CompanyShift.company_id == company_id,
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    nombre = shift.nombre
    db.delete(shift)
    db.commit()
    return StatusMessageResponse(message=f"Turno '{nombre}' eliminado correctamente")
