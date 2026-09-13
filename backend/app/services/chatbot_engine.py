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
        "prompt_texto": "¡Qué onda! Bienvenido a Chambachat 🤠 Te ayudamos a encontrar jale operativo en Nuevo León rápido y cerca de tu casa. ¿Cómo te llamas?",
        "opciones": []
    },
    "ask_municipio": {
        "step_order": 2,
        "titulo_admin": "Solicitud de Municipio o Zona",
        "prompt_texto": "¡Mucho gusto! Para buscarte las plantas y parques industriales más cercanos, ¿en qué municipio vives o buscas chamba?",
        "opciones": [
            {"label": "Apodaca", "value": "Apodaca"},
            {"label": "Pesquería", "value": "Pesquería"},
            {"label": "San Nicolás", "value": "San Nicolás"},
            {"label": "Monterrey", "value": "Monterrey"},
            {"label": "Guadalupe", "value": "Guadalupe"},
            {"label": "Escobedo", "value": "Escobedo"},
            {"label": "García", "value": "García"}
        ]
    },
    "ask_education": {
        "step_order": 3,
        "titulo_admin": "Pregunta de Nivel Educativo",
        "prompt_texto": "Perfecto, tenemos muchas opciones por ahí. ¿Cuál es tu grado de estudios actual?",
        "opciones": [
            {"label": "Primaria / Incompleta", "value": "Primaria_Incompleta"},
            {"label": "Secundaria Terminada", "value": "Secundaria"},
            {"label": "Preparatoria / Bachillerato", "value": "Preparatoria"},
            {"label": "Carrera Técnica / Conalep", "value": "Tecnico"}
        ]
    },
    "inea_prompt": {
        "step_order": 4,
        "titulo_admin": "Detección de Rezago e Invitación al INEA",
        "prompt_texto": "Veo que no terminaste la secundaria. En Chambachat te ayudamos a jalar y a terminar tus estudios gratis con el INEA. ¿Te interesaría aplicar a vacantes que te den el tiempo y el apoyo para sacar tu certificado oficial?",
        "opciones": [
            {"label": "✅ Sí, me interesa el apoyo INEA", "value": "SI_INEA"},
            {"label": "❌ Por ahora solo la chamba", "value": "NO_INEA"}
        ]
    },
    "closing": {
        "step_order": 5,
        "titulo_admin": "Mensaje de Cierre y Presentación de Vacantes",
        "prompt_texto": "¡Listo! Ya encontramos las mejores vacantes para ti cerca de tu zona en Nuevo León. Aquí puedes ver los detalles y postularte de volada:",
        "opciones": []
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
    selected_option: str = None
) -> Dict[str, Any]:
    """
    Motor conversacional híbrido: combina DeepSeek LLM empático con la base de datos de Supabase.
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
    input_text = (selected_option or user_message or "").strip()
    
    bot_messages = []
    options = []
    matched_jobs = []
    completed = False
    candidate_profile = None
    should_ask_login = False

    # Historial de conversación
    history = data.get("history", [])

    if not input_text:
        # Saludo inicial
        welcome_text = get_prompt_text(db, "welcome")
        bot_messages.append(welcome_text)
        options = [
            {"label": "🏭 Buscar en Apodaca", "value": "Busco jale de operario en Apodaca"},
            {"label": "🎓 Apoyo con el INEA", "value": "Me interesa vacantes con apoyo para estudiar con el INEA"},
            {"label": "⏱️ Turnos Fijos", "value": "Busco puestos con turnos fijos sin rolar"}
        ]
    else:
        # Registrar mensaje de usuario en historial
        history.append({"sender": "user", "text": input_text})

        # Invocar a DeepSeek LLM (o fallback heurístico)
        llm_response = await query_deepseek_chat(history, input_text)
        
        reply_text = llm_response["reply_text"]
        bot_messages.append(reply_text)
        history.append({"sender": "bot", "text": reply_text})

        # Actualizar perfil con entidades extraídas por el LLM
        extracted = llm_response.get("extracted_profile", {})
        for k, v in extracted.items():
            if v is not None:
                data[k] = v

        options = llm_response.get("suggested_chips", [])
        should_ask_login = llm_response.get("should_ask_login", False)

        # Si el usuario menciona municipio o pide vacantes, buscar matches
        target_muni = data.get("municipio")
        if target_muni or any(m in input_text.lower() for m in ["apodaca", "pesquería", "pesqueria", "san nicolas", "san nicolás", "monterrey", "garcía", "garcia", "guadalupe", "escobedo"]):
            if not target_muni:
                for m in ["Apodaca", "Pesquería", "San Nicolás", "Monterrey", "García", "Guadalupe", "Escobedo", "Santa Catarina"]:
                    if m.lower() in input_text.lower():
                        target_muni = m
                        data["municipio"] = m
                        break

            coords = MUNICIPIOS_NL_COORDS.get((target_muni or "monterrey").lower(), (25.6866, -100.3161))
            tag_inea = bool(data.get("tag_inea", False))

            all_jobs = db.query(Job).all()
            if all_jobs:
                matched_jobs = match_jobs_for_candidate(
                    candidate_lat=coords[0],
                    candidate_lon=coords[1],
                    municipio=target_muni,
                    tag_inea=tag_inea,
                    all_jobs=all_jobs
                )[:4]

        # Si tenemos nombre o municipio, crear/actualizar en Users
        if data.get("nombre") or data.get("municipio"):
            nombre_final = data.get("nombre", "Candidato Chatbot")
            user_rec = None
            if data.get("user_id"):
                user_rec = db.query(User).filter(User.id == data["user_id"]).first()
            if not user_rec and data.get("nombre"):
                user_rec = db.query(User).filter(User.nombre == data["nombre"]).first()

            coords = MUNICIPIOS_NL_COORDS.get(data.get("municipio", "monterrey").lower(), (25.6866, -100.3161))
            if not user_rec:
                user_rec = User(
                    nombre=nombre_final,
                    telefono=data.get("telefono", None),
                    municipio=data.get("municipio", "Monterrey"),
                    nivel_educativo=data.get("nivel_educativo", "Secundaria"),
                    tag_inea=bool(data.get("tag_inea", False)),
                    latitud=coords[0],
                    longitud=coords[1],
                    sueldo_deseado=2400.0,
                    activo=True
                )
                db.add(user_rec)
                db.commit()
                db.refresh(user_rec)
            else:
                if data.get("municipio"):
                    user_rec.municipio = data["municipio"]
                if data.get("tag_inea") is not None:
                    user_rec.tag_inea = bool(data["tag_inea"])
                if data.get("nivel_educativo"):
                    user_rec.nivel_educativo = data["nivel_educativo"]
                db.commit()
                db.refresh(user_rec)

            data["user_id"] = user_rec.id
            candidate_profile = {
                "id": user_rec.id,
                "nombre": user_rec.nombre,
                "municipio": user_rec.municipio,
                "nivel_educativo": user_rec.nivel_educativo,
                "tag_inea": user_rec.tag_inea
            }

            # Si ya tenemos al menos nombre y municipio, invitar a guardar con Google
            if not data.get("google_logged_in"):
                should_ask_login = True

    # Guardar sesión
    data["history"] = history[-20:] # Guardar últimos 20 intercambios
    chat_session.collected_data = json.dumps(data)
    db.commit()

    return {
        "session_id": chat_session.session_id,
        "current_step": chat_session.current_step,
        "bot_messages": bot_messages,
        "options": options,
        "matched_jobs": matched_jobs,
        "completed": bool(candidate_profile and matched_jobs),
        "candidate_profile": candidate_profile,
        "should_ask_login": should_ask_login
    }
