import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Job, User
from scripts.seed import seed_database

# Asegurar datos para pruebas automatizadas
_db = SessionLocal()
try:
    if _db.query(Job).count() < 8 or _db.query(User).count() < 100:
        seed_database()
finally:
    _db.close()

client = TestClient(app)


# ─── Helper de autenticación para tests ──────────────────────────────
def _get_test_auth_header(role: str = "admin", email: str = "test@chambachat.com") -> dict:
    """Crea un usuario de prueba y genera un JWT para autenticar requests."""
    import jwt as pyjwt
    from datetime import datetime, timedelta
    from app.config import settings

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                nombre="Test User",
                email=email,
                role=role,
                municipio="Monterrey",
                activo=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif user.role != role:
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


AUTH_HEADERS = _get_test_auth_header(role="admin")
RECRUITER_HEADERS = _get_test_auth_header(role="recruiter", email="recruiter@test.com")


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_predict_retention_endpoint():
    payload = {
        "sueldo": 2500.0,
        "tiempo_traslado_min": 20,
        "turnos_fijos": True,
        "apoyo_inea": True
    }
    res = client.post("/api/v1/predict-retention", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["retention_months"] == 11.0
    assert data["retention_level"] == "Excelente"
    assert len(data["recommendations"]) > 0

def test_jobs_list():
    res = client.get("/api/v1/jobs")
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) >= 8

def test_candidates_list():
    res = client.get("/api/v1/candidates", headers=AUTH_HEADERS)
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) >= 100

def test_analytics_summary():
    res = client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_operarios"] >= 100
    assert data["total_vacantes"] >= 8
    assert data["tasa_inea_pct"] > 0
    assert data["permanencia_con_inea"] > data["permanencia_sin_inea"]

def test_chat_flow_and_jobs():
    # 1. Start chat
    start_res = client.get("/api/v1/chat/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]
    
    # 2. Enviar mensaje de búsqueda en Apodaca
    msg1 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "message": "Hola, busco trabajo de montacarguista en Apodaca"
    })
    assert msg1.status_code == 200
    res1 = msg1.json()
    assert len(res1["bot_messages"]) > 0
    assert len(res1["options"]) > 0

    # 3. Seleccionar opción de turno o zona
    msg2 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "selected_option": "Buscar en Apodaca"
    })
    assert msg2.status_code == 200
    res2 = msg2.json()
    assert res2["candidate_profile"] is not None
    assert len(res2["matched_jobs"]) > 0
    # Verificar que se encontraron vacantes para el perfil
    assert any(j.get("titulo") for j in res2["matched_jobs"])

def test_google_profile_sync():
    payload = {
        "email": "rogelio@chambachat.com",
        "nombre": "Rogelio Valdez",
        "avatar_url": "https://lh3.googleusercontent.com/a/default-user",
        "google_id": "google_123456",
        "municipio": "Apodaca",
        "nivel_educativo": "Secundaria",
        "tag_inea": True,
        "telefono": "81-1234-5678"
    }
    res = client.post("/api/v1/auth/sync-google-profile", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

def test_recruiter_profile_sync():
    payload = {
        "email": "rh@ternium.com",
        "nombre": "Lic. Marcela Treviño",
        "role": "recruiter",
        "empresa_nombre": "Ternium Guerrero",
        "telefono": "81-8888-9999"
    }
    res = client.post("/api/v1/auth/sync-google-profile", json=payload, headers=RECRUITER_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

def test_send_verification_code():
    email = "test_auth_6b12f671@correo.com"
    send_res = client.post("/api/v1/auth/send-verification-code", json={"email": email})
    assert send_res.status_code == 200

    verify_res = client.post("/api/v1/auth/verify-code", json={"email": email, "code": "999999"})
    assert verify_res.status_code in [400, 401, 422]

def test_send_code_does_not_leak_code():
    email = "leak_e735a809@correo.com"
    send_res = client.post("/api/v1/auth/send-verification-code", json={"email": email})
    assert send_res.status_code == 200
    assert "code" not in send_res.json()

if __name__ == "__main__":
    test_health()
    test_predict_retention_endpoint()
    test_jobs_list()
    test_candidates_list()
    test_analytics_summary()
    test_chat_flow_and_jobs()
    test_google_profile_sync()
    test_admin_prompts()
    test_applications_and_recruiter_chat()
    test_jobs_filter_by_empresa()
    test_tripartite_group_chat_and_bot_fallback()
    test_company_management_and_team_invitations()
    test_transport_routes_management_and_nearby_stops()
    test_chat_candidate_location_and_nearby_routes()
    test_company_location_update()
    test_company_shifts_crud()
    print(">>> TODOS LOS TESTS DE INTEGRACION DE LA API PASARON EXITOSAMENTE <<<")


