from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.models import User, Job
from app.routers.auth import get_current_user
from app.services.scraper_service import scrape_and_analyze_url
from app.services.spider_service import search_jobs
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/admin/scrape", tags=["Admin Scraper"])

class ScrapeRequest(BaseModel):
    url: str

class ScrapeSearchRequest(BaseModel):
    platform: str
    keyword: str
    location: str = "nuevo-leon"
    limit: int = 3

class ScrapeResponse(BaseModel):
    success: bool
    job_id: int = None
    message: str

@router.post("/run", response_model=ScrapeResponse)
async def run_scraper(request: ScrapeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Solo admins. Toma una URL, extrae datos, usa Gemini y guarda."""
    if current_user.role != "admin" and not current_user.email.endswith("@chambachat.com"):
        raise HTTPException(status_code=403, detail="Not authorized. Requires @chambachat.com domain.")
        
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

class ScrapeSearchResponse(BaseModel):
    success: bool
    processed: int
    saved: int
    logs: list[str]

@router.post("/search-and-run", response_model=ScrapeSearchResponse)
async def search_and_run(request: ScrapeSearchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin" and not current_user.email.endswith("@chambachat.com"):
        raise HTTPException(status_code=403, detail="Not authorized. Requires @chambachat.com domain.")
        
    logs = []
    logs.append(f"Buscando '{request.keyword}' en {request.platform}...")
    urls = await search_jobs(request.platform, request.keyword, request.location, request.limit)
    
    if not urls:
        logs.append("No se encontraron URLs válidas.")
        return {"success": True, "processed": 0, "saved": 0, "logs": logs}
        
    logs.append(f"Se encontraron {len(urls)} enlaces. Iniciando análisis...")
    
    saved_count = 0
    for url in urls:
        logs.append(f"Analizando: {url}")
        extracted = await scrape_and_analyze_url(url)
        if not extracted:
            logs.append(f"  -> Sin contacto o descartado.")
            continue
            
        try:
            new_job = Job(
                titulo=extracted["puesto"],
                empresa_nombre="Vía Scraping",
                municipio=extracted["municipio"],
                descripcion=extracted["descripcion"],
                sueldo_semanal_libre=extracted["sueldo_semanal_libre"],
                turnos_fijos=extracted["turnos_fijos"],
                origen=extracted["origen"],
                fuente_contacto_telefono=extracted["fuente_contacto_telefono"],
                fuente_contacto_email=extracted["fuente_contacto_email"],
                fuente_contacto_whatsapp=extracted["fuente_contacto_whatsapp"],
                texto_ocr=extracted["texto_ocr"],
                foto_original_url=extracted["foto_original_url"],
                categoria="General"
            )
            db.add(new_job)
            db.commit()
            saved_count += 1
            logs.append(f"  -> ¡Vacante Guardada! ID: {new_job.id}")
        except Exception as e:
            db.rollback()
            logs.append(f"  -> Error BD: {str(e)}")
            
    return {"success": True, "processed": len(urls), "saved": saved_count, "logs": logs}
