import re

with open("backend/app/routers/job_photos.py", "r", encoding="utf-8") as f:
    content = f.read()

# Update analyze_photo return to include photo_log_id
content = content.replace(
    "    photo_log.success = True\n    db.commit()\n\n    return extraction",
    "    photo_log.success = True\n    db.commit()\n\n    extraction.photo_log_id = photo_log.id\n    return extraction"
)

# Update confirm_photo_job to link photo_log
new_confirm_logic = """
    # Registrar Aura
    total_aura = _grant_aura(
        db=db,
        user=current_user,
        event_type="foto_vacante",
        points=AURA_POINTS_PHOTO_JOB,
        description=f"Vacante reportada desde foto: {payload.titulo}",
        reference_id=job.id,
    )
    
    # Ligar log de foto si existe
    if payload.photo_log_id:
        from app.models import JobPhotoLog
        photo_log = db.query(JobPhotoLog).filter(JobPhotoLog.id == payload.photo_log_id).first()
        if photo_log:
            photo_log.job_id = job.id

    db.commit()"""
    
content = content.replace(
    """    # Registrar Aura
    total_aura = _grant_aura(
        db=db,
        user=current_user,
        event_type="foto_vacante",
        points=AURA_POINTS_PHOTO_JOB,
        description=f"Vacante reportada desde foto: {payload.titulo}",
        reference_id=job.id,
    )

    db.commit()""",
    new_confirm_logic
)

with open("backend/app/routers/job_photos.py", "w", encoding="utf-8") as f:
    f.write(content)
