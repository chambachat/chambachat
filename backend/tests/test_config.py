"""La URL de PostgreSQL siempre lleva el driver explícito (psycopg2), sin importar la versión de SQLAlchemy."""
from app.config import _normalize_db_url


def test_normalize_db_url_pins_psycopg2_driver():
    assert _normalize_db_url("postgresql://user:pass@host:5432/db") == "postgresql+psycopg2://user:pass@host:5432/db"
    assert _normalize_db_url("postgres://user:pass@host/db") == "postgresql+psycopg2://user:pass@host/db"
    # Ya explícito o SQLite: se respeta tal cual
    assert _normalize_db_url("postgresql+psycopg2://user@host/db") == "postgresql+psycopg2://user@host/db"
    assert _normalize_db_url("postgresql+psycopg://user@host/db") == "postgresql+psycopg://user@host/db"
    assert _normalize_db_url("sqlite:///./chambachat.db") == "sqlite:///./chambachat.db"
