import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import SessionLocal
from app.models import BotFlowConfig
from app.services.chatbot_engine import DEFAULT_PROMPTS
from app.routers import predictor, chat, jobs, candidates, admin, analytics, auth, applications, companies, routes, documents, favorites, blocks

import logging

logger = logging.getLogger(__name__)


def _run_alembic_migrations():
    """
    Ejecuta 'alembic upgrade head' al arrancar la aplicación.
    Alembic es la única fuente de verdad del esquema: si la migración falla,
    la aplicación no arranca (no hay fallback a create_all).
    """
    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command

    backend_dir = os.path.join(os.path.dirname(__file__), "..")
    alembic_cfg = AlembicConfig(os.path.join(backend_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

    try:
        alembic_command.upgrade(alembic_cfg, "head")
    except Exception as exc:
        raise RuntimeError(
            f"No se pudieron aplicar las migraciones de Alembic: {exc}. "
            "Revisa DATABASE_URL y el estado de la tabla alembic_version."
        ) from exc
    logger.info("Migraciones de Alembic aplicadas correctamente.")


_run_alembic_migrations()

# Sembrar prompts por defecto si la tabla está vacía
def init_default_prompts():
    db = SessionLocal()
    try:
        count = db.query(BotFlowConfig).count()
        if count == 0:
            for key, pdata in DEFAULT_PROMPTS.items():
                cfg = BotFlowConfig(
                    step_key=key,
                    step_order=pdata["step_order"],
                    titulo_admin=pdata["titulo_admin"],
                    prompt_texto=pdata["prompt_texto"],
                    opciones_json=json.dumps(pdata.get("opciones", [])),
                    activo=True
                )
                db.add(cfg)
            db.commit()
    finally:
        db.close()

init_default_prompts()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plataforma de Reclutamiento Operativo y People Analytics para Nuevo León"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(predictor.router)
app.include_router(chat.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(companies.router)
app.include_router(routes.router)
app.include_router(documents.router)
app.include_router(favorites.router)
app.include_router(blocks.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": settings.DATABASE_URL.split("://")[0]
    }

# Los archivos subidos (CSF) se sirven desde la base de datos en routers/documents.py

# Si existe el build del frontend, servirlo estáticamente
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

