from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job
from app.schemas import JobCreate, JobResponse
from app.services.matchmaking import MUNICIPIOS_NL_COORDS

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])

@router.get("", response_model=List[JobResponse])
def get_jobs(
    municipio: Optional[str] = None,
    apoyo_inea: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de vacantes operativas disponibles con filtros opcionales.
    """
    query = db.query(Job)
    if municipio:
        query = query.filter(Job.municipio.ilike(f"%{municipio}%"))
    if apoyo_inea is not None:
        query = query.filter(Job.apoyo_inea == apoyo_inea)
    return query.order_by(Job.id.desc()).all()

@router.post("", response_model=JobResponse)
def create_job(job_in: JobCreate, db: Session = Depends(get_db)):
    """
    Publica una nueva vacante operativa en la plataforma.
    """
    # Si no se proveen lat/long precisas, asignar coordenadas por municipio
    lat = job_in.latitud
    lon = job_in.longitud
    if (lat == 0 and lon == 0) or (lat is None):
        coords = MUNICIPIOS_NL_COORDS.get(job_in.municipio.lower(), (25.6866, -100.3161))
        lat, lon = coords

    job = Job(
        empresa_id=1,
        empresa_nombre=job_in.empresa_nombre,
        titulo=job_in.titulo,
        descripcion=job_in.descripcion,
        sueldo_semanal_libre=job_in.sueldo_semanal_libre,
        turnos_fijos=job_in.turnos_fijos,
        apoyo_inea=job_in.apoyo_inea,
        transporte_incluido=job_in.transporte_incluido,
        municipio=job_in.municipio,
        latitud=lat,
        longitud=lon
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
