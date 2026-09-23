from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job, Company, CompanyMember
from app.schemas import JobCreate, JobResponse
from app.services.geo import MUNICIPIOS_NL_COORDS
from app.dependencies import get_current_user, get_current_user_optional, require_company_member

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


@router.get("", response_model=List[JobResponse])
def get_jobs(
    municipio: Optional[str] = None,
    apoyo_inea: Optional[bool] = None,
    empresa: Optional[str] = None,
    company_id: Optional[int] = None,
    mine: bool = Query(False, description="Solo vacantes de las empresas donde el usuario autenticado es miembro"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Retorna la lista de vacantes operativas disponibles con filtros opcionales.
    Endpoints GET son públicos para que los candidatos puedan ver vacantes;
    `mine=true` requiere sesión y limita a las empresas del usuario.
    """
    query = db.query(Job)
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
    if apoyo_inea is not None:
        query = query.filter(Job.apoyo_inea == apoyo_inea)
    if company_id:
        query = query.filter(Job.empresa_id == company_id)
    elif empresa:
        # Retrocompat: búsqueda por nombre si no se pasa company_id
        query = query.filter(Job.empresa_nombre.ilike(f"%{empresa}%"))
    return query.order_by(Job.id.desc()).all()


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

    # Si se especifica company_id, validar que la empresa exista y que el usuario sea miembro
    if empresa_id:
        company = db.query(Company).filter(Company.id == empresa_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        require_company_member(empresa_id, current_user, db)
        empresa_nombre = company.nombre
    else:
        empresa_nombre = job_in.empresa_nombre

    # Si no se proveen lat/long precisas, asignar coordenadas por municipio
    lat = job_in.latitud
    lon = job_in.longitud
    if (lat == 0 and lon == 0) or (lat is None):
        coords = MUNICIPIOS_NL_COORDS.get(
            job_in.municipio.lower(), (25.6866, -100.3161)
        )
        lat, lon = coords

    job = Job(
        empresa_id=empresa_id,
        empresa_nombre=empresa_nombre,
        titulo=job_in.titulo,
        descripcion=job_in.descripcion,
        sueldo_semanal_libre=job_in.sueldo_semanal_libre,
        turnos_fijos=job_in.turnos_fijos,
        apoyo_inea=job_in.apoyo_inea,
        transporte_incluido=job_in.transporte_incluido,
        municipio=job_in.municipio,
        latitud=lat,
        longitud=lon,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return job
