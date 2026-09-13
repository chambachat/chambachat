import json
import uuid
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app.models import BotFlowConfig, ChatSession, User, Job
from app.services.matchmaking import match_jobs_for_candidate, MUNICIPIOS_NL_COORDS

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
        "prompt_texto": "¡Mucho gusto, {nombre}! Para buscarte las fábricas y parques industriales más cercanos, ¿en qué municipio vives o buscas chamba?",
        "opciones": [
            {"label": "Apodaca", "value": "Apodaca"},
            {"label": "Monterrey", "value": "Monterrey"},
            {"label": "Guadalupe", "value": "Guadalupe"},
            {"label": "San Nicolás", "value": "San Nicolás"},
            {"label": "Escobedo", "value": "Escobedo"},
            {"label": "Pesquería", "value": "Pesquería"},
            {"label": "García", "value": "García"},
            {"label": "Santa Catarina", "value": "Santa Catarina"}
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
        "prompt_texto": "Veo que no terminaste la secundaria. En Chambachat te ayudamos a jalar y a terminar tus estudios gratis. ¿Te interesaría aplicar a vacantes que te den el tiempo y el apoyo para sacar tu certificado del INEA?",
        "opciones": [
            {"label": "✅ Sí, me interesa el apoyo INEA", "value": "SI_INEA"},
            {"label": "❌ Por ahora solo la chamba", "value": "NO_INEA"}
        ]
    },
    "closing": {
        "step_order": 5,
        "titulo_admin": "Mensaje de Cierre y Presentación de Vacantes",
        "prompt_texto": "¡Listo {nombre}! Ya encontramos las mejores vacantes para ti cerca de tu zona. Aquí puedes ver los detalles y postularte de volada:",
        "opciones": []
    }
}

def get_prompt_text(db: Session, step_key: str, fallback_text: str = "") -> str:
    """Obtiene el texto del prompt configurado en BD por el administrador, o usa el valor por defecto."""
    config = db.query(BotFlowConfig).filter(BotFlowConfig.step_key == step_key).first()
    if config and config.prompt_texto:
        return config.prompt_texto
    return DEFAULT_PROMPTS.get(step_key, {}).get("prompt_texto", fallback_text)

def get_prompt_options(db: Session, step_key: str) -> List[Dict[str, str]]:
    config = db.query(BotFlowConfig).filter(BotFlowConfig.step_key == step_key).first()
    if config and config.opciones_json:
        try:
            return json.loads(config.opciones_json)
        except Exception:
            pass
    return DEFAULT_PROMPTS.get(step_key, {}).get("opciones", [])

def process_chat_message(
    db: Session,
    session_id: str = None,
    user_message: str = None,
    selected_option: str = None
) -> Dict[str, Any]:
    """
    Motor conversacional de máquina de estados dinámico para Chambachat V2.
    """
    # 1. Recuperar o inicializar sesión
    if not session_id:
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        chat_session = ChatSession(
            session_id=session_id,
            current_step="welcome",
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
                current_step="welcome",
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

    step = chat_session.current_step

    # Flujo de conversación
    if step == "welcome":
        # Primer contacto o usuario respondiendo su nombre
        if not input_text:
            # Enviar mensaje de bienvenida
            welcome_text = get_prompt_text(db, "welcome")
            bot_messages.append(welcome_text)
            chat_session.current_step = "ask_name"
        else:
            # El usuario ya envió su nombre
            data["nombre"] = input_text
            next_prompt = get_prompt_text(db, "ask_municipio").replace("{nombre}", data["nombre"])
            bot_messages.append(next_prompt)
            options = get_prompt_options(db, "ask_municipio")
            chat_session.current_step = "ask_municipio"

    elif step == "ask_name":
        data["nombre"] = input_text if input_text else "Amigo"
        next_prompt = get_prompt_text(db, "ask_municipio").replace("{nombre}", data["nombre"])
        bot_messages.append(next_prompt)
        options = get_prompt_options(db, "ask_municipio")
        chat_session.current_step = "ask_municipio"

    elif step == "ask_municipio":
        data["municipio"] = input_text if input_text else "Monterrey"
        next_prompt = get_prompt_text(db, "ask_education")
        bot_messages.append(next_prompt)
        options = get_prompt_options(db, "ask_education")
        chat_session.current_step = "ask_education"

    elif step == "ask_education":
        # Guardar nivel educativo
        data["nivel_educativo"] = input_text
        
        # Validar rezago educativo según el PRD
        if input_text == "Primaria_Incompleta":
            # Inyección del prompt de INEA
            inea_text = get_prompt_text(db, "inea_prompt")
            bot_messages.append(inea_text)
            options = get_prompt_options(db, "inea_prompt")
            chat_session.current_step = "inea_response"
        else:
            # Tiene Secundaria, Preparatoria o Técnico -> no requiere tag_inea
            data["tag_inea"] = False
            # Ir a cierre y matchmaking
            completed = True
            chat_session.completed = True
            chat_session.current_step = "completed"
            
            closing_text = get_prompt_text(db, "closing").replace("{nombre}", data.get("nombre", ""))
            bot_messages.append(closing_text)

    elif step == "inea_response":
        # Usuario responde sobre el apoyo del INEA
        if input_text == "SI_INEA" or "si" in input_text.lower() or "sí" in input_text.lower():
            data["tag_inea"] = True
            bot_messages.append("¡Excelente decisión! Te conectaremos con empresas que cuentan con aulas y convenios con el INEA para que no descuides tu ingreso mientras estudias 🎓🙌")
        else:
            data["tag_inea"] = False
            bot_messages.append("Entendido, te mostraremos vacantes con contratación inmediata y excelentes sueldos semanales 🤝")

        completed = True
        chat_session.completed = True
        chat_session.current_step = "completed"

        closing_text = get_prompt_text(db, "closing").replace("{nombre}", data.get("nombre", ""))
        bot_messages.append(closing_text)

    elif step == "completed":
        # Si vuelve a escribir tras completar
        bot_messages.append("¡Ya registramos tu perfil! Puedes postularte a cualquiera de estas vacantes o reiniciar el chat si deseas cambiar tus datos.")
        completed = True

    # Si se completó el flujo, guardamos en la tabla Users y ejecutamos matchmaking
    if completed:
        coords = MUNICIPIOS_NL_COORDS.get(data.get("municipio", "monterrey").lower(), (25.6866, -100.3161))
        
        # Guardar o actualizar operario
        user_record = User(
            nombre=data.get("nombre", "Operario Registrado"),
            telefono=data.get("telefono", "818-000-0000"),
            codigo_postal=data.get("codigo_postal", "64000"),
            municipio=data.get("municipio", "Monterrey"),
            nivel_educativo=data.get("nivel_educativo", "Secundaria"),
            tag_inea=bool(data.get("tag_inea", False)),
            latitud=coords[0],
            longitud=coords[1],
            sueldo_deseado=2200.0,
            activo=True
        )
        db.add(user_record)
        db.commit()
        db.refresh(user_record)

        data["user_id"] = user_record.id
        candidate_profile = {
            "id": user_record.id,
            "nombre": user_record.nombre,
            "municipio": user_record.municipio,
            "nivel_educativo": user_record.nivel_educativo,
            "tag_inea": user_record.tag_inea
        }

        # Ejecutar Matchmaking
        all_jobs = db.query(Job).all()
        matched_jobs = match_jobs_for_candidate(
            candidate_lat=coords[0],
            candidate_lon=coords[1],
            municipio=data.get("municipio"),
            tag_inea=bool(data.get("tag_inea", False)),
            all_jobs=all_jobs
        )[:4] # Top 4 mejores vacantes

    # Guardar estado de la sesión
    chat_session.collected_data = json.dumps(data)
    db.commit()

    return {
        "session_id": chat_session.session_id,
        "current_step": chat_session.current_step,
        "bot_messages": bot_messages,
        "options": options,
        "matched_jobs": matched_jobs,
        "completed": completed,
        "candidate_profile": candidate_profile
    }
