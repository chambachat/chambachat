"""
Entrevista rápida de Chambot al abrir el chat directo: preguntas derivadas de la vacante,
respuestas libres interpretadas, compatibilidad para el reclutador, y reutilización de lo ya
conocido del candidato en la siguiente postulación.
"""
from conftest import make_auth_header

from app.services.screening_service import EXPERIENCIA_OPCIONES

JOB_BASE = {
    "titulo": "Montacarguista de Almacén", "sueldo_semanal_libre": 3200, "municipio": "Apodaca",
    "latitud": 25.78, "longitud": -100.19, "categoria": "Montacarguista",
    "experiencia_minima": "1 año", "escolaridad_minima": "Secundaria",
    "certificaciones": ["Licencia de montacargas (DC-3)"], "requisitos_fisicos": ["Trabajo de pie prolongado"],
    "tipo_turno": "Fijo matutino", "hora_entrada": "06:00", "hora_salida": "14:00", "dias_laborales": "Lunes a Sábado",
}


def _setup(client, owner_email, company_name):
    owner = make_auth_header(owner_email, nombre="Owner Screening")
    company = client.post("/api/v1/companies", json={"nombre": company_name, "municipio": "Apodaca"}, headers=owner).json()["company"]
    job = client.post("/api/v1/jobs", json={**JOB_BASE, "company_id": company["id"]}, headers=owner)
    assert job.status_code == 200, job.text
    return owner, company, job.json()


def _apply(client, headers, job_id, name):
    res = client.post("/api/v1/applications/apply", json={"job_id": job_id, "candidate_name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def _answer(client, headers, app_id, text):
    res = client.post(f"/api/v1/applications/{app_id}/messages", json={"sender_type": "candidate", "mensaje": text}, headers=headers)
    assert res.status_code == 200, res.text
    return client.get(f"/api/v1/applications/{app_id}", headers=headers).json()


def test_screening_full_flow_high_match_and_profile_reuse(client):
    owner, company, job = _setup(client, "scr_owner@test.com", "Planta Screening")
    cand = make_auth_header("scr_cand@test.com", nombre="Juan Pérez", role="candidate")

    app = _apply(client, cand, job["id"], "Juan Pérez")
    assert app["screening_status"] == "in_progress"
    assert app["screening"]["total"] == 7
    assert app["screening"]["step_key"] == "experiencia"
    assert app["screening"]["options"] == EXPERIENCIA_OPCIONES
    assert [m["sender_type"] for m in app["messages"]] == ["recruiter", "bot", "bot"]
    assert "7 preguntas" in app["messages"][1]["mensaje"]

    # Mientras hay entrevista, el respaldo automático de 2 minutos no interviene
    fb = client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback", headers=cand).json()
    assert fb["reason"] == "SCREENING_IN_PROGRESS"

    # Una duda sobre la vacante se contesta al momento y se repite la pregunta pendiente
    a = _answer(client, cand, app["id"], "¿Cuánto pagan a la semana?")
    assert a["screening"]["step_key"] == "experiencia"
    assert "3,200" in a["messages"][-2]["mensaje"]
    assert "seguimos" in a["messages"][-1]["mensaje"].lower()

    # Respuestas: texto libre interpretado + opciones
    a = _answer(client, cand, app["id"], "tengo 3 años manejando montacargas")
    assert a["screening"]["step_key"] == "escolaridad"
    a = _answer(client, cand, app["id"], "la prepa")
    assert a["screening"]["step_key"] == "cert:Licencia de montacargas (DC-3)"
    a = _answer(client, cand, app["id"], "sí tengo")
    assert a["screening"]["step_key"] == "condiciones"
    a = _answer(client, cand, app["id"], "Sí, sin problema")
    assert a["screening"]["step_key"] == "turno"
    a = _answer(client, cand, app["id"], "Sí, me acomoda")
    assert a["screening"]["step_key"] == "ubicacion"
    assert a["screening"]["options"] == []
    a = _answer(client, cand, app["id"], "Huinalá, Apodaca")
    assert a["screening"]["step_key"] == "disponibilidad"
    a = _answer(client, cand, app["id"], "De inmediato")

    assert a["screening_status"] == "done"
    assert a["match_level"] == "Alta"
    assert a["match_score"] >= 90
    assert "envié tu información" in a["messages"][-1]["mensaje"]
    ans = a["screening_answers"]
    assert ans["experiencia"]["respuesta"] == "Más de 2 años"
    assert ans["escolaridad"]["respuesta"] == "Preparatoria / Bachillerato"
    assert ans["cert:Licencia de montacargas (DC-3)"]["respuesta"] == "Sí"
    assert ans["ubicacion"]["municipio"] == "Apodaca"
    assert a["municipio"] == "Apodaca"
    assert {b["criterio"] for b in a["match_breakdown"]} == {"Experiencia", "Escolaridad", "Certificaciones", "Condiciones del puesto", "Turno", "Cercanía", "Disponibilidad"}

    # El reclutador ve compatibilidad y respuestas en su bandeja
    inbox = client.get("/api/v1/applications", headers=owner).json()
    mine = next(x for x in inbox if x["id"] == app["id"])
    assert mine["match_level"] == "Alta" and mine["screening_answers"]["experiencia"]["respuesta"] == "Más de 2 años"

    # Terminada la entrevista, el respaldo forzado por el reclutador sí contesta
    _answer(client, cand, app["id"], "¿A qué hora es la entrada?")
    forced = client.post(f"/api/v1/applications/{app['id']}/check-bot-fallback?force=true", headers=owner).json()
    assert forced["triggered"] is True and "06:00" in forced["message"]["mensaje"]

    # Segunda postulación del mismo candidato: no se repite lo ya conocido (solo condiciones, turno y disponibilidad)
    job2 = client.post("/api/v1/jobs", json={**JOB_BASE, "company_id": company["id"], "titulo": "Montacarguista Turno 2"}, headers=owner).json()
    app2 = _apply(client, cand, job2["id"], "Juan Pérez")
    assert app2["screening"]["total"] == 3
    assert app2["screening"]["step_key"] == "condiciones"
    assert "Ya tengo" in app2["messages"][1]["mensaje"]
    assert "tu experiencia" in app2["messages"][1]["mensaje"]


def test_screening_low_match_and_early_finish_when_everything_known(client):
    owner, company, job = _setup(client, "scr_owner2@test.com", "Planta Screening 2")
    cand = make_auth_header("scr_cand2@test.com", nombre="Pedro Lejos", role="candidate")
    app = _apply(client, cand, job["id"], "Pedro Lejos")

    for text in ["Sin experiencia", "Sin estudios", "No", "No", "No puedo ese turno", "Centro, Cadereyta", "En un mes"]:
        a = _answer(client, cand, app["id"], text)
    assert a["screening_status"] == "done"
    assert a["match_level"] == "Baja"
    assert a["match_score"] < 20

    # Candidato con ubicación confirmada en el perfil: no se le pregunta dónde vive
    cand3 = make_auth_header("scr_cand3@test.com", nombre="Ana Cerca", role="candidate")
    client.patch("/api/v1/auth/me/location", json={"latitud": 25.781, "longitud": -100.19, "colonia": "Huinalá", "municipio": "Apodaca"}, headers=cand3)
    app3 = _apply(client, cand3, job["id"], "Ana Cerca")
    keys = [s for s in [app3["screening"]["step_key"]]]
    assert app3["screening"]["total"] == 6
    assert "tu ubicación" in app3["messages"][1]["mensaje"]
    assert keys == ["experiencia"]


def _make_legacy(app_id):
    """Simula una postulación creada antes de la entrevista rápida (sin estado ni mensajes de Chambot)."""
    from conftest import SessionLocal
    from app.models import ApplicationMessage, JobApplication

    db = SessionLocal()
    try:
        rec = db.get(JobApplication, app_id)
        rec.screening_status = "none"
        rec.screening_state = None
        db.query(ApplicationMessage).filter(
            ApplicationMessage.application_id == app_id, ApplicationMessage.sender_type == "bot"
        ).delete()
        db.commit()
    finally:
        db.close()


def test_legacy_applications_start_interview_when_candidate_returns(client):
    owner, company, job = _setup(client, "scr_owner_legacy@test.com", "Planta Legacy")
    cand = make_auth_header("scr_cand_legacy@test.com", nombre="Luis Legado", role="candidate")

    # Caso 1: vuelve a abrir el chat directo (apply idempotente) → Chambot arranca la entrevista
    app = _apply(client, cand, job["id"], "Luis Legado")
    _make_legacy(app["id"])
    assert client.get(f"/api/v1/applications/{app['id']}", headers=cand).json()["screening_status"] == "none"
    again = _apply(client, cand, job["id"], "Luis Legado")
    assert again["id"] == app["id"]
    assert again["screening_status"] == "in_progress"
    assert again["screening"]["step_key"] == "experiencia"
    assert again["messages"][-1]["sender_type"] == "bot"

    # Caso 2: escribe en el chat sin haber tenido entrevista → arranca sin consumir su mensaje como respuesta
    job2 = client.post("/api/v1/jobs", json={**JOB_BASE, "company_id": company["id"], "titulo": "Montacarguista Legacy 2"}, headers=owner).json()
    app2 = _apply(client, cand, job2["id"], "Luis Legado")
    _make_legacy(app2["id"])
    a = _answer(client, cand, app2["id"], "Hola, me interesa la vacante")
    assert a["screening_status"] == "in_progress"
    assert a["screening"]["index"] == 1
    assert any(m["sender_type"] == "candidate" and "me interesa" in m["mensaje"] for m in a["messages"])
    assert a["messages"][-1]["sender_type"] == "bot"
