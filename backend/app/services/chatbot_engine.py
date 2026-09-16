import logging

logger = logging.getLogger(__name__)

import json
import uuid
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app.models import BotFlowConfig, ChatSession, User, Job, RouteStop, TransportRoute
from app.services.matchmaking import match_jobs_for_candidate
from app.services.geo import get_municipio_coords, haversine_distance_km
from app.services.deepseek_engine import query_deepseek_chat
from app.config import settings

DEFAULT_PROMPTS = {
    "welcome": {
        "step_order": 1,
        "titulo_admin": "Mensaje Inicial / Saludo",
        "prompt_texto": "¡Qué onda! Bienvenido a Chambachat 🤠 Te ayudo a encontrar jale operativo en Nuevo León rápido y cerca de tu casa. ¿Qué puesto te interesa o en qué municipio buscas?",
        "opciones": [
            {"label": "🚜 Montacarguista", "value": "Busco vacantes de montacarguista"},
            {"label": "🏭 Ensamble en Apodaca", "value": "Busco de operario en Apodaca"},
            {"label": "📦 Almacén y Embarques", "value": "Busco jale de almacén"},
            {"label": "⏱️ Con Turnos Fijos", "value": "Busco vacantes con turnos fijos"}
        ]
    }
}

def get_prompt_text(db: Session, step_key: str, fallback_text: str = "") -> str:
    config = db.query(BotFlowConfig).filter(BotFlowConfig.step_key == step_key).first()
    if config and config.prompt_texto:
        return config.prompt_texto
    return DEFAULT_PROMPTS.get(step_key, {}).get("prompt_texto", fallback_text)

async def process_chat_message(
    db: Session,
    session_id: str = None,
    user_message: str = None,
    selected_option: str = None,
    user_name: str = None,
    user_phone: str = None,
    user_email: str = None,
    candidate_lat: float = None,
    candidate_lon: float = None,
    candidate_colonia: str = None,
    candidate_municipio: str = None
) -> Dict[str, Any]:
    """
    Motor conversacional híbrido con DeepSeek AI que mantiene el contexto de puesto, usuario y ubicación.
    """
    if not session_id:
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        chat_session = ChatSession(
            session_id=session_id,
            current_step="chatting",
            collected_data=json.dumps({}),
            completed=False
        )
        db.add(chat_session)
        db.commit()
    else:
        chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if not chat_session:
            chat_session = ChatSession(
                session_id=session_id,
                current_step="chatting",
                collected_data=json.dumps({}),
                completed=False
            )
            db.add(chat_session)
            db.commit()

    data = json.loads(chat_session.collected_data or "{}")
    if user_name:
        data["nombre"] = user_name
    if user_phone:
        data["telefono"] = user_phone
    if user_email:
        data["email"] = user_email
    if candidate_lat is not None and candidate_lon is not None:
        data["latitud"] = candidate_lat
        data["longitud"] = candidate_lon
    if candidate_colonia:
        data["colonia"] = candidate_colonia
    if candidate_municipio:
        data["municipio"] = candidate_municipio

    input_text = (selected_option or user_message or "").strip()
    
    bot_messages = []
    options = []
    matched_jobs = []
    nearby_routes = []
    completed = False
    candidate_profile = None
    should_ask_login = False

    history = data.get("history", [])

    if not input_text and candidate_lat is None:
        # Mensaje de bienvenida inicial
        welcome_text = get_prompt_text(db, "welcome")
        if data.get("nombre"):
            welcome_text = f"¡Qué onda, {data['nombre']}! 🤠 Bienvenido a Chambachat. ¿Qué tipo de vacante estás buscando hoy?"
        bot_messages.append(welcome_text)
        options = [
            {"label": "🚜 Montacarguista", "value": "Busco vacantes de montacarguista"},
            {"label": "🏭 Ensamble en Apodaca", "value": "Busco de operario en Apodaca"},
            {"label": "📦 Almacén y Embarques", "value": "Busco jale de almacén"}
        ]
    else:
        # Detectar y recordar puesto en contexto acumulado
        for p_term in ["montacarguista", "montacarga", "montacargas", "forklift", "soldador", "soldadura", "almacen", "almacén", "ensamble", "prensista", "ayudante general"]:
            if p_term in input_text.lower():
                data["puesto_deseado"] = "Montacarguista" if "montacarg" in p_term or "forklift" in p_term else p_term.capitalize()
                break

        # Detectar municipio
        for m in ["Apodaca", "Pesquería", "San Nicolás", "Monterrey", "García", "Guadalupe", "Escobedo", "Santa Catarina", "Juárez"]:
            if m.lower() in input_text.lower():
                data["municipio"] = m
                break

        # Si se acaba de enviar la ubicación geográfica
        is_location_event = candidate_lat is not None and candidate_lon is not None
        
        # Registrar mensaje del usuario en el historial
        if input_text:
            history.append({"sender": "user", "text": input_text})

        # Invocar a DeepSeek con todo el historial y contexto de la sesión
        llm_response = await query_deepseek_chat(
            conversation_history=history, 
            user_message=input_text, 
            context_data=data
        )
        
        reply_text = llm_response["reply_text"]
        
        # Si fue un evento de compartir ubicación, anteponer mensaje enfocado en transporte
        if is_location_event:
            zona_label = data.get("colonia") or data.get("municipio") or "tu zona"
            bot_messages.append(
                f"📍 ¡Excelente compadre! Ya guardé tu ubicación en **{zona_label}**. "
                f"A continuación calculé las vacantes más cercanas a ti y las rutas de transporte de personal con paradas y horarios por tu casa."
            )
        else:
            bot_messages.append(reply_text)

        history.append({"sender": "bot", "text": bot_messages[-1]})

        # Actualizar perfil extraído
        extracted = llm_response.get("extracted_profile", {})
        for k, v in extracted.items():
            if v:
                data[k] = v

        options = llm_response.get("suggested_chips", [])
        should_ask_login = llm_response.get("should_ask_login", False)

        # Matchmaking inteligente con la base de datos
        target_muni = data.get("municipio")
        puesto_kw = data.get("puesto_deseado")

        if data.get("latitud") is not None and data.get("longitud") is not None:
            c_lat = float(data["latitud"])
            c_lon = float(data["longitud"])
        else:
            c_lat, c_lon = get_municipio_coords(target_muni or "monterrey")

        all_jobs = db.query(Job).all()

        if all_jobs and (target_muni or puesto_kw or is_location_event or any(w in input_text.lower() for w in ["vacante", "jale", "chamba", "montacarguista", "apodaca", "pesquer"])):
            matched_jobs = match_jobs_for_candidate(
                candidate_lat=c_lat,
                candidate_lon=c_lon,
                municipio=target_muni or "Monterrey",
                puesto_keyword=puesto_kw,
                all_jobs=all_jobs
            )[:4]

        # Calcular rutas de transporte cercanas
        from app.services.routes_service import find_nearby_stops
        try:
            nearby_routes = find_nearby_stops(db, c_lat, c_lon, max_km=8.0, limit=4)
        except Exception as e:
            logger.error(f"Error consultando rutas de transporte: {e}")

        # Guardar en base de datos si tenemos al menos nombre o puesto/municipio/coordenadas
        if data.get("nombre") or data.get("municipio") or data.get("puesto_deseado") or is_location_event:
            user_rec = None
            if data.get("user_id"):
                user_rec = db.query(User).filter(User.id == data["user_id"]).first()
            if not user_rec and data.get("email"):
                user_rec = db.query(User).filter(User.email == data["email"]).first()

            if not user_rec:
                user_rec = User(
                    nombre=data.get("nombre", "Operario Registrado"),
                    email=data.get("email"),
                    telefono=data.get("telefono", None),
                    municipio=data.get("municipio", "Apodaca"),
                    nivel_educativo="Secundaria",
                    tag_inea=False,
                    latitud=c_lat,
                    longitud=c_lon,
                    sueldo_deseado=2800.0,
                    activo=True
                )
                db.add(user_rec)
                db.commit()
                db.refresh(user_rec)
            else:
                if data.get("municipio"):
                    user_rec.municipio = data["municipio"]
                if data.get("nombre"):
                    user_rec.nombre = data["nombre"]
                user_rec.latitud = c_lat
                user_rec.longitud = c_lon
                db.commit()
                db.refresh(user_rec)

            data["user_id"] = user_rec.id
            candidate_profile = {
                "id": user_rec.id,
                "nombre": user_rec.nombre,
                "municipio": user_rec.municipio,
                "latitud": c_lat,
                "longitud": c_lon,
                "puesto_deseado": data.get("puesto_deseado", "Operario General")
            }

    data["history"] = history[-20:]
    chat_session.collected_data = json.dumps(data)
    db.commit()

    return {
        "session_id": chat_session.session_id,
        "current_step": "chatting",
        "bot_messages": bot_messages,
        "options": options,
        "matched_jobs": matched_jobs,
        "nearby_routes": nearby_routes,
        "completed": bool(candidate_profile and matched_jobs),
        "candidate_profile": candidate_profile,
        "should_ask_login": should_ask_login and not data.get("google_logged_in")
    }
