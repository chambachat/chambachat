import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import SessionLocal, engine
from app.models import BotFlowConfig
from app.services.chatbot_engine import DEFAULT_PROMPTS, LEGACY_WELCOME_TEXTS
from app.routers import predictor, chat, jobs, candidates, admin, analytics, auth, applications, companies, routes, documents, favorites, blocks, profile, seo, web

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


def _harden_public_tables() -> None:
    """
    Supabase expone el esquema public por su API REST (PostgREST). Con Row Level Security
    activo y sin políticas, nadie puede leer ni escribir por esa vía; la app no se ve afectada
    porque se conecta con el rol dueño de las tablas (al dueño no le aplica RLS).
    Idempotente: solo toca tablas que aún no tengan RLS. Solo PostgreSQL.
    """
    if settings.DATABASE_URL.startswith("sqlite"):
        return
    from sqlalchemy import text

    try:
        with engine.begin() as conn:
            rows = conn.execute(text(
                "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity"
            )).fetchall()
            for (table,) in rows:
                conn.execute(text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY'))
        if rows:
            logger.info("RLS habilitado en %d tabla(s) públicas: %s", len(rows), ", ".join(r[0] for r in rows))
    except Exception as exc:  # noqa: BLE001 - endurecimiento opcional, nunca debe tumbar el arranque
        logger.warning("No se pudo habilitar RLS en las tablas públicas: %s", exc)


_harden_public_tables()

# Sembrar prompts por defecto si la tabla está vacía
def init_default_prompts():
    db = SessionLocal()
    try:
        # Copy de versiones anteriores (mencionaba una sola región): actualizar al texto genérico actual
        for cfg in db.query(BotFlowConfig).filter(BotFlowConfig.step_key == "welcome").all():
            if cfg.prompt_texto in LEGACY_WELCOME_TEXTS:
                cfg.prompt_texto = DEFAULT_PROMPTS["welcome"]["prompt_texto"]
                cfg.opciones_json = json.dumps(DEFAULT_PROMPTS["welcome"].get("opciones", []))
        db.commit()

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
    description="Plataforma de Reclutamiento Operativo y People Analytics"
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
app.include_router(profile.router)
# Páginas HTML indexables servidas desde el servidor (SEO): /vacantes, sitemap, robots y sitio informativo /web.
# Se registran antes del mount del frontend para que no caigan en el index.html de la SPA.
app.include_router(seo.router)
app.include_router(web.router)


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

