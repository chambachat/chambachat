"""
Chat directo candidato ↔ reclutadores: postulación idempotente, permisos por rol y
respaldo de Chambot. Cada postulación es un hilo independiente.
"""
from conftest import make_auth_header


def _company_and_job(client, owner_headers, nombre="Planta Directa"):
    company = client.post("/api/v1/companies", json={"nombre": nombre, "municipio": "Apodaca"}, headers=owner_headers).json()["company"]
    job = client.post("/api/v1/jobs", json={
        "company_id": company["id"], "titulo": "Operador de Ensamble", "sueldo_semanal_libre": 2600,
        "municipio": "Apodaca", "latitud": 25.78, "longitud": -100.19, "tipo_turno": "Fijo matutino",
        "hora_entrada": "06:00", "hora_salida": "14:00",
    }, headers=owner_headers)
    assert job.status_code == 200, job.text
    return company, job.json()


def test_direct_chat_flow_and_permissions(client):
    owner = make_auth_header("dc_owner@test.com", nombre="DC Owner")
    company, job = _company_and_job(client, owner)
    cand = make_auth_header("dc_cand@test.com", nombre="Candi Dato", role="candidate")

    # Postularse abre el hilo con saludo del reclutador y de Chambot; el correo sale de la sesión
    res = client.post("/api/v1/applications/apply", json={
        "job_id": job["id"], "candidate_name": "Candi Dato", "candidate_email": "otro@correo.com", "municipio": "Apodaca",
    }, headers=cand)
    assert res.status_code == 200, res.text
    app = res.json()
    assert app["candidate_email"] == "dc_cand@test.com"
    assert app["empresa_nombre"] == "Planta Directa"
    assert [m["sender_type"] for m in app["messages"]] == ["recruiter", "bot"]

    # Idempotente: volver a dar clic devuelve la misma postulación, no una nueva
    again = client.post("/api/v1/applications/apply", json={"job_id": job["id"], "candidate_name": "Candi Dato"}, headers=cand).json()
    assert again["id"] == app["id"]

    # Mis chats directos
    mine = client.get("/api/v1/applications/mine", headers=cand).json()
    assert [a["id"] for a in mine] == [app["id"]]

    # El candidato escribe al reclutador: su nombre sale de la sesión
    msg = client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "¿Hay turno fijo?"}, headers=cand)
    assert msg.status_code == 200, msg.text
    assert msg.json()["sender_name"] == "Candi Dato"
    assert client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "   "}, headers=cand).status_code == 422

    # Un tercero no puede leer ni escribir (ni como candidato ni como reclutador)
    intruso = make_auth_header("dc_intruso@test.com", nombre="Intruso", role="candidate")
    assert client.get(f"/api/v1/applications/{app['id']}", headers=intruso).status_code == 403
    assert client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "hola"}, headers=intruso).status_code == 403
    otro_reclutador = make_auth_header("dc_otro_rh@test.com", nombre="Otro RH")
    _company_and_job(client, otro_reclutador, nombre="Planta Ajena")
    assert client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "recruiter", "mensaje": "hola"}, headers=otro_reclutador).status_code == 403
    assert client.get("/api/v1/applications/mine", headers=intruso).json() == []

    # Antes de los 2 minutos Chambot espera al reclutador
    fb = client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback", headers=cand).json()
    assert fb["triggered"] is False and fb["reason"] == "WAITING_RECRUITER"
    # Forzar el respaldo solo puede el reclutador
    assert client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback?force=true", headers=cand).status_code == 403

    # El reclutador de la empresa responde: silencia a Chambot y marca Contactado
    reply = client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "recruiter", "mensaje": "Sí, turno fijo de 6 a 2"}, headers=owner)
    assert reply.status_code == 200, reply.text
    assert reply.json()["sender_name"] == "DC Owner"

    detail = client.get(f"/api/v1/applications/{app['id']}", headers=cand).json()
    assert detail["bot_silenced"] is True
    assert detail["status"] == "Contactado"
    assert [m["sender_type"] for m in detail["messages"]] == ["recruiter", "bot", "candidate", "recruiter"]

    # La bandeja del portal la ve el reclutador de la empresa, no el otro
    assert any(a["id"] == app["id"] for a in client.get("/api/v1/applications", headers=owner).json())
    assert not any(a["id"] == app["id"] for a in client.get("/api/v1/applications", headers=otro_reclutador).json())

    # Endpoints protegidos
    assert client.get(f"/api/v1/applications/{app['id']}").status_code == 401
    assert client.get("/api/v1/applications/mine").status_code == 401
    assert client.get("/api/v1/applications/by-session/x").status_code == 401


def test_bot_fallback_answers_when_forced_by_recruiter(client):
    owner = make_auth_header("fb_owner@test.com", nombre="FB Owner")
    company, job = _company_and_job(client, owner, nombre="Planta Respaldo")
    cand = make_auth_header("fb_cand@test.com", nombre="Cand Respaldo", role="candidate")
    app = client.post("/api/v1/applications/apply", json={"job_id": job["id"], "candidate_name": "Cand Respaldo"}, headers=cand).json()

    client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "¿Cuánto pagan a la semana?"}, headers=cand)
    forced = client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback?force=true", headers=owner).json()
    assert forced["triggered"] is True
    assert "2,600" in forced["message"]["mensaje"]

    detail = client.get(f"/api/v1/applications/{app['id']}", headers=cand).json()
    assert detail["messages"][-1]["sender_type"] == "bot"
