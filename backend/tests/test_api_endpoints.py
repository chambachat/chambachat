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
    assert data["role"] == "candidate"

def test_recruiter_profile_sync():
    payload = {
        "email": "rh@ternium.com",
        "nombre": "Lic. Marcela Treviño",
        "role": "recruiter",
        "empresa_nombre": "Ternium Guerrero",
        "telefono": "81-8888-9999"
    }
    res = client.post("/api/v1/auth/sync-google-profile", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["nombre"] == "Lic. Marcela Treviño"
    assert data["email"] == "rh@ternium.com"
    assert data["role"] == "recruiter"
    assert data["empresa_nombre"] == "Ternium Guerrero"

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

def test_company_management_and_team_invitations():
    # 0. Subir Constancia de Situación Fiscal (CSF)
    fake_pdf = b"%PDF-1.4 test constancia fiscal del SAT para Carrier"
    files = {"file": ("constancia_fiscal_carrier.pdf", fake_pdf, "application/pdf")}
    csf_res = client.post("/api/v1/companies/upload-csf", files=files)
    assert csf_res.status_code == 200
    csf_data = csf_res.json()
    assert csf_data["status"] == "success"
    assert "file_url" in csf_data
    csf_url = csf_data["file_url"]

    # 1. Crear empresa con CSF y Régimen Fiscal
    comp_payload = {
        "nombre": "Carrier Planta Santa Catarina",
        "municipio": "Santa Catarina",
        "industria": "Climatización y Manufactura",
        "rfc": "CAR990101XYZ",
        "regimen_fiscal": "601 - General de Ley Personas Morales",
        "constancia_fiscal_url": csf_url,
        "creator_email": "rh.carrier@carrier.com",
        "creator_name": "Lic. Roberto Sada",
        "telefono_contacto": "81-1000-2000"
    }
    create_res = client.post("/api/v1/companies", json=comp_payload)
    assert create_res.status_code == 200
    comp_data = create_res.json()["company"]
    comp_id = comp_data["id"]
    assert comp_data["nombre"] == "Carrier Planta Santa Catarina"
    assert comp_data["constancia_fiscal_url"] == csf_url
    assert comp_data["regimen_fiscal"] == "601 - General de Ley Personas Morales"

    # 2. Listar empresas del usuario
    list_res = client.get("/api/v1/companies?user_email=rh.carrier@carrier.com")
    assert list_res.status_code == 200
    companies = list_res.json()
    matched = [c for c in companies if c["id"] == comp_id]
    assert len(matched) == 1
    assert matched[0]["constancia_fiscal_url"] == csf_url
    assert matched[0]["estado_verificacion"] == "verificada"

    # 3. Actualizar datos de la empresa
    update_res = client.put(f"/api/v1/companies/{comp_id}", json={"telefono_contacto": "81-9988-7766"})
    assert update_res.status_code == 200
    assert update_res.json()["company"]["telefono_contacto"] == "81-9988-7766"

    # 4. Invitar a un miembro al equipo por correo
    invite_payload = {
        "email": "reclutador2@carrier.com",
        "nombre": "Lic. Ana Sofía Garza",
        "role": "recruiter",
        "inviter_name": "Lic. Roberto Sada",
        "inviter_email": "rh.carrier@carrier.com"
    }
    invite_res = client.post(f"/api/v1/companies/{comp_id}/invite", json=invite_payload)
    assert invite_res.status_code == 200
    invite_data = invite_res.json()
    assert invite_data["status"] == "success"
    assert "token" in invite_data
    token = invite_data["token"]

    # 5. Consultar equipo: debe haber 1 activo y 1 invitación pendiente
    team_res = client.get(f"/api/v1/companies/{comp_id}/members")
    assert team_res.status_code == 200
    team_data = team_res.json()
    assert team_data["total_members"] == 1
    assert team_data["total_pending"] == 1
    assert team_data["pending_invitations"][0]["email"] == "reclutador2@carrier.com"

    # 6. Aceptar invitación
    accept_payload = {
        "token": token,
        "user_email": "reclutador2@carrier.com",
        "user_name": "Lic. Ana Sofía Garza"
    }
    accept_res = client.post("/api/v1/companies/accept-invitation", json=accept_payload)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "success"

    # 7. Consultar equipo nuevamente: ahora 2 miembros activos y 0 pendientes
    team2_res = client.get(f"/api/v1/companies/{comp_id}/members")
    assert team2_res.status_code == 200
    team2_data = team2_res.json()
    assert team2_data["total_members"] == 2
    assert team2_data["total_pending"] == 0

    # 8. Eliminar segundo miembro
    second_member_id = [m["id"] for m in team2_data["active_members"] if m["email"] == "reclutador2@carrier.com"][0]
    del_res = client.delete(f"/api/v1/companies/{comp_id}/members/{second_member_id}")
    assert del_res.status_code == 200

def test_transport_routes_management_and_nearby_stops():
    # 1. Crear empresa base para la prueba de rutas
    comp_res = client.post("/api/v1/companies", json={
        "nombre": "Kia Motors Planta Pesquería",
        "municipio": "Pesquería",
        "industria": "Automotriz",
        "creator_email": "logistica@kia.com"
    })
    assert comp_res.status_code == 200
    comp_id = comp_res.json()["company"]["id"]

    # 2. Registrar ruta de transporte con 3 paradas GPS y horarios
    route_payload = {
        "nombre": "Ruta 1 - Huinalá / Pueblo Nuevo",
        "turno": "Turno 1 (Matutino)",
        "color_hex": "#059669",
        "descripcion": "Recorrido por Apodaca hacia nave industrial Pesquería",
        "hora_inicio": "05:30 AM",
        "hora_llegada_planta": "06:40 AM",
        "stops": [
            {
                "orden": 1,
                "nombre": "Soriana Huinalá",
                "horario": "05:30 AM",
                "latitud": 25.7480,
                "longitud": -100.1900,
                "colonia_referencia": "Huinalá, Apodaca"
            },
            {
                "orden": 2,
                "nombre": "Entrada Pueblo Nuevo",
                "horario": "05:50 AM",
                "latitud": 25.7600,
                "longitud": -100.1500,
                "colonia_referencia": "Pueblo Nuevo, Apodaca"
            },
            {
                "orden": 3,
                "nombre": "Cruce Carretera Miguel Alemán",
                "horario": "06:15 AM",
                "latitud": 25.7750,
                "longitud": -100.1000,
                "colonia_referencia": "Pesquería"
            }
        ]
    }
    create_res = client.post(f"/api/v1/companies/{comp_id}/routes", json=route_payload)
    assert create_res.status_code == 200
    route_data = create_res.json()["route"]
    route_id = route_data["id"]
    assert route_data["nombre"] == "Ruta 1 - Huinalá / Pueblo Nuevo"
    assert route_data["total_stops"] == 3
    assert len(route_data["stops"]) == 3
    assert route_data["stops"][0]["nombre"] == "Soriana Huinalá"

    # 3. Listar rutas de la empresa
    list_res = client.get(f"/api/v1/companies/{comp_id}/routes")
    assert list_res.status_code == 200
    routes_list = list_res.json()
    assert len(routes_list) >= 1
    assert any(r["id"] == route_id for r in routes_list)

    # 4. Obtener detalle de ruta específica
    get_res = client.get(f"/api/v1/companies/{comp_id}/routes/{route_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == route_id

    # 5. Actualizar ruta: cambiar nombre y modificar paradas
    update_payload = {
        "nombre": "Ruta 1 Express - Huinalá",
        "color_hex": "#2563eb",
        "stops": [
            {
                "orden": 1,
                "nombre": "Soriana Huinalá VIP",
                "horario": "05:25 AM",
                "latitud": 25.7482,
                "longitud": -100.1902,
                "colonia_referencia": "Huinalá"
            },
            {
                "orden": 2,
                "nombre": "Nave Industrial Pesquería",
                "horario": "06:20 AM",
                "latitud": 25.7869,
                "longitud": -100.0506,
                "colonia_referencia": "Pesquería"
            }
        ]
    }
    update_res = client.put(f"/api/v1/companies/{comp_id}/routes/{route_id}", json=update_payload)
    assert update_res.status_code == 200
    updated_route = update_res.json()["route"]
    assert updated_route["nombre"] == "Ruta 1 Express - Huinalá"
    assert updated_route["total_stops"] == 2
    assert updated_route["stops"][0]["nombre"] == "Soriana Huinalá VIP"

    # 6. Búsqueda de paradas cercanas por geolocalización
    # Coordenadas muy cerca de Soriana Huinalá (lat: 25.7480, lon: -100.1900)
    nearby_res = client.get("/api/v1/routes/nearby?lat=25.7485&lon=-100.1905&max_distance_km=3.0")
    assert nearby_res.status_code == 200
    nearby_data = nearby_res.json()
    assert nearby_data["total_encontradas"] >= 1
    nearest = nearby_data["stops_cercanas"][0]
    assert nearest["nombre_parada"] == "Soriana Huinalá VIP"
    assert nearest["distancia_km"] < 1.0
    assert nearest["caminando_min"] >= 1

    # 7. Eliminar ruta de transporte
    del_route_res = client.delete(f"/api/v1/companies/{comp_id}/routes/{route_id}")
    assert del_route_res.status_code == 200

    # 8. Verificar que la lista de rutas quede vacía
    final_list = client.get(f"/api/v1/companies/{comp_id}/routes").json()
    assert not any(r["id"] == route_id for r in final_list)

def test_chat_candidate_location_and_nearby_routes():
    # 1. Crear empresa y ruta con parada
    comp_res = client.post("/api/v1/companies", json={
        "nombre": "LG Electronics Ramos / Apodaca",
        "rfc": "LGE950201NL1",
        "municipio": "Apodaca",
        "industria": "Manufactura",
        "creator_email": "rh@lge.com"
    })
    assert comp_res.status_code == 200
    comp_id = comp_res.json()["company"]["id"]

    route_res = client.post(f"/api/v1/companies/{comp_id}/routes", json={
        "nombre": "Ruta 5 Directa Huinalá",
        "turno": "Matutino",
        "hora_llegada_planta": "06:30 AM",
        "color_hex": "#10b981",
        "activa": True,
        "stops": [
            {
                "orden": 1,
                "nombre": "Oxxo Huinalá Centro",
                "horario": "05:40 AM",
                "latitud": 25.7540,
                "longitud": -100.1740,
                "colonia_referencia": "Huinalá"
            }
        ]
    })
    assert route_res.status_code == 200

    # 2. Iniciar sesión de chat
    start_res = client.get("/api/v1/chat/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    # 3. Enviar mensaje de ubicación compartida (Huinalá: 25.7535, -100.1742)
    loc_msg = client.post("/api/v1/chat/message", json={
        "session_id": session_id,
        "message": "📍 Compartí mi ubicación en Huinalá, Apodaca",
        "candidate_lat": 25.7535,
        "candidate_lon": -100.1742,
        "candidate_colonia": "Huinalá",
        "candidate_municipio": "Apodaca"
    })
    assert loc_msg.status_code == 200
    res_data = loc_msg.json()
    assert len(res_data["bot_messages"]) > 0
    assert any("Huinalá" in m or "ubicación" in m.lower() for m in res_data["bot_messages"])
    assert "nearby_routes" in res_data
    assert len(res_data["nearby_routes"]) >= 1
    closest = res_data["nearby_routes"][0]
    assert closest["nombre_parada"] == "Oxxo Huinalá Centro"
    assert closest["distancia_km"] < 1.0
    assert closest["caminando_min"] >= 1

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
    print(">>> TODOS LOS TESTS DE INTEGRACION DE LA API PASARON EXITOSAMENTE <<<")


