from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.models import User, Job
from app.routers.auth import get_current_user
from app.services.scraper_service import scrape_and_analyze_url
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/admin/scrape", tags=["Admin Scraper"])

class ScrapeRequest(BaseModel):
    url: str

class ScrapeResponse(BaseModel):
    success: bool
    job_id: int = None
    message: str

@router.post("/run", response_model=ScrapeResponse)
async def run_scraper(request: ScrapeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Solo admins. Toma una URL, extrae datos, usa Gemini y guarda."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    extracted_data = await scrape_and_analyze_url(request.url)
    
    if not extracted_data:
        return {"success": False, "message": "No se encontraron datos de contacto o falló el scraping"}
        
    # Crear la vacante en la BD
    try:
        new_job = Job(
            titulo=extracted_data["puesto"],
            empresa_nombre="Vía Scraping",
            municipio=extracted_data["municipio"],
            descripcion=extracted_data["descripcion"],
            sueldo_semanal_libre=extracted_data["sueldo_semanal_libre"],
            turnos_fijos=extracted_data["turnos_fijos"],
            origen=extracted_data["origen"],
            fuente_contacto_telefono=extracted_data["fuente_contacto_telefono"],
            fuente_contacto_email=extracted_data["fuente_contacto_email"],
            fuente_contacto_whatsapp=extracted_data["fuente_contacto_whatsapp"],
            texto_ocr=extracted_data["texto_ocr"],
            foto_original_url=extracted_data["foto_original_url"],
            categoria="General"
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        return {"success": True, "job_id": new_job.id, "message": "Vacante scrapeada con éxito"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error guardando: {str(e)}")
