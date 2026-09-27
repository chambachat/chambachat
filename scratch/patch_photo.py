import re

with open("backend/app/routers/job_photos.py", "r", encoding="utf-8") as f:
    content = f.read()

new_logic = """    import base64
    from app.services.job_vision_service import _preprocess_image
    from app.models import JobPhotoLog
    
    # 1. Comprimir la imagen antes de intentar guardarla o mandarla a Gemini
    processed_b64, mime_type = "", ""
    try:
        processed_b64, mime_type = _preprocess_image(payload.image_base64)
        file_bytes = base64.b64decode(processed_b64)
    except Exception as e:
        logger.warning(f"No se pudo procesar la imagen: {e}")
        raise HTTPException(status_code=400, detail="Formato de imagen inválido o corrupto")
        
    # 2. Guardar registro inicial (sin job_id, asumiendo falla por default)
    photo_log = JobPhotoLog(
        user_id=current_user.id,
        file_data=file_bytes,
        success=False
    )
    db.add(photo_log)
    db.commit()
    db.refresh(photo_log)

    try:
        extraction = await analyze_job_photo(
            image_b64=processed_b64,
            latitud=payload.latitud,
            longitud=payload.longitud,
            municipio=payload.municipio,
        )
    except ValueError as exc:
        logger.warning("Configuración faltante para visión: %s", exc)
        photo_log.error_message = f"Configuración faltante: {exc}"
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("Error en análisis de foto: %s", exc)
        photo_log.error_message = f"Error en análisis: {exc}"
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not extraction.es_oferta_laboral:
        photo_log.error_message = "No parece contener una oferta de empleo"
        db.commit()
        raise HTTPException(
            status_code=422,
            detail="La imagen no parece contener una oferta de empleo. Intenta con otra foto.",
        )
        
    photo_log.success = True
    db.commit()

    return extraction"""

pattern = re.compile(r"    try:\n\s+extraction = await analyze_job_photo\(.*?return extraction", re.DOTALL)
content = pattern.sub(new_logic, content)

with open("backend/app/routers/job_photos.py", "w", encoding="utf-8") as f:
    f.write(content)
