import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

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
    res = client.get("/api/v1/candidates")
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
    # Verificar que el contexto de montacarguista se mantuvo o hay vacantes
    assert any("Montacargas" in j.get("titulo", "") or "Montacarguista" in j.get("titulo", "") for j in res2["matched_jobs"])

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
    res = client.post("/api/v1/auth/sync-google-profile", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["nombre"] == "Rogelio Valdez"
    assert data["email"] == "rogelio@chambachat.com"
    assert data["telefono"] == "81-1234-5678"

def test_send_verification_code():
    res = client.post("/api/v1/auth/send-verification-code", json={"email": "usuario@correo.com"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["sent", "warning"]
    assert "code" in data
    assert len(data["code"]) == 4

def test_send_verification_code_with_mock_smtp(monkeypatch):
    import smtplib
    from unittest.mock import MagicMock
    monkeypatch.setenv("SMTP_USER", "notificaciones@chambachat.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app_password_123")
    
    mock_server = MagicMock()
    monkeypatch.setattr(smtplib, "SMTP", MagicMock(return_value=mock_server))

    res = client.post("/api/v1/auth/send-verification-code", json={"email": "usuario@correo.com"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "sent"
    assert data["real_email_sent"] is True
def test_admin_prompts():
    res = client.get("/api/v1/admin/prompts")
    assert res.status_code == 200
    prompts = res.json()
    assert len(prompts) >= 5

def test_applications_and_recruiter_chat():
    # 1. Obtener primera vacante
    jobs = client.get("/api/v1/jobs").json()
    job_id = jobs[0]["id"]

    # 2. Postularse
    apply_payload = {
        "job_id": job_id,
        "session_id": "test_sess_999",
        "candidate_name": "Rogelio Valdez",
        "candidate_email": "rogelio@chambachat.com",
        "candidate_phone": "81-1234-5678",
        "municipio": "Apodaca"
    }
    apply_res = client.post("/api/v1/applications/apply", json=apply_payload)
    assert apply_res.status_code == 200
    app_data = apply_res.json()
    assert app_data["candidate_name"] == "Rogelio Valdez"
    assert "match_score" in app_data
    assert app_data["match_score"] >= 70
    assert len(app_data["messages"]) >= 1

    # 3. Enviar mensaje de reclutador
    app_id = app_data["id"]
    msg_payload = {
        "sender_type": "recruiter",
        "sender_name": "Reclutador Whirlpool",
        "mensaje": "Hola Rogelio, ¿cuándo podrías venir a entrevista presencial?"
    }
    msg_res = client.post(f"/api/v1/applications/{app_id}/messages", json=msg_payload)
    assert msg_res.status_code == 200
    assert msg_res.json()["mensaje"] == "Hola Rogelio, ¿cuándo podrías venir a entrevista presencial?"

    # 4. Obtener mensajes por session_id del candidato
    sess_res = client.get("/api/v1/applications/by-session/test_sess_999")
    assert sess_res.status_code == 200
    sess_apps = sess_res.json()
    assert len(sess_apps) >= 1
    assert any(m["sender_type"] == "recruiter" for m in sess_apps[0]["messages"])

def test_jobs_filter_by_empresa():
    res = client.get("/api/v1/jobs?empresa=Whirlpool")
    assert res.status_code == 200
    jobs = res.json()
    assert len(jobs) >= 1
    assert all("whirlpool" in j["empresa_nombre"].lower() for j in jobs)

def test_tripartite_group_chat_and_bot_fallback():
    # 1. Crear postulación
    jobs_res = client.get("/api/v1/jobs")
    job = jobs_res.json()[0]
    apply_payload = {
        "job_id": job["id"],
        "session_id": "test_group_sess",
        "candidate_name": "Juan Pérez",
        "candidate_email": "juan@correo.com",
        "candidate_phone": "8180001122",
        "municipio": "Apodaca"
    }
    apply_res = client.post("/api/v1/applications/apply", json=apply_payload)
    assert apply_res.status_code == 200
    app_data = apply_res.json()
    app_id = app_data["id"]
    assert app_data["bot_silenced"] is False
    # Verificar que existen mensajes de reclutador y de bot iniciales
    types = [m["sender_type"] for m in app_data["messages"]]
    assert "recruiter" in types
    assert "bot" in types

    # 2. Candidato envía pregunta
    cand_msg = {
        "sender_type": "candidate",
        "sender_name": "Juan Pérez",
        "mensaje": "¿Cuál es el sueldo semanal libre?"
    }
    cand_res = client.post(f"/api/v1/applications/{app_id}/messages", json=cand_msg)
    assert cand_res.status_code == 200

    # 3. Probar fallback de Chambot forzado (simulando que el reclutador tardó > 2 min)
    fb_res = client.post(f"/api/v1/applications/{app_id}/check-bot-fallback?force=true")
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["triggered"] is True
    assert fb_data["reason"] == "RECRUITER_TIMEOUT_REPLIED"
    assert "sueldo" in fb_data["message"]["mensaje"].lower() or "$" in fb_data["message"]["mensaje"]

    # 4. Reclutador responde -> Bot debe silenciarse automáticamente
    rec_msg = {
        "sender_type": "recruiter",
        "sender_name": "Reclutador Whirlpool",
        "mensaje": "Hola Juan, claro, te confirmo el sueldo y la cita."
    }
    rec_res = client.post(f"/api/v1/applications/{app_id}/messages", json=rec_msg)
    assert rec_res.status_code == 200

    # 5. Verificar que bot_silenced ahora es True
    get_res = client.get(f"/api/v1/applications/{app_id}")
    assert get_res.status_code == 200
    assert get_res.json()["bot_silenced"] is True

    # 6. Fallback no debe dispararse porque el bot está silenciado
    fb_silenced_res = client.post(f"/api/v1/applications/{app_id}/check-bot-fallback?force=true")
    assert fb_silenced_res.status_code == 200
    assert fb_silenced_res.json()["triggered"] is False
    assert fb_silenced_res.json()["reason"] == "BOT_SILENCED"

    # 7. Reclutador reactiva al bot
    toggle_res = client.post(f"/api/v1/applications/{app_id}/toggle-bot", json={"silenced": False})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["bot_silenced"] is False

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
    print(">>> TODOS LOS TESTS DE INTEGRACION DE LA API PASARON EXITOSAMENTE <<<")
