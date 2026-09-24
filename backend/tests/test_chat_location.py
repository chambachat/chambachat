"""
Ubicación del candidato y rutas en el chat:
- la ubicación se pide una vez; registrada, solo se vuelve a pedir si quiere cambiarla o buscar en otro lado
- las rutas de transporte solo se calculan cuando el candidato las pide
- la ubicación también se registra desde el perfil (PATCH /auth/me/location) y el chat la reutiliza
"""
from conftest import make_auth_header

APODACA = (25.7816, -100.1887)


def _chat(client, session_id, **kwargs):
    payload = {"session_id": session_id}
    payload.update(kwargs)
    res = client.post("/api/v1/chat/message", json=payload)
    assert res.status_code == 200, res.text
    return res.json()


def _create_route_near_apodaca(client):
    headers = make_auth_header("rutas_owner@test.com", nombre="Rutas Owner")
    company = client.post("/api/v1/companies", json={"nombre": "Planta Rutas", "municipio": "Apodaca"}, headers=headers).json()["company"]
    route = client.post(
        f"/api/v1/companies/{company['id']}/routes",
        json={
            "nombre": "Ruta Huinalá",
            "stops": [
                {"orden": 1, "nombre": "Parada Huinalá", "horario": "05:40", "latitud": 25.7830, "longitud": -100.1900},
                {"orden": 2, "nombre": "Planta", "horario": "06:10", "latitud": 25.7900, "longitud": -100.1800},
            ],
        },
        headers=headers,
    )
    assert route.status_code == 200, route.text


def test_routes_only_when_requested_and_location_asked_once(client):
    _create_route_near_apodaca(client)
    session_id = client.get("/api/v1/chat/start").json()["session_id"]

    # Búsqueda normal: sin rutas y sin pedir ubicación
    r1 = _chat(client, session_id, message="Busco jale de montacarguista en Apodaca")
    assert r1["nearby_routes"] == []
    assert r1["ask_location"] is False
    assert r1["location_known"] is False

    # Comparte ubicación: se guarda, se calculan vacantes cercanas, pero NO rutas
    r2 = _chat(
        client, session_id,
        message="📍 Compartí mi ubicación en Huinalá, Apodaca",
        candidate_lat=APODACA[0], candidate_lon=APODACA[1],
        candidate_colonia="Huinalá", candidate_municipio="Apodaca",
    )
    assert r2["location_known"] is True
    assert r2["ask_location"] is False
    assert r2["nearby_routes"] == []
    assert "Huinalá" in r2["bot_messages"][0]
    assert r2["matched_jobs"]
    assert not any("compartir" in o["label"].lower() for o in r2["options"])
    assert r2["candidate_profile"]["ubicacion_confirmada"] is True

    # Pide rutas explícitamente → ahora sí se calculan
    r3 = _chat(client, session_id, message="¿Qué rutas de transporte pasan cerca de mi colonia?")
    assert len(r3["nearby_routes"]) >= 1
    assert r3["nearby_routes"][0]["empresa_nombre"] == "Planta Rutas"
    assert r3["ask_location"] is False

    # Siguiente mensaje sin pedir rutas → no se vuelven a mostrar
    r4 = _chat(client, session_id, message="¿Cuánto pagan de tiempo extra?")
    assert r4["nearby_routes"] == []
    assert r4["ask_location"] is False
    assert not any("compartir" in o["label"].lower() for o in r4["options"])

    # Quiere cambiar su ubicación → se le pide en ese momento
    r5 = _chat(client, session_id, message="Me mudé, quiero cambiar mi ubicación")
    assert r5["ask_location"] is True
    assert any("ubicaci" in o["value"].lower() for o in r5["options"])

    # Busca en otro municipio teniendo ubicación registrada → busca allá y ofrece cambiar la ubicación
    r6 = _chat(client, session_id, message="Mejor busca vacantes en Pesquería")
    assert r6["ask_location"] is True
    assert r6["matched_jobs"]
    assert any("Pesquería" in m for m in r6["bot_messages"])


def test_routes_request_without_location_asks_for_it(client):
    session_id = client.get("/api/v1/chat/start").json()["session_id"]
    r = _chat(client, session_id, message="¿Qué camiones pasan por mi casa?")
    assert r["ask_location"] is True
    assert r["nearby_routes"] == []
    assert r["location_known"] is False
    assert any("compartir" in o["label"].lower() for o in r["options"])


def test_update_my_location_from_profile_and_chat_reuses_it(client):
    assert client.patch("/api/v1/auth/me/location", json={"latitud": 25.78, "longitud": -100.19}).status_code == 401

    headers = make_auth_header("loc_user@test.com", nombre="Loc User", role="candidate")
    res = client.patch(
        "/api/v1/auth/me/location",
        json={"latitud": APODACA[0], "longitud": APODACA[1], "colonia": "Huinalá", "municipio": "Apodaca"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["colonia"] == "Huinalá"
    assert body["municipio"] == "Apodaca"
    assert body["ubicacion_confirmada"] is True
    assert body["latitud"] == APODACA[0]

    me = client.get("/api/v1/auth/me", headers=headers).json()
    assert me["colonia"] == "Huinalá" and me["ubicacion_confirmada"] is True
    assert client.patch("/api/v1/auth/me/location", json={"latitud": 95, "longitud": 0}, headers=headers).status_code == 422

    # El sync de perfil al iniciar sesión ya no pisa la ubicación confirmada con el centro del municipio
    sync = client.post("/api/v1/auth/sync-google-profile", json={
        "email": "loc_user@test.com", "nombre": "Loc User", "municipio": "Monterrey",
    }, headers=headers)
    assert sync.status_code == 200
    me2 = client.get("/api/v1/auth/me", headers=headers).json()
    assert me2["latitud"] == APODACA[0] and me2["municipio"] == "Apodaca"

    # En el chat, sin compartir ubicación en la sesión, el bot ya la conoce por el perfil
    session_id = client.get("/api/v1/chat/start").json()["session_id"]
    r = _chat(client, session_id, message="Busco jale de almacén", user_email="loc_user@test.com", user_name="Loc User")
    assert r["location_known"] is True
    assert r["ask_location"] is False
    assert r["candidate_profile"]["colonia"] == "Huinalá"
    assert not any("compartir" in o["label"].lower() for o in r["options"])
