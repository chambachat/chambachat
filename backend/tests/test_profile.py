"""
Currículum operativo del candidato: edición desde el perfil, llenado pasivo desde el chat,
onboarding progresivo con chips y fusión de lo recogido como invitado al iniciar sesión.
"""
from conftest import make_auth_header


def _chat(client, session_id, **kwargs):
    payload = {"session_id": session_id}
    payload.update(kwargs)
    res = client.post("/api/v1/chat/message", json=payload)
    assert res.status_code == 200, res.text
    return res.json()


def test_profile_get_and_patch_with_validation(client):
    assert client.get("/api/v1/profile/me").status_code == 401
    cand = make_auth_header("prof_cand@test.com", nombre="Perfil Cand", role="candidate")

    base = client.get("/api/v1/profile/me", headers=cand).json()
    assert base["completitud"] < 30
    assert "Escolaridad" in base["faltantes"]
    assert "Secundaria" in base["catalogos"]["escolaridades"]

    assert client.patch("/api/v1/profile/me", json={"escolaridad": "Doctorado"}, headers=cand).status_code == 422
    assert client.patch("/api/v1/profile/me", json={"edad": 12}, headers=cand).status_code == 422
    assert client.patch("/api/v1/profile/me", json={"experiencia_general": "20 años"}, headers=cand).status_code == 422

    res = client.patch("/api/v1/profile/me", json={
        "escolaridad": "Secundaria", "experiencia_general": "1 a 2 años", "puesto_deseado": "Montacarguista",
        "certificaciones": ["Licencia de montacargas (DC-3)", "Excel intermedio"], "habilidades": ["Puntual", "Trabajo en equipo"],
        "disponibilidad": "De inmediato", "turno_preferido": "Fijo matutino", "telefono": "81-1234-5678", "edad": 28, "sueldo_deseado": 3000,
    }, headers=cand)
    assert res.status_code == 200, res.text
    p = res.json()
    assert p["escolaridad"] == "Secundaria" and p["edad"] == 28 and p["telefono"] == "81-1234-5678"
    assert p["certificaciones"] == ["Licencia de montacargas (DC-3)", "Excel intermedio"]
    assert p["habilidades"] == ["Puntual", "Trabajo en equipo"]
    assert p["completitud"] == 90  # solo falta la ubicación
    assert p["faltantes"] == ["Ubicación"]

    # La escolaridad también actualiza el nivel educativo del usuario
    assert client.get("/api/v1/auth/me", headers=cand).json()["nivel_educativo"] == "Secundaria"

    # Quitar certificaciones deja constancia de que no tiene (no se vuelve a preguntar)
    p2 = client.patch("/api/v1/profile/me", json={"certificaciones": []}, headers=cand).json()
    assert p2["certificaciones"] == [] and p2["sin_certificaciones"] is True
    assert "Certificaciones" not in p2["faltantes"]


def test_chat_saves_profile_facts_mentioned_in_passing(client):
    cand = make_auth_header("prof_chat@test.com", nombre="Chat Cand", role="candidate")
    session_id = client.get("/api/v1/chat/start").json()["session_id"]
    r = _chat(client, session_id,
              message="Tengo la prepa terminada, llevo 3 años de experiencia como soldador y tengo 28 años. Mi cel es 81 2345 6789",
              user_email="prof_chat@test.com", user_name="Chat Cand")
    assert any("Lo guardé en tu perfil" in m for m in r["bot_messages"])

    p = client.get("/api/v1/profile/me", headers=cand).json()
    assert p["escolaridad"] == "Preparatoria / Bachillerato"
    assert p["experiencia_general"] == "Más de 2 años"
    assert p["experiencia_por_rol"].get("Soldador") == "Más de 2 años"
    assert p["edad"] == 28
    assert p["telefono"] == "81-2345-6789"
    assert p["puesto_deseado"] == "Soldador"

    # "tengo 25 años" sin contexto de trabajo es edad, no experiencia
    r2 = _chat(client, session_id, message="Por cierto tengo 25 años", user_email="prof_chat@test.com")
    p = client.get("/api/v1/profile/me", headers=cand).json()
    assert p["edad"] == 25 and p["experiencia_general"] == "Más de 2 años"


def test_chat_onboarding_asks_one_short_question_every_two_messages(client):
    cand = make_auth_header("prof_onb@test.com", nombre="Onb Cand", role="candidate")
    session_id = client.get("/api/v1/chat/start").json()["session_id"]

    r1 = _chat(client, session_id, message="Hola", user_email="prof_onb@test.com", user_name="Onb Cand")
    assert not any("¿qué tipo de puesto" in m.lower() for m in r1["bot_messages"])  # primer mensaje: sin pregunta

    r2 = _chat(client, session_id, message="Busco jale en Apodaca", user_email="prof_onb@test.com")
    assert any("¿qué tipo de puesto" in m.lower() for m in r2["bot_messages"])
    assert any(o["value"] == "Montacarguista" for o in r2["options"])

    # Responde con el chip: se guarda, confirma y pasa a la siguiente pregunta (escolaridad)
    r3 = _chat(client, session_id, selected_option="Montacarguista", user_email="prof_onb@test.com")
    assert any("guardé" in m.lower() or "anotado" in m.lower() for m in r3["bot_messages"])
    assert any("estudiaste" in m.lower() for m in r3["bot_messages"])
    assert any(o["value"] == "Secundaria" for o in r3["options"])
    p = client.get("/api/v1/profile/me", headers=cand).json()
    assert p["puesto_deseado"] == "Montacarguista"

    # Respuesta en texto libre a la pregunta pendiente
    r4 = _chat(client, session_id, message="nomas termine la secu", user_email="prof_onb@test.com")
    p = client.get("/api/v1/profile/me", headers=cand).json()
    assert p["escolaridad"] == "Secundaria"
    assert any("experiencia" in m.lower() for m in r4["bot_messages"])  # siguiente pregunta encadenada

    # Si en vez de responder pregunta otra cosa, el bot sigue la plática y la pregunta queda pendiente sin repetirse
    r5 = _chat(client, session_id, message="¿Cuánto pagan de montacarguista?", user_email="prof_onb@test.com")
    assert sum("planta, almacén o producción" in m for m in r5["bot_messages"]) == 0


def test_guest_profile_facts_merge_into_user_on_login(client):
    session_id = client.get("/api/v1/chat/start").json()["session_id"]
    r = _chat(client, session_id, message="Terminé la secundaria y tengo 2 años de experiencia en almacén")
    assert any("Lo guardé en tu perfil" in m for m in r["bot_messages"])

    cand = make_auth_header("prof_guest@test.com", nombre="Guest Cand", role="candidate")
    sync = client.post("/api/v1/auth/sync-google-profile", json={
        "email": "prof_guest@test.com", "nombre": "Guest Cand", "session_id": session_id,
    }, headers=cand)
    assert sync.status_code == 200, sync.text

    p = client.get("/api/v1/profile/me", headers=cand).json()
    assert p["escolaridad"] == "Secundaria"
    assert p["experiencia_general"] == "1 a 2 años"
    assert p["experiencia_por_rol"].get("Almacén y logística") == "1 a 2 años"
