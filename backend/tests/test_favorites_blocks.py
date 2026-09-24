"""
Candidatos preferidos por empresa, bloqueos en ambos sentidos y código verificador del Smart Link.
"""
from conftest import make_auth_header

APODACA = (25.7816, -100.1887)


def _company_and_job(client, owner, nombre, titulo="Montacarguista Bloqueo Test"):
    company = client.post("/api/v1/companies", json={"nombre": nombre, "municipio": "Apodaca"}, headers=owner).json()["company"]
    job = client.post("/api/v1/jobs", json={
        "company_id": company["id"], "titulo": titulo, "sueldo_semanal_libre": 3000,
        "municipio": "Apodaca", "latitud": APODACA[0], "longitud": APODACA[1],
    }, headers=owner)
    assert job.status_code == 200, job.text
    return company, job.json()


def _apply(client, headers, job_id, name):
    res = client.post("/api/v1/applications/apply", json={"job_id": job_id, "candidate_name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def _msg(client, headers, app_id, sender_type, text):
    return client.post(f"/api/v1/applications/{app_id}/messages", json={"sender_type": sender_type, "mensaje": text}, headers=headers)


# ─── Candidatos preferidos ───────────────────────────────────────────

def test_favorites_flow(client):
    owner = make_auth_header("fav_owner@test.com", nombre="Fav Owner")
    company, job = _company_and_job(client, owner, "Planta Favoritos")
    cand = make_auth_header("fav_cand@test.com", nombre="Fav Cand", role="candidate")
    app = _apply(client, cand, job["id"], "Fav Cand")

    res = client.post(f"/api/v1/companies/{company['id']}/favorites", json={
        "candidate_email": "FAV_CAND@test.com", "candidate_name": "Fav Cand", "application_id": app["id"], "nota": "Buen perfil, llamar lunes",
    }, headers=owner)
    assert res.status_code == 200, res.text
    fav = res.json()
    assert fav["candidate_email"] == "fav_cand@test.com"
    assert fav["nota"] == "Buen perfil, llamar lunes"
    assert fav["application"]["id"] == app["id"]
    assert fav["application"]["job_titulo"] == job["titulo"]

    # Idempotente por correo (actualiza la nota)
    again = client.post(f"/api/v1/companies/{company['id']}/favorites", json={"candidate_email": "fav_cand@test.com", "nota": "Ya entrevistado"}, headers=owner).json()
    assert again["id"] == fav["id"] and again["nota"] == "Ya entrevistado"

    lista = client.get(f"/api/v1/companies/{company['id']}/favorites", headers=owner).json()
    assert [f["id"] for f in lista] == [fav["id"]]

    # La postulación en la bandeja trae favorite_id
    inbox = client.get("/api/v1/applications", headers=owner).json()
    mine = next(a for a in inbox if a["id"] == app["id"])
    assert mine["favorite_id"] == fav["id"]

    # Otro reclutador (no miembro) no puede ver ni marcar
    otro = make_auth_header("fav_otro@test.com", nombre="Otro")
    assert client.get(f"/api/v1/companies/{company['id']}/favorites", headers=otro).status_code == 403
    assert client.post(f"/api/v1/companies/{company['id']}/favorites", json={"candidate_email": "x@test.com"}, headers=otro).status_code == 403

    assert client.delete(f"/api/v1/companies/{company['id']}/favorites/{fav['id']}", headers=owner).status_code == 200
    assert client.get(f"/api/v1/companies/{company['id']}/favorites", headers=owner).json() == []
    inbox = client.get("/api/v1/applications", headers=owner).json()
    assert next(a for a in inbox if a["id"] == app["id"])["favorite_id"] is None


# ─── Bloqueos ────────────────────────────────────────────────────────

def test_company_blocks_candidate(client):
    owner = make_auth_header("blk_owner@test.com", nombre="Blk Owner")
    company, job = _company_and_job(client, owner, "Planta Bloqueo")
    job2 = client.post("/api/v1/jobs", json={
        "company_id": company["id"], "titulo": "Otra vacante", "sueldo_semanal_libre": 2500,
        "municipio": "Apodaca", "latitud": APODACA[0], "longitud": APODACA[1],
    }, headers=owner).json()
    cand = make_auth_header("blk_cand@test.com", nombre="Blk Cand", role="candidate")
    app = _apply(client, cand, job["id"], "Blk Cand")

    # El candidato no puede bloquearse "como empresa", ni un no-miembro
    assert client.post("/api/v1/blocks", json={"blocker_type": "company", "company_id": company["id"], "candidate_email": "blk_cand@test.com"}, headers=cand).status_code == 403

    res = client.post("/api/v1/blocks", json={"blocker_type": "company", "company_id": company["id"], "candidate_email": "blk_cand@test.com", "reason": "Mensajes ofensivos"}, headers=owner)
    assert res.status_code == 200, res.text
    block = res.json()
    assert block["blocker_type"] == "company" and block["mine"] is True

    # Se corta la comunicación en ambos sentidos y no puede postularse a otra vacante de la empresa
    assert _msg(client, cand, app["id"], "candidate", "hola").status_code == 403
    assert _msg(client, owner, app["id"], "recruiter", "hola").status_code == 403
    denied = client.post("/api/v1/applications/apply", json={"job_id": job2["id"], "candidate_name": "Blk Cand"}, headers=cand)
    assert denied.status_code == 403

    detail = client.get(f"/api/v1/applications/{app['id']}", headers=owner).json()
    assert detail["blocked_by_company"] is True and detail["blocked_by_candidate"] is False
    assert client.get(f"/api/v1/applications/{app['id']}", headers=cand).json()["blocked_by_company"] is True

    # Solo la empresa ve y puede quitar su bloqueo
    assert [b["id"] for b in client.get("/api/v1/blocks/mine", headers=owner).json()] == [block["id"]]
    assert client.get("/api/v1/blocks/mine", headers=cand).json() == []
    assert client.delete(f"/api/v1/blocks/{block['id']}", headers=cand).status_code == 403
    assert client.delete(f"/api/v1/blocks/{block['id']}", headers=owner).status_code == 200
    assert _msg(client, cand, app["id"], "candidate", "hola de nuevo").status_code == 200


def test_candidate_blocks_company_and_chat_hides_its_jobs(client):
    owner = make_auth_header("blk2_owner@test.com", nombre="Blk2 Owner")
    company, job = _company_and_job(client, owner, "Planta Bloqueada Por Candidato")
    cand = make_auth_header("blk2_cand@test.com", nombre="Blk2 Cand", role="candidate")
    app = _apply(client, cand, job["id"], "Blk2 Cand")

    # Antes del bloqueo, el chat sí le propone la vacante (coincide el puesto y está a 0 km)
    session_id = client.get("/api/v1/chat/start").json()["session_id"]
    before = client.post("/api/v1/chat/message", json={
        "session_id": session_id, "message": "Busco jale de montacarguista en Apodaca",
        "user_email": "blk2_cand@test.com", "user_name": "Blk2 Cand",
    }).json()
    assert any(j["id"] == job["id"] for j in before["matched_jobs"])

    res = client.post("/api/v1/blocks", json={"blocker_type": "candidate", "company_id": company["id"], "reason": "Insistencia fuera de horario"}, headers=cand)
    assert res.status_code == 200, res.text
    block = res.json()
    assert block["candidate_email"] == "blk2_cand@test.com" and block["mine"] is True

    # La empresa ya no puede escribirle ni él a ella; tampoco postularse
    assert _msg(client, owner, app["id"], "recruiter", "hola").status_code == 403
    assert _msg(client, cand, app["id"], "candidate", "hola").status_code == 403
    assert client.post("/api/v1/applications/apply", json={"job_id": job["id"], "candidate_name": "Blk2 Cand"}, headers=cand).status_code == 403

    detail = client.get(f"/api/v1/applications/{app['id']}", headers=owner).json()
    assert detail["blocked_by_candidate"] is True

    # El chat deja de proponer vacantes de esa empresa
    after = client.post("/api/v1/chat/message", json={
        "session_id": session_id, "message": "Muéstrame vacantes de montacarguista en Apodaca",
        "user_email": "blk2_cand@test.com", "user_name": "Blk2 Cand",
    }).json()
    assert not any(j["id"] == job["id"] for j in after["matched_jobs"])

    # La empresa lo ve en sus bloqueos pero no puede quitarlo; el candidato sí
    visto = client.get("/api/v1/blocks/mine", headers=owner).json()
    assert any(b["id"] == block["id"] and b["mine"] is False for b in visto)
    assert client.delete(f"/api/v1/blocks/{block['id']}", headers=owner).status_code == 403
    assert client.delete(f"/api/v1/blocks/{block['id']}", headers=cand).status_code == 200
    assert _msg(client, owner, app["id"], "recruiter", "hola").status_code == 200


# ─── Smart Link con código verificador ───────────────────────────────

def test_smart_link_code_resolves_company_and_jobs(client):
    owner = make_auth_header("smart_owner@test.com", nombre="Smart Owner")
    company_a, job_a = _company_and_job(client, owner, "Industrias Similares SA", titulo="Vacante A")
    company_b, job_b = _company_and_job(client, owner, "Industrias Similares SA de CV", titulo="Vacante B")

    code_a, code_b = company_a["smart_code"], company_b["smart_code"]
    assert code_a and code_b and code_a != code_b
    assert len(code_a) == 6 and code_a.isalnum() and code_a == code_a.upper()

    # Resolución pública por código (sin sesión)
    pub = client.get(f"/api/v1/companies/by-code/{code_a.lower()}")
    assert pub.status_code == 200
    assert pub.json()["nombre"] == "Industrias Similares SA" and pub.json()["smart_code"] == code_a
    assert client.get("/api/v1/companies/by-code/ZZZZZZ").status_code == 404

    # Las vacantes por código no se confunden entre razones sociales parecidas
    jobs_a = client.get(f"/api/v1/jobs?company_code={code_a}").json()
    assert [j["id"] for j in jobs_a] == [job_a["id"]]
    assert client.get("/api/v1/jobs?company_code=ZZZZZZ").json() == []
    # Por nombre (enlace antiguo) sí se mezclan: por eso el código es el verificador
    por_nombre = client.get("/api/v1/jobs?empresa=Industrias%20Similares%20SA").json()
    assert {j["id"] for j in por_nombre} >= {job_a["id"], job_b["id"]}

    # El listado del usuario también trae el código
    mine = client.get("/api/v1/companies", headers=owner).json()
    assert all(c["smart_code"] for c in mine)
