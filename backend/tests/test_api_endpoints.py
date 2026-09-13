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
    # 3.0 + 2.5 (sueldo) + 0.0 (traslado) + 2.0 (turnos) + 3.5 (inea) = 11.0 meses
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

def test_chat_flow_and_inea():
    # 1. Start chat
    start_res = client.get("/api/v1/chat/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]
    
    # 2. Provide name
    msg1 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "message": "Rogelio Valdez"
    })
    assert msg1.status_code == 200
    assert "ask_municipio" in msg1.json()["current_step"]

    # 3. Provide municipality
    msg2 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "selected_option": "Apodaca"
    })
    assert msg2.status_code == 200
    assert "ask_education" in msg2.json()["current_step"]

    # 4. Provide Primaria_Incompleta -> should trigger INEA prompt
    msg3 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "selected_option": "Primaria_Incompleta"
    })
    assert msg3.status_code == 200
    res3 = msg3.json()
    assert "inea_response" in res3["current_step"]
    assert any("INEA" in m for m in res3["bot_messages"])

    # 5. Accept INEA support
    msg4 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "selected_option": "SI_INEA"
    })
    assert msg4.status_code == 200
    res4 = msg4.json()
    assert res4["completed"] is True
    assert res4["candidate_profile"]["tag_inea"] is True
    assert len(res4["matched_jobs"]) > 0

def test_admin_prompts():
    res = client.get("/api/v1/admin/prompts")
    assert res.status_code == 200
    prompts = res.json()
    assert len(prompts) >= 5

if __name__ == "__main__":
    test_health()
    test_predict_retention_endpoint()
    test_jobs_list()
    test_candidates_list()
    test_analytics_summary()
    test_chat_flow_and_inea()
    test_admin_prompts()
    print(">>> TODOS LOS TESTS DE INTEGRACION DE LA API PASARON EXITOSAMENTE (7/7) <<<")
