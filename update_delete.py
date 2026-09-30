import io
with io.open('backend/app/routers/jobs.py', 'r', encoding='utf-8') as f:
    c = f.read()

old = '''        if job.reportada_por_email != current_user.email:
            raise HTTPException(status_code=403, detail='No tienes permiso para eliminar esta vacante comunitaria')'''

new = '''        if job.reportada_por_email != current_user.email:
            raise HTTPException(status_code=403, detail='No tienes permiso para eliminar esta vacante comunitaria')
        # Restar puntos de aura
        from app.routers.gamification import _grant_aura
        _grant_aura(db=db, user=current_user, event_type="eliminar_foto_vacante", points=-10, description=f"Vacante comunitaria eliminada: {job.titulo}", reference_id=job.id)'''

c = c.replace(old, new)

with io.open('backend/app/routers/jobs.py', 'w', encoding='utf-8') as f:
    f.write(c)
