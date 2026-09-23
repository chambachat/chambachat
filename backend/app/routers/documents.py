"""
Descarga de documentos subidos (Constancias de Situación Fiscal).

Los archivos viven en la tabla company_documents porque el disco de Render es
efímero. Se conserva la URL histórica /uploads/csf/{filename}; si el archivo
no está en la base pero sí en backend/uploads/csf (desarrollo local), se sirve
desde disco.
"""
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CompanyDocument

router = APIRouter(prefix="/uploads", tags=["Documents"])

_LOCAL_CSF_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "csf")


@router.get("/csf/{filename}")
def get_csf_document(filename: str, db: Session = Depends(get_db)):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    doc = db.query(CompanyDocument).filter(CompanyDocument.filename == filename).first()
    if doc:
        return Response(
            content=doc.data,
            media_type=doc.content_type or "application/octet-stream",
            headers={"Content-Disposition": f'inline; filename="{doc.original_name or filename}"'},
        )

    local_path = os.path.join(_LOCAL_CSF_DIR, filename)
    if os.path.isfile(local_path):
        return FileResponse(local_path, filename=filename, content_disposition_type="inline")

    raise HTTPException(
        status_code=404,
        detail=(
            "Este archivo ya no está disponible: se subió antes de que las constancias se guardaran "
            "en la base de datos. Vuelve a cargar la Constancia de Situación Fiscal desde "
            "Configuración de Planta."
        ),
    )
