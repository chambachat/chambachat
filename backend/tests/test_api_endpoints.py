"""
Tests de integración de la API sobre una base SQLite temporal (ver conftest.py).
"""
from conftest import make_auth_header


# ─── Salud y módulos públicos ─────────────────────────────────────────

def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_predict_retention_endpoint(client):
    payload = {"sueldo": 2500.0, "tiempo_traslado_min": 20, "turnos_fijos": True, "apoyo_inea": True}
    res = client.post("/api/v1/predict-retention", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["retention_months"] == 11.0
    assert data["retention_level"] == "Excelente"
    assert len(data["recommendations"]) > 0


def test_jobs_list(client):
    res = client.get("/api/v1/jobs")
    assert res.status_code == 200
    assert len(res.json()) >= 8


def test_candidates_list_requires_auth(client, admin_headers):
    assert client.get("/api/v1/candidates").status_code == 401
    res = client.get("/api/v1/candidates", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 100


def test_analytics_summary(client):
    res = client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["total_operarios"] >= 100
    assert data["total_vacantes"] >= 8
    assert data["tasa_inea_pct"] > 0
    assert data["permanencia_con_inea"] > data["permanencia_sin_inea"]


def test_chat_flow_and_jobs(client):
    start_res = client.get("/api/v1/chat/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    msg1 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "message": "Hola, busco trabajo de montacarguista en Apodaca",
    })
    assert msg1.status_code == 200
    res1 = msg1.json()
    assert len(res1["bot_messages"]) > 0
    assert len(res1["options"]) > 0

    msg2 = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "selected_option": "Buscar en Apodaca",
    })
    assert msg2.status_code == 200
    res2 = msg2.json()
    assert res2["candidate_profile"] is not None
    assert len(res2["matched_jobs"]) > 0
    assert any(j.get("titulo") for j in res2["matched_jobs"])


# ─── Autenticación ────────────────────────────────────────────────────

def test_send_code_does_not_leak_code(client):
    res = client.post("/api/v1/auth/send-verification-code", json={"email": "leak_e735a809@correo.com"})
    assert res.status_code == 200
    body = res.json()
    assert "code" not in body
    assert body["code_length"] == 6


def test_verify_code_wrong_returns_400_without_token(client):
    email = "test_auth_6b12f671@correo.com"
    assert client.post("/api/v1/auth/send-verification-code", json={"email": email}).status_code == 200

    res = client.post("/api/v1/auth/verify-code", json={"email": email, "code": "999999"})
    assert res.status_code == 400
    assert "token" not in res.json()


def test_verify_code_rejects_wrong_length(client):
    res = client.post("/api/v1/auth/verify-code", json={"email": "x@correo.com", "code": "1234"})
    assert res.status_code == 422


def test_verify_code_success_issues_jwt(client, monkeypatch):
    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "_generate_verification_code", lambda: "123456")
    email = "login_ok_51a2@correo.com"
    assert client.post("/api/v1/auth/send-verification-code", json={"email": email}).status_code == 200

    res = client.post("/api/v1/auth/verify-code", json={"email": email, "code": "123456"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "verified"
    assert body["token"]
    assert body["user"]["email"] == email

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == email

    # El mismo código no puede reutilizarse
    again = client.post("/api/v1/auth/verify-code", json={"email": email, "code": "123456"})
    assert again.status_code == 400


def test_profile_sync_requires_auth(client, admin_headers):
    payload = {
        "email": "rogelio@chambachat.com",
        "nombre": "Rogelio Valdez",
        "municipio": "Apodaca",
        "nivel_educativo": "Secundaria",
        "tag_inea": True,
        "telefono": "81-1234-5678",
    }
    assert client.post("/api/v1/auth/sync-google-profile", json=payload).status_code == 401
    res = client.post("/api/v1/auth/sync-google-profile", json=payload, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"


# ─── Protección de endpoints ──────────────────────────────────────────

def test_write_endpoints_require_token(client):
    assert client.post("/api/v1/companies", json={"nombre": "Sin Token SA"}).status_code == 401
    assert client.get("/api/v1/companies").status_code == 401
    assert client.get("/api/v1/applications").status_code == 401
    assert client.get("/api/v1/admin/prompts").status_code == 401


def test_admin_prompts_require_admin_role(client, recruiter_headers, admin_headers):
    assert client.get("/api/v1/admin/prompts", headers=recruiter_headers).status_code == 403
    assert client.get("/api/v1/admin/prompts", headers=admin_headers).status_code == 200


def _create_company(client, headers, nombre):
    res = client.post("/api/v1/companies", json={"nombre": nombre, "municipio": "Apodaca"}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["company"]


def test_company_isolation_between_users(client):
    headers_a = make_auth_header("empresa_a@test.com", nombre="Admin A")
    headers_b = make_auth_header("empresa_b@test.com", nombre="Admin B")

    company_a = _create_company(client, headers_a, "Planta A")
    company_b = _create_company(client, headers_b, "Planta B")

    # Cada usuario solo ve sus empresas
    ids_a = {c["id"] for c in client.get("/api/v1/companies", headers=headers_a).json()}
    assert company_a["id"] in ids_a
    assert company_b["id"] not in ids_a

    # Usuario B no puede tocar la empresa A
    route_payload = {
        "nombre": "Ruta Norte",
        "stops": [
            {"orden": 1, "nombre": "Parada 1", "horario": "05:30", "latitud": 25.78, "longitud": -100.19},
            {"orden": 2, "nombre": "Planta", "horario": "06:00", "latitud": 25.79, "longitud": -100.18},
        ],
    }
    create_route = client.post(f"/api/v1/companies/{company_a['id']}/routes", json=route_payload, headers=headers_a)
    assert create_route.status_code == 200
    route_id = create_route.json()["route"]["id"]
    assert create_route.json()["route"]["total_stops"] == 2

    forbidden_put = client.put(
        f"/api/v1/companies/{company_a['id']}/routes/{route_id}",
        json={"nombre": "Hackeada"},
        headers=headers_b,
    )
    assert forbidden_put.status_code == 403
    assert client.delete(f"/api/v1/companies/{company_a['id']}/routes/{route_id}", headers=headers_b).status_code == 403
    assert client.get(f"/api/v1/companies/{company_a['id']}/members", headers=headers_b).status_code == 403
    assert client.post(
        f"/api/v1/companies/{company_a['id']}/invite",
        json={"email": "intruso@test.com"},
        headers=headers_b,
    ).status_code == 403
    assert client.put(f"/api/v1/companies/{company_a['id']}", json={"nombre": "X"}, headers=headers_b).status_code == 403

    # El dueño sí puede
    ok_put = client.put(
        f"/api/v1/companies/{company_a['id']}/routes/{route_id}",
        json={"nombre": "Ruta Norte Editada"},
        headers=headers_a,
    )
    assert ok_put.status_code == 200
    assert ok_put.json()["route"]["nombre"] == "Ruta Norte Editada"


def test_team_invite_and_accept_flow(client):
    headers_admin = make_auth_header("owner_c@test.com", nombre="Owner C")
    headers_invited = make_auth_header("invitado_c@test.com", nombre="Invitado C")
    company = _create_company(client, headers_admin, "Planta C")

    invite = client.post(
        f"/api/v1/companies/{company['id']}/invite",
        json={"email": "invitado_c@test.com", "role": "recruiter"},
        headers=headers_admin,
    )
    assert invite.status_code == 200
    body = invite.json()
    assert body["token"].startswith("inv_")
    assert body["email_sent"] is False  # sin proveedor de correo en tests

    team = client.get(f"/api/v1/companies/{company['id']}/members", headers=headers_admin).json()
    assert team["total_members"] == 1
    assert team["total_pending"] == 1
    assert team["pending_invitations"][0]["invited_by"] == "owner_c@test.com"

    # Consulta pública de la invitación (sin sesión) para guiar el acceso del invitado
    lookup = client.get(f"/api/v1/companies/invitations/{body['token']}")
    assert lookup.status_code == 200
    info = lookup.json()
    assert info["email"] == "invitado_c@test.com"
    assert info["status"] == "pending"
    assert info["company"]["nombre"] == "Planta C"
    assert info["inviter_email"] == "owner_c@test.com"
    assert info["has_account"] is True  # make_auth_header ya creó al invitado
    assert client.get("/api/v1/companies/invitations/inv_no_existe").status_code == 404

    # Invitado sin cuenta previa → has_account False (el modal ofrecerá crear la cuenta)
    nueva = client.post(
        f"/api/v1/companies/{company['id']}/invite",
        json={"email": "sin_cuenta_c@test.com"},
        headers=headers_admin,
    ).json()
    assert client.get(f"/api/v1/companies/invitations/{nueva['token']}").json()["has_account"] is False

    # Aceptar sin token → 401; con token del invitado → se une con SU email
    assert client.post("/api/v1/companies/accept-invitation", json={"token": body["token"]}).status_code == 401
    accept = client.post(
        "/api/v1/companies/accept-invitation",
        json={"token": body["token"], "user_email": "otro@test.com"},
        headers=headers_invited,
    )
    assert accept.status_code == 200
    assert accept.json()["member"]["email"] == "invitado_c@test.com"

    ids_invited = {c["id"] for c in client.get("/api/v1/companies", headers=headers_invited).json()}
    assert company["id"] in ids_invited
    assert client.get(f"/api/v1/companies/invitations/{body['token']}").json()["status"] == "accepted"


def test_company_shifts_defaults_and_crud(client):
    headers = make_auth_header("shifts@test.com", nombre="Shifts")
    company = _create_company(client, headers, "Planta Turnos")

    shifts = client.get(f"/api/v1/companies/{company['id']}/shifts").json()
    assert len(shifts) == 5
    assert shifts[0]["dias"]

    created = client.post(
        f"/api/v1/companies/{company['id']}/shifts",
        json={"nombre": "Turno Especial", "hora_entrada": "10:00", "hora_salida": "18:00"},
        headers=headers,
    )
    assert created.status_code == 200
    shift_id = created.json()["shift"]["id"]
    assert created.json()["shift"]["tipo"] == "Fijo"

    updated = client.put(
        f"/api/v1/companies/{company['id']}/shifts/{shift_id}",
        json={"hora_salida": "19:00"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["shift"]["hora_salida"] == "19:00"

    deleted = client.delete(f"/api/v1/companies/{company['id']}/shifts/{shift_id}", headers=headers)
    assert deleted.status_code == 200
    assert len(client.get(f"/api/v1/companies/{company['id']}/shifts").json()) == 5


def test_applications_scoped_to_member_companies(client):
    headers = make_auth_header("apps_owner@test.com", nombre="Apps Owner")
    res = client.get("/api/v1/applications", headers=headers)
    assert res.status_code == 200
    # Este usuario no es miembro de ninguna empresa con vacantes → no ve postulaciones ajenas
    assert res.json() == []


def test_revoke_invitation_when_ids_collide(client):
    """Miembro id=N e invitación id=N en la misma empresa: revocar la invitación no debe tocar al miembro."""
    headers = make_auth_header("collide@test.com", nombre="Collide")
    company = _create_company(client, headers, "Planta Colisión")
    client.post(f"/api/v1/companies/{company['id']}/invite", json={"email": "pend@test.com"}, headers=headers)
    team = client.get(f"/api/v1/companies/{company['id']}/members", headers=headers).json()
    inv_id = team["pending_invitations"][0]["id"]

    res = client.delete(f"/api/v1/companies/{company['id']}/members/{inv_id}?type=invitation", headers=headers)
    assert res.status_code == 200

    after = client.get(f"/api/v1/companies/{company['id']}/members", headers=headers).json()
    assert after["total_pending"] == 0
    assert after["total_members"] == 1  # el propio admin sigue en el equipo

    # Un miembro no puede eliminarse a sí mismo
    me_id = after["active_members"][0]["id"]
    self_delete = client.delete(f"/api/v1/companies/{company['id']}/members/{me_id}?type=member", headers=headers)
    assert self_delete.status_code == 400
