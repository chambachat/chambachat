import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import BotFlowConfig
from app.services.chatbot_engine import DEFAULT_PROMPTS
from app.routers import predictor, chat, jobs, candidates, admin, analytics

# Crear tablas en base de datos si no existen
Base.metadata.create_all(bind=engine)

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

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": settings.DATABASE_URL.split("://")[0]
    }

# Si existe el build del frontend, servirlo estáticamente
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
