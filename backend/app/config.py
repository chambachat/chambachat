import os
import logging
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Ruta absoluta para SQLite en desarrollo ─────────────────────────
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_SQLITE_PATH = os.path.join(_BASE_DIR, "..", "chambachat.db")
_DEFAULT_DB_URL = f"sqlite:///{os.path.abspath(_DEFAULT_SQLITE_PATH)}"


def _parse_cors_origins() -> list[str]:
    """
    Lee CORS_ORIGINS de la variable de entorno como lista separada por comas.
    Ejemplo: CORS_ORIGINS=https://chambachat.onrender.com,http://localhost:5173
    Si no está definida, permite solo localhost para desarrollo seguro.
    """
    raw = os.getenv("CORS_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return ["http://localhost:5173", "http://localhost:3000"]


class Settings(BaseModel):
    APP_NAME: str = "Chambachat V2 API"
    APP_VERSION: str = "2.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_DB_URL)
    CORS_ORIGINS: list[str] = _parse_cors_origins()

    # DeepSeek LLM Configuration — sin fallback hardcodeado
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    DEEPSEEK_API_URL: str = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/chat/completions")

    # Google Sign-In (Google Identity Services). Vacío = botón de Google deshabilitado.
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))  # 24h default


settings = Settings()

# ─── Validaciones al arranque ─────────────────────────────────────────
if not settings.DEEPSEEK_API_KEY:
    logger.warning(
        "DEEPSEEK_API_KEY no está configurada. El chatbot usará el motor heurístico "
        "como fallback. Configura la variable de entorno para habilitar el LLM."
    )

if not settings.JWT_SECRET_KEY:
    logger.warning(
        "JWT_SECRET_KEY no está configurada. Se generará una clave temporal en memoria. "
        "Configura la variable de entorno para producción."
    )
    import secrets
    settings.JWT_SECRET_KEY = secrets.token_urlsafe(64)
