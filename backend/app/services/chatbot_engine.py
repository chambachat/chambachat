import json
import uuid
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app.models import BotFlowConfig, ChatSession, User, Job
from app.services.matchmaking import match_jobs_for_candidate, MUNICIPIOS_NL_COORDS
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
    user_email: str = None
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

    input_text = (selected_option or user_message or "").strip()
    
    bot_messages = []
    options = []
    matched_jobs = []
    completed = False
    candidate_profile = None
    should_ask_login = False

    history = data.get("history", [])

    if not input_text:
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

        # Registrar mensaje del usuario en el historial
        history.append({"sender": "user", "text": input_text})

        # Invocar a DeepSeek con todo el historial y contexto de la sesión
        llm_response = await query_deepseek_chat(
            conversation_history=history, 
            user_message=input_text, 
            context_data=data
        )
        
        reply_text = llm_response["reply_text"]
        bot_messages.append(reply_text)
        history.append({"sender": "bot", "text": reply_text})

        # Actualizar perfil extraído
        extracted = llm_response.get("extracted_profile", {})
        for k, v in extracted.items():
            if v:
                data[k] = v

        options = llm_response.get("suggested_chips", [])
        should_ask_login = llm_response.get("should_ask_login", False)

        # Matchmaking inteligente con la base de datos de Supabase
        target_muni = data.get("municipio")
        puesto_kw = data.get("puesto_deseado")

        coords = MUNICIPIOS_NL_COORDS.get((target_muni or "monterrey").lower(), (25.6866, -100.3161))
        all_jobs = db.query(Job).all()

        if all_jobs and (target_muni or puesto_kw or any(w in input_text.lower() for w in ["vacante", "jale", "chamba", "montacarguista", "apodaca", "pesquer"])):
            matched_jobs = match_jobs_for_candidate(
                candidate_lat=coords[0],
                candidate_lon=coords[1],
                municipio=target_muni or "Monterrey",
                puesto_keyword=puesto_kw,
                all_jobs=all_jobs
            )[:4]

        # Guardar en base de datos si tenemos al menos nombre o puesto/municipio
        if data.get("nombre") or data.get("municipio") or data.get("puesto_deseado"):
            user_rec = None
            if data.get("user_id"):
                user_rec = db.query(User).filter(User.id == data["user_id"]).first()
            if not user_rec and data.get("nombre"):
                user_rec = db.query(User).filter(User.nombre == data["nombre"]).first()

            if not user_rec:
                user_rec = User(
                    nombre=data.get("nombre", "Operario Registrado"),
                    telefono=data.get("telefono", None),
                    municipio=data.get("municipio", "Apodaca"),
                    nivel_educativo="Secundaria",
                    tag_inea=False,
                    latitud=coords[0],
                    longitud=coords[1],
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
                db.commit()
                db.refresh(user_rec)

            data["user_id"] = user_rec.id
            candidate_profile = {
                "id": user_rec.id,
                "nombre": user_rec.nombre,
                "municipio": user_rec.municipio,
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
        "completed": bool(candidate_profile and matched_jobs),
        "candidate_profile": candidate_profile,
        "should_ask_login": should_ask_login and not data.get("google_logged_in")
    }
