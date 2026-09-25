from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, Company, CompanyMember, CompanyShift
from app.schemas import JobCreate, JobResponse, JobUpdate, JobCatalogResponse
from app.constants import job_catalog
from app.services.geo import MUNICIPIOS_NL_COORDS
from app.dependencies import get_current_user, get_current_user_optional, require_company_member

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


@router.get("", response_model=List[JobResponse])
def get_jobs(
    municipio: Optional[str] = None,
    q: Optional[str] = Query(None, max_length=120, description="Texto libre: busca en título, empresa, categoría, municipio y descripción"),
    apoyo_inea: Optional[bool] = None,
    empresa: Optional[str] = None,
    company_id: Optional[int] = None,
    company_code: Optional[str] = Query(None, max_length=12, description="Código verificador del Smart Link de la empresa"),
    mine: bool = Query(False, description="Solo vacantes de las empresas donde el usuario autenticado es miembro"),
    include_inactive: bool = Query(False, description="Incluir vacantes inactivas (solo tiene sentido con mine=true)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Retorna la lista de vacantes operativas disponibles con filtros opcionales.
    Endpoints GET son públicos para que los candidatos puedan ver vacantes;
    `mine=true` requiere sesión y limita a las empresas del usuario.
    """
    query = db.query(Job)
    if not (mine and include_inactive):
        query = query.filter(Job.activa.is_(True))
        
        # Filtro de caducidad automática para vacantes scrapeadas sin reclamar (15 días)
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(days=15)
        query = query.filter(
            or_(
                Job.origen != "scraping",
                Job.empresa_id.isnot(None),
                Job.created_at >= cutoff
            )
        )
    if mine:
        if not current_user:
            raise HTTPException(status_code=401, detail="Inicia sesión para ver las vacantes de tus empresas")
        member_ids = [
            row[0] for row in db.query(CompanyMember.company_id).filter(
                CompanyMember.email == current_user.email,
                CompanyMember.status == "active",
            ).all()
        ]
        if not member_ids:
            return []
        query = query.filter(Job.empresa_id.in_(member_ids))
    if municipio:
        query = query.filter(Job.municipio.ilike(f"%{municipio}%"))
    if q and q.strip():
        for term in q.strip().split()[:5]:  # cada palabra debe aparecer en algún campo
            like = f"%{term}%"
            query = query.filter(or_(
                Job.titulo.ilike(like),
                Job.empresa_nombre.ilike(like),
                Job.categoria.ilike(like),
                Job.municipio.ilike(like),
                Job.descripcion.ilike(like),
            ))
    if apoyo_inea is not None:
        query = query.filter(Job.apoyo_inea == apoyo_inea)
    if company_code:
        company = db.query(Company).filter(Company.smart_code == company_code.strip().upper()).first()
        if not company:
            return []
        query = query.filter(Job.empresa_id == company.id)
    elif company_id:
        query = query.filter(Job.empresa_id == company_id)
    elif empresa:
        # Retrocompat: búsqueda por nombre si no se pasa company_id
        query = query.filter(Job.empresa_nombre.ilike(f"%{empresa}%"))
    return query.order_by(Job.id.desc()).all()


def _learned_tags(db: Session, column) -> List[str]:
    """Etiquetas libres ya usadas en vacantes (catálogo abierto que crece con cada giro)."""
    seen, out = set(), []
    for (values,) in db.query(column).filter(column.isnot(None)).all():
        for tag in values or []:
            key = str(tag).strip().lower()
            if key and key not in seen:
                seen.add(key)
                out.append(str(tag).strip())
    return out


@router.get("/catalogo", response_model=JobCatalogResponse)
def get_job_catalog(db: Session = Depends(get_db)):
    """
    Opciones para los campos de una vacante. Los campos cerrados vienen del catálogo fijo;
    certificaciones y requisitos_fisicos son abiertos: sugerencias del catálogo más lo ya usado.
    """
    data = dict(job_catalog.CATALOGO)
    for key, column in (("certificaciones", Job.certificaciones), ("requisitos_fisicos", Job.requisitos_fisicos)):
        base = list(data[key])
        lower = {b.lower() for b in base}
        data[key] = base + [t for t in _learned_tags(db, column) if t.lower() not in lower]
    return JobCatalogResponse(**data)


@router.post("", response_model=JobResponse)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Publica una nueva vacante operativa en la plataforma.
    Requiere autenticación. Si se provee company_id, valida membresía.
    """
    empresa_id = job_in.company_id
    company = None
    if empresa_id:
        company = db.query(Company).filter(Company.id == empresa_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        require_company_member(empresa_id, current_user, db)
        empresa_nombre = company.nombre
    else:
        empresa_nombre = job_in.empresa_nombre

    # Ubicación: SIEMPRE la de la planta que publica (municipio, dirección y coordenadas)
    if company:
        municipio = company.municipio or job_in.municipio
        direccion = ", ".join(p for p in [company.direccion, company.colonia, company.codigo_postal and f"CP {company.codigo_postal}"] if p) or None
        if company.latitud is not None and company.longitud is not None:
            lat, lon = company.latitud, company.longitud
        else:
            lat, lon = MUNICIPIOS_NL_COORDS.get(municipio.lower(), (25.6866, -100.3161))
    else:
        municipio, direccion = job_in.municipio, job_in.direccion
        lat, lon = job_in.latitud, job_in.longitud
        if (lat == 0 and lon == 0) or lat is None:
            lat, lon = MUNICIPIOS_NL_COORDS.get(municipio.lower(), (25.6866, -100.3161))

    # Horario: si se eligió un turno de la planta, sus datos mandan sobre los capturados
    data = job_in.model_dump()
    if job_in.shift_id:
        shift = db.query(CompanyShift).filter(CompanyShift.id == job_in.shift_id).first()
        if not shift or (company and shift.company_id != company.id):
            raise HTTPException(status_code=400, detail="El turno seleccionado no pertenece a la planta que publica")
        data["hora_entrada"] = shift.hora_entrada
        data["hora_salida"] = shift.hora_salida
        if shift.dias in job_catalog.DIAS_LABORALES:
            data["dias_laborales"] = shift.dias
        data["tipo_turno"] = data.get("tipo_turno") or job_catalog.tipo_turno_desde_horario(shift.hora_entrada, shift.tipo)

    # Banderas históricas sincronizadas con los campos estructurados (las usa el emparejamiento)
    prestaciones = data.get("prestaciones") or []
    transporte = job_in.transporte_incluido or job_catalog.PRESTACION_TRANSPORTE in prestaciones
    apoyo_inea = job_in.apoyo_inea or job_catalog.PRESTACION_INEA in prestaciones
    turnos_fijos = job_in.turnos_fijos or str(data.get("tipo_turno") or "").startswith("Fijo")

    job = Job(
        empresa_id=empresa_id,
        empresa_nombre=empresa_nombre,
        titulo=job_in.titulo.strip(),
        descripcion=job_in.descripcion,
        sueldo_semanal_libre=job_in.sueldo_semanal_libre,
        turnos_fijos=turnos_fijos,
        apoyo_inea=apoyo_inea,
        transporte_incluido=transporte,
        municipio=municipio,
        latitud=lat,
        longitud=lon,
        direccion=direccion,
        categoria=data.get("categoria"),
        tipo_turno=data.get("tipo_turno"),
        shift_id=job_in.shift_id,
        hora_entrada=data.get("hora_entrada"),
        hora_salida=data.get("hora_salida"),
        dias_laborales=data.get("dias_laborales"),
        tipo_contrato=data.get("tipo_contrato"),
        vacantes_disponibles=job_in.vacantes_disponibles,
        escolaridad_minima=data.get("escolaridad_minima"),
        experiencia_minima=data.get("experiencia_minima"),
        certificaciones=data.get("certificaciones") or [],
        prestaciones=prestaciones,
        requisitos_fisicos=data.get("requisitos_fisicos") or [],
        bono_semanal=job_in.bono_semanal,
        vales_despensa_semanal=job_in.vales_despensa_semanal,
        activa=job_in.activa,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, payload: JobUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Edición parcial de una vacante (solo miembros de la empresa).
    Acepta los mismos campos estructurados que el alta; la empresa y la ubicación no cambian
    (se heredan de la planta). Si se manda shift_id, el horario del turno de la planta manda.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    if not job.empresa_id:
        raise HTTPException(status_code=403, detail="Esta vacante no está ligada a una empresa administrable")
    require_company_member(job.empresa_id, current_user, db)

    data = payload.model_dump(exclude_unset=True)

    if "shift_id" in data and data["shift_id"]:
        shift = db.query(CompanyShift).filter(CompanyShift.id == data["shift_id"]).first()
        if not shift or shift.company_id != job.empresa_id:
            raise HTTPException(status_code=400, detail="El turno seleccionado no pertenece a la planta de la vacante")
        data["hora_entrada"] = shift.hora_entrada
        data["hora_salida"] = shift.hora_salida
        if shift.dias in job_catalog.DIAS_LABORALES:
            data["dias_laborales"] = shift.dias
        data.setdefault("tipo_turno", job_catalog.tipo_turno_desde_horario(shift.hora_entrada, shift.tipo))

    if "titulo" in data and data["titulo"] is not None:
        data["titulo"] = data["titulo"].strip()
        if not data["titulo"]:
            raise HTTPException(status_code=422, detail="El título no puede quedar vacío")

    for field, value in data.items():
        setattr(job, field, value)

    # Derivados sincronizados si cambiaron sus fuentes y el cliente no los fijó explícitamente
    prestaciones = job.prestaciones or []
    if "prestaciones" in data and "transporte_incluido" not in data:
        job.transporte_incluido = job_catalog.PRESTACION_TRANSPORTE in prestaciones
    if "prestaciones" in data and "apoyo_inea" not in data:
        job.apoyo_inea = job_catalog.PRESTACION_INEA in prestaciones
    if "tipo_turno" in data and "turnos_fijos" not in data:
        job.turnos_fijos = str(job.tipo_turno or "").startswith("Fijo")

    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return job
