import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Construir engine según tipo de base de datos ────────────────────
db_url = settings.DATABASE_URL
connect_args: dict = {}
engine_kwargs: dict = {}

if db_url.startswith("sqlite"):
    # SQLite: modo desarrollo local
    connect_args["check_same_thread"] = False
    logger.info("Usando SQLite local para desarrollo: %s", db_url)
else:
    # PostgreSQL / Supabase: producción
    connect_args["connect_timeout"] = 10
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    logger.info("Conectando a PostgreSQL: %s", db_url.split("@")[-1] if "@" in db_url else "(url oculta)")

try:
    engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)
    # Verificar la conexión al arranque para bases remotas
    if not db_url.startswith("sqlite"):
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Conexión a PostgreSQL verificada exitosamente.")
except Exception as e:
    if db_url.startswith("sqlite"):
        raise RuntimeError(f"No se pudo crear la base de datos SQLite: {e}") from e
    else:
        # PostgreSQL falla = NO hacer fallback silencioso a SQLite
        raise RuntimeError(
            f"No se pudo conectar a la base de datos PostgreSQL. "
            f"Error: {e}. Verifica DATABASE_URL y la conectividad de red."
        ) from e


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency de FastAPI para obtener una sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
