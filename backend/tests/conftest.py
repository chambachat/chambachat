"""
Configuración global de pytest.

- Base de datos SQLite temporal y aislada (nunca toca backend/chambachat.db).
- Sin red: DeepSeek usa el motor heurístico y el portal del SAT se simula.
- Fixtures de autenticación JWT para cualquier rol.

IMPORTANTE: las variables de entorno se fijan ANTES de importar `app`, porque
app.config las lee al importarse.
"""
import os
import sys
import tempfile
from datetime import datetime, timedelta

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

_TEST_DB_PATH = os.path.join(tempfile.gettempdir(), f"chambachat_test_{os.getpid()}.db")
if os.path.exists(_TEST_DB_PATH):
    os.remove(_TEST_DB_PATH)

os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ["DEEPSEEK_API_KEY"] = ""          # fuerza el motor heurístico (sin red)
os.environ["RESEND_API_KEY"] = ""            # sin envío real de correos
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-production"

import pytest  # noqa: E402
import jwt as pyjwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402  (ejecuta las migraciones de Alembic sobre la DB temporal)
from app.config import settings  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.models import User  # noqa: E402
from app.services import chatbot_engine, deepseek_engine, sat_service  # noqa: E402
from scripts.seed import seed_database  # noqa: E402


# ─── Base de datos ────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def seeded_database():
    """Siembra 8 vacantes, 100 operarios e histórico en la DB temporal, una vez por sesión."""
    seed_database()
    yield
    engine.dispose()
    try:
        os.remove(_TEST_DB_PATH)
    except OSError:
        pass


@pytest.fixture()
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Sin red ──────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    async def _fake_llm(conversation_history, user_message, context_data=None):
        return deepseek_engine.generate_heuristic_response(conversation_history, user_message, context_data)

    def _fake_sat_portal(sat_url, timeout=7):
        parsed = sat_service.parse_sat_qr_url(sat_url)
        return {
            "portal_consultado": True,
            "portal_exitoso": True,
            "sat_mensaje": "simulado en tests",
            "sat_html_length": 0,
            "rfc": parsed.get("rfc"),
            "razon_social": "EMPRESA DE PRUEBA",
        }

    monkeypatch.setattr(chatbot_engine, "query_deepseek_chat", _fake_llm)
    monkeypatch.setattr(sat_service, "fetch_sat_portal_data", _fake_sat_portal)


# ─── Cliente y autenticación ──────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    return TestClient(app)


def make_auth_header(email: str, role: str = "recruiter", nombre: str = "Usuario Test") -> dict:
    """Crea (o actualiza) un usuario y devuelve el header Authorization con un JWT válido."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(nombre=nombre, email=email, role=role, municipio="Monterrey", activo=True)
            db.add(user)
        else:
            user.role = role
        db.commit()
        db.refresh(user)

        token = pyjwt.encode(
            {
                "user_id": user.id,
                "email": user.email,
                "role": user.role,
                "nombre": user.nombre,
                "iat": datetime.utcnow(),
                "exp": datetime.utcnow() + timedelta(hours=1),
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


@pytest.fixture()
def admin_headers():
    return make_auth_header("test@chambachat.com", role="admin", nombre="Admin Test")


@pytest.fixture()
def recruiter_headers():
    return make_auth_header("recruiter@test.com", role="recruiter", nombre="Reclutador Test")
