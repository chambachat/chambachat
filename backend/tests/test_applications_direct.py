"""
Chat directo candidato ↔ reclutadores: postulación idempotente, permisos por rol y
respaldo de Chambot. Cada postulación es un hilo independiente que abre con la
entrevista rápida de Chambot (ver test_screening.py).
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


def _complete_screening(client, headers, app_id):
    """Contesta la entrevista con la primera opción disponible (o un texto) hasta terminarla."""
    for _ in range(10):
        app = client.get(f"/api/v1/applications/{app_id}", headers=headers).json()
        if app["screening_status"] != "in_progress":
            return app
        step = app["screening"]
        text = step["options"][0] if step["options"] else "Huinalá, Apodaca"
        client.post(f"/api/v1/applications/{app_id}/messages", json={"sender_type": "candidate", "mensaje": text}, headers=headers)
    raise AssertionError("la entrevista no terminó")


def test_direct_chat_flow_and_permissions(client):
    owner = make_auth_header("dc_owner@test.com", nombre="DC Owner")
    company, job = _company_and_job(client, owner)
    cand = make_auth_header("dc_cand@test.com", nombre="Candi Dato", role="candidate")

    # Postularse abre el hilo: saludo del reclutador + intro y primera pregunta de Chambot; el correo sale de la sesión
    res = client.post("/api/v1/applications/apply", json={
        "job_id": job["id"], "candidate_name": "Candi Dato", "candidate_email": "otro@correo.com", "municipio": "Apodaca",
    }, headers=cand)
    assert res.status_code == 200, res.text
    app = res.json()
    assert app["candidate_email"] == "dc_cand@test.com"
    assert app["empresa_nombre"] == "Planta Directa"
    assert [m["sender_type"] for m in app["messages"]][:2] == ["recruiter", "bot"]
    assert app["screening_status"] == "in_progress"

    # Idempotente: volver a dar clic devuelve la misma postulación, no una nueva
    again = client.post("/api/v1/applications/apply", json={"job_id": job["id"], "candidate_name": "Candi Dato"}, headers=cand).json()
    assert again["id"] == app["id"]

    # Mis chats directos
    mine = client.get("/api/v1/applications/mine", headers=cand).json()
    assert [a["id"] for a in mine] == [app["id"]]

    # El candidato escribe: su nombre sale de la sesión; los vacíos se rechazan
    msg = client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "¿Hay turno fijo?"}, headers=cand)
    assert msg.status_code == 200, msg.text
    assert msg.json()["sender_name"] == "Candi Dato"
    assert client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "   "}, headers=cand).status_code == 422

    # Un tercero no puede leer ni escribir (ni como candidato ni como reclutador de otra empresa)
    intruso = make_auth_header("dc_intruso@test.com", nombre="Intruso", role="candidate")
    assert client.get(f"/api/v1/applications/{app['id']}", headers=intruso).status_code == 403
    assert client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "hola"}, headers=intruso).status_code == 403
    otro_reclutador = make_auth_header("dc_otro_rh@test.com", nombre="Otro RH")
    _company_and_job(client, otro_reclutador, nombre="Planta Ajena")
    assert client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "recruiter", "mensaje": "hola"}, headers=otro_reclutador).status_code == 403
    assert client.get("/api/v1/applications/mine", headers=intruso).json() == []

    # Forzar el respaldo de Chambot solo puede el reclutador
    assert client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback?force=true", headers=cand).status_code == 403

    # El reclutador de la empresa responde: silencia a Chambot y marca Contactado
    reply = client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "recruiter", "mensaje": "Sí, turno fijo de 6 a 2"}, headers=owner)
    assert reply.status_code == 200, reply.text
    assert reply.json()["sender_name"] == "DC Owner"

    detail = client.get(f"/api/v1/applications/{app['id']}", headers=cand).json()
    assert detail["bot_silenced"] is True
    assert detail["status"] == "Contactado"
    assert detail["messages"][-1]["sender_type"] == "recruiter"
    assert any(m["sender_type"] == "candidate" for m in detail["messages"])

    # La bandeja del portal la ve el reclutador de la empresa, no el otro
    assert any(a["id"] == app["id"] for a in client.get("/api/v1/applications", headers=owner).json())
    assert not any(a["id"] == app["id"] for a in client.get("/api/v1/applications", headers=otro_reclutador).json())

    # Endpoints protegidos
    assert client.get(f"/api/v1/applications/{app['id']}").status_code == 401
    assert client.get("/api/v1/applications/mine").status_code == 401
    assert client.get("/api/v1/applications/by-session/x").status_code == 401


def test_bot_answers_questions_during_screening_and_fallback_after(client):
    owner = make_auth_header("fb_owner@test.com", nombre="FB Owner")
    company, job = _company_and_job(client, owner, nombre="Planta Respaldo")
    cand = make_auth_header("fb_cand@test.com", nombre="Cand Respaldo", role="candidate")
    app = client.post("/api/v1/applications/apply", json={"job_id": job["id"], "candidate_name": "Cand Respaldo"}, headers=cand).json()

    # Durante la entrevista, una duda de sueldo se contesta de inmediato con los datos de la vacante
    client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "¿Cuánto pagan a la semana?"}, headers=cand)
    detail = client.get(f"/api/v1/applications/{app['id']}", headers=cand).json()
    assert any(m["sender_type"] == "bot" and "2,600" in m["mensaje"] for m in detail["messages"])
    assert detail["screening_status"] == "in_progress"

    # Terminada la entrevista, aplica la regla de 2 minutos: antes espera; forzada por el reclutador, contesta
    done = _complete_screening(client, cand, app["id"])
    assert done["screening_status"] == "done"
    assert done["match_score"] is not None and done["match_level"] in {"Alta", "Media", "Baja"}

    client.post(f"/api/v1/applications/{app['id']}/messages", json={"sender_type": "candidate", "mensaje": "¿Cuánto pagan a la semana?"}, headers=cand)
    waiting = client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback", headers=cand).json()
    assert waiting["triggered"] is False and waiting["reason"] == "WAITING_RECRUITER"
    forced = client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback?force=true", headers=owner).json()
    assert forced["triggered"] is True
    assert "2,600" in forced["message"]["mensaje"]


def test_recruiter_can_delete_conversation(client):
    owner = make_auth_header("del_owner@test.com", nombre="Del Owner")
    company, job = _company_and_job(client, owner, nombre="Planta Borrar")
    cand = make_auth_header("del_cand@test.com", nombre="Cand Borrar", role="candidate")
    app = client.post("/api/v1/applications/apply", json={"job_id": job["id"], "candidate_name": "Cand Borrar"}, headers=cand).json()

    # Ni el candidato ni un reclutador de otra empresa pueden borrarla; sin sesión tampoco
    otro_rh = make_auth_header("del_otro_rh@test.com", nombre="Otro RH")
    assert client.delete(f"/api/v1/applications/{app['id']}", headers=cand).status_code == 403
    assert client.delete(f"/api/v1/applications/{app['id']}", headers=otro_rh).status_code == 403
    assert client.delete(f"/api/v1/applications/{app['id']}").status_code == 401

    # El reclutador de la empresa sí: desaparece para todos, con sus mensajes
    res = client.delete(f"/api/v1/applications/{app['id']}", headers=owner)
    assert res.status_code == 200 and res.json()["deleted_id"] == app["id"]
    assert client.get(f"/api/v1/applications/{app['id']}", headers=owner).status_code == 404
    assert client.get("/api/v1/applications/mine", headers=cand).json() == []
    assert not any(a["id"] == app["id"] for a in client.get("/api/v1/applications", headers=owner).json())
    assert client.delete(f"/api/v1/applications/{app['id']}", headers=owner).status_code == 404
