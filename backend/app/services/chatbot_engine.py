import json
import logging
import re
import unicodedata
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import BotFlowConfig, ChatSession, Job, User
from app.services.deepseek_engine import query_deepseek_chat
from app.services.geo import get_municipio_coords
from app.services.matchmaking import match_jobs_for_candidate
from app.services.routes_service import find_nearby_stops
from app.services.blocks_service import blocked_company_ids_for_candidate
from app.services import profile_service

logger = logging.getLogger(__name__)

DEFAULT_PROMPTS = {
    "welcome": {
        "step_order": 1,
        "titulo_admin": "Mensaje Inicial / Saludo",
        "prompt_texto": "¡Qué onda! Bienvenido a Chambachat 🤠 Te ayudo a encontrar jale operativo rápido y cerca de tu casa. ¿Qué puesto te interesa o en qué zona buscas?",
        "opciones": [
            {"label": "🚜 Montacarguista", "value": "Busco vacantes de montacarguista"},
            {"label": "🏭 Operador de producción", "value": "Busco vacantes de operador de producción"},
            {"label": "📦 Almacén y embarques", "value": "Busco jale de almacén"},
            {"label": "⏱️ Con turnos fijos", "value": "Busco vacantes con turnos fijos"}
        ]
    }
}

# Texto de bienvenida de versiones anteriores: si sigue en la base, se reemplaza por el nuevo al arrancar
LEGACY_WELCOME_TEXTS = {
    "¡Qué onda! Bienvenido a Chambachat 🤠 Te ayudo a encontrar jale operativo en Nuevo León rápido y cerca de tu casa. ¿Qué puesto te interesa o en qué municipio buscas?",
}

WELCOME_OPTIONS = [
    {"label": "🚜 Montacarguista", "value": "Busco vacantes de montacarguista"},
    {"label": "🏭 Operador de producción", "value": "Busco vacantes de operador de producción"},
    {"label": "📦 Almacén y embarques", "value": "Busco jale de almacén"},
]

MUNICIPIOS_DETECTABLES = [
    "Apodaca", "Pesquería", "San Nicolás", "Monterrey", "García", "Guadalupe", "Escobedo",
    "Santa Catarina", "Juárez", "Santiago", "Cadereyta", "Salinas Victoria", "Ciénega de Flores", "San Pedro",
]

# (término en el texto, etiqueta del puesto)
PUESTOS_DETECTABLES = [
    ("montacarg", "Montacarguista"), ("forklift", "Montacarguista"),
    ("soldad", "Soldador"), ("almacen", "Almacén"), ("embarques", "Almacén"),
    ("ensamble", "Ensamble"), ("prensista", "Prensista"), ("ayudante general", "Ayudante general"),
    ("calidad", "Inspector de calidad"), ("empaque", "Empaque"), ("chofer", "Chofer"),
]

# Intenciones sobre ubicación (texto normalizado: minúsculas y sin acentos)
_CHANGE_LOCATION_RE = re.compile(
    r"(cambiar|actualizar|modificar|corregir|nueva|otra|registrar|compartir)\s+(mi\s+|la\s+|de\s+)?(ubicacion|direccion|zona|colonia|casa|domicilio)"
    r"|me\s+mud|me\s+cambie\s+de\s+casa|ya\s+no\s+vivo|ahora\s+vivo|otro\s+lado|otra\s+zona|otro\s+municipio|otra\s+colonia"
    r"|buscar\s+en\s+otr|desde\s+otro\s+lugar"
)
# El candidato pregunta por rutas / camiones de personal
_ROUTES_RE = re.compile(
    r"\brutas?\b|\bcamion(es|cito)?\b|\bparadas?\b|pasan?\s+(por|cerca)|transporte\s+(de\s+personal|cerca|por)"
    r"|que\s+transporte|hay\s+transporte|me\s+recoge|recogen\s+cerca"
)

LOCATION_SHARE_VALUE = "Quiero compartir mi ubicación para ver rutas de transporte"  # el frontend abre el mapa con esta frase
CHIP_SHARE_LOCATION = {"label": "📍 Compartir mi ubicación", "value": LOCATION_SHARE_VALUE}
CHIP_CHANGE_LOCATION = {"label": "📍 Elegir nueva ubicación", "value": LOCATION_SHARE_VALUE}
CHIP_ROUTES = {"label": "🚌 ¿Qué rutas pasan por mi colonia?", "value": "¿Qué rutas de transporte de personal pasan cerca de mi colonia?"}
CHIP_NEAREST_JOBS = {"label": "🏭 Ver vacantes más cercanas", "value": "Muéstrame las vacantes más cercanas a mi casa"}
CHIP_FIXED_SHIFT = {"label": "⏱️ ¿Cuáles tienen turno fijo?", "value": "¿Cuáles vacantes tienen turnos fijos?"}


_MAX_REPLY_CHARS = 420


def _shorten_reply(text: str) -> str:
    """Respuestas cortas: máximo dos párrafos y ~420 caracteres, cortando en fin de oración."""
    text = (text or "").strip()
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    text = "\n\n".join(paragraphs[:2])
    if len(text) <= _MAX_REPLY_CHARS:
        return text
    cut = text[:_MAX_REPLY_CHARS]
    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "), cut.rfind(".\n"))
    return (cut[:end + 1] if end > 120 else cut.rstrip() + "…").strip()


def _normalize(text: str) -> str:
    """Minúsculas y sin acentos para detectar intenciones sin importar cómo escriba el candidato."""
    nfkd = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def get_prompt_text(db: Session, step_key: str, fallback_text: str = "") -> str:
    config = db.query(BotFlowConfig).filter(BotFlowConfig.step_key == step_key).first()
    if config and config.prompt_texto:
        return config.prompt_texto
    return DEFAULT_PROMPTS.get(step_key, {}).get("prompt_texto", fallback_text)


def _detect_puesto(text_norm: str) -> Optional[str]:
    for term, label in PUESTOS_DETECTABLES:
        if term in text_norm:
            return label
    return None


def _detect_municipio(text_norm: str) -> Optional[str]:
    for m in MUNICIPIOS_DETECTABLES:
        if _normalize(m) in text_norm:
            return m
    return None


def _get_or_create_session(db: Session, session_id: Optional[str]) -> ChatSession:
    chat_session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first() if session_id else None
    if not chat_session:
        chat_session = ChatSession(
            session_id=session_id or f"session_{uuid.uuid4().hex[:12]}",
            current_step="chatting",
            collected_data=json.dumps({}),
            completed=False,
        )
        db.add(chat_session)
        db.flush()
    return chat_session


def _find_user(db: Session, data: Dict[str, Any]) -> Optional[User]:
    user = None
    if data.get("user_id"):
        user = db.query(User).filter(User.id == data["user_id"]).first()
    if not user and data.get("email"):
        user = db.query(User).filter(User.email == data["email"]).first()
    return user


def _sync_location_from_profile(db: Session, data: Dict[str, Any]) -> None:
    """Usuarios con sesión: la ubicación confirmada en su perfil manda sobre la de la conversación."""
    user = _find_user(db, data)
    if not user:
        return
    data["user_id"] = user.id
    if user.ubicacion_confirmada and user.latitud is not None and user.longitud is not None:
        data["latitud"], data["longitud"] = user.latitud, user.longitud
        if user.colonia:
            data["colonia"] = user.colonia
        if user.municipio:
            data["loc_municipio"] = user.municipio


def _upsert_candidate(db: Session, data: Dict[str, Any], c_lat: float, c_lon: float) -> Dict[str, Any]:
    """Crea o actualiza el operario. Solo guarda coordenadas cuando son precisas (chat o perfil), nunca el centro del municipio."""
    precise = data.get("latitud") is not None and data.get("longitud") is not None
    residence = data.get("loc_municipio") or data.get("municipio")
    user_rec = _find_user(db, data)

    if not user_rec:
        user_rec = User(
            nombre=data.get("nombre", "Operario Registrado"),
            email=data.get("email"),
            telefono=data.get("telefono"),
            municipio=residence or "Apodaca",
            nivel_educativo="Secundaria",
            tag_inea=False,
            latitud=float(data["latitud"]) if precise else None,
            longitud=float(data["longitud"]) if precise else None,
            sueldo_deseado=2800.0,
            activo=True,
        )
        db.add(user_rec)
        db.flush()
    else:
        if data.get("nombre"):
            user_rec.nombre = data["nombre"]
        # No pisar el municipio de residencia confirmado con el municipio donde solo está buscando
        if data.get("loc_municipio"):
            user_rec.municipio = data["loc_municipio"]
        elif residence and not user_rec.ubicacion_confirmada:
            user_rec.municipio = residence

    if precise:
        user_rec.latitud = float(data["latitud"])
        user_rec.longitud = float(data["longitud"])
        user_rec.ubicacion_confirmada = True
        if data.get("colonia"):
            user_rec.colonia = data["colonia"]

    data["user_id"] = user_rec.id
    return {
        "id": user_rec.id,
        "nombre": user_rec.nombre,
        "municipio": user_rec.municipio,
        "colonia": user_rec.colonia,
        "latitud": user_rec.latitud if precise else c_lat,
        "longitud": user_rec.longitud if precise else c_lon,
        "ubicacion_confirmada": bool(user_rec.ubicacion_confirmada),
        "puesto_deseado": data.get("puesto_deseado", "Operario General"),
    }


def _without_location_chips(options: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Con la ubicación ya registrada no volvemos a ofrecer 'compartir ubicación' salvo que el candidato lo pida."""
    return [o for o in options if "ubicaci" not in _normalize(str(o.get("value", ""))) or "cambiar" in _normalize(str(o.get("label", "")))]


def _response(chat_session: ChatSession, data: Dict[str, Any], history: List[Dict[str, str]], **fields) -> Dict[str, Any]:
    data["history"] = history[-20:]
    chat_session.collected_data = json.dumps(data)
    base = {
        "session_id": chat_session.session_id,
        "current_step": "chatting",
        "bot_messages": [],
        "options": [],
        "matched_jobs": [],
        "nearby_routes": [],
        "completed": False,
        "candidate_profile": None,
        "should_ask_login": False,
        "ask_location": False,
        "location_known": data.get("latitud") is not None and data.get("longitud") is not None,
    }
    base.update(fields)
    return base


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
    candidate_municipio: str = None,
) -> Dict[str, Any]:
    """
    Motor conversacional híbrido (DeepSeek + heurística) con memoria de puesto, usuario y ubicación.

    Reglas de ubicación y rutas:
    - La ubicación se pide una sola vez. Registrada, no se vuelve a ofrecer salvo que el candidato
      quiera cambiarla o diga que busca en otro lado (ask_location=True).
    - Las rutas de transporte solo se calculan cuando el candidato las pide.
    """
    chat_session = _get_or_create_session(db, session_id)
    data = json.loads(chat_session.collected_data or "{}")
    history: List[Dict[str, str]] = data.get("history", [])

    if user_name:
        data["nombre"] = user_name
    if user_phone:
        data["telefono"] = user_phone
    if user_email:
        data["email"] = user_email.strip().lower()

    is_location_event = candidate_lat is not None and candidate_lon is not None
    if is_location_event:
        data["latitud"], data["longitud"] = candidate_lat, candidate_lon
        if candidate_colonia:
            data["colonia"] = candidate_colonia
        if candidate_municipio:
            data["loc_municipio"] = candidate_municipio
            data["municipio"] = candidate_municipio
    elif data.get("email") or data.get("user_id"):
        _sync_location_from_profile(db, data)

    input_text = (selected_option or user_message or "").strip()
    text_norm = _normalize(input_text)

    # ── Bienvenida ─────────────────────────────────────────────────────
    if not input_text and not is_location_event:
        welcome_text = get_prompt_text(db, "welcome")
        if data.get("nombre"):
            welcome_text = f"¡Qué onda, {data['nombre']}! 🤠 Bienvenido a Chambachat. ¿Qué tipo de vacante estás buscando hoy?"
        result = _response(chat_session, data, history, bot_messages=[welcome_text], options=list(WELCOME_OPTIONS))
        db.commit()
        return result

    if input_text:
        history.append({"sender": "user", "text": input_text})

    # ── Contexto acumulado: puesto y municipio mencionados ─────────────
    puesto = _detect_puesto(text_norm)
    if puesto:
        data["puesto_deseado"] = puesto
    mentioned_muni = None if is_location_event else _detect_municipio(text_norm)
    if mentioned_muni:
        data["municipio"] = mentioned_muni

    # ── Currículum del candidato: guarda lo que diga de pasada y atiende la pregunta de perfil pendiente ──
    profile_user = _find_user(db, data) if (data.get("email") or data.get("user_id")) else None
    profile_note: Optional[str] = None
    answered_pending = False
    if input_text and not is_location_event:
        data["user_turns"] = int(data.get("user_turns", 0)) + 1
        facts = profile_service.extract_profile_facts(input_text)
        if puesto and profile_user is not None and not (profile_user.perfil_operativo or {}).get("puesto_deseado"):
            facts.setdefault("puesto_deseado", puesto)
        pending = data.get("onboarding_pending")
        if pending:
            answer = profile_service.interpret_answer(pending, input_text)
            if answer:
                facts.update(answer)
                data.pop("onboarding_pending", None)
                answered_pending = "?" not in input_text
        if facts:
            profile_note = profile_service.save_facts(db, profile_user, data, facts)
        elif profile_user is not None:
            data["perfil_resumen"] = profile_service.snapshot(profile_user, data)

    loc_known = data.get("latitud") is not None and data.get("longitud") is not None
    zona_label = data.get("colonia") or data.get("loc_municipio") or data.get("municipio") or "tu zona"
    wants_change_location = bool(not is_location_event and _CHANGE_LOCATION_RE.search(text_norm))
    wants_routes = bool(not is_location_event and _ROUTES_RE.search(text_norm))
    search_elsewhere = bool(
        loc_known and mentioned_muni and data.get("loc_municipio")
        and _normalize(mentioned_muni) != _normalize(data["loc_municipio"])
    )

    bot_messages: List[str] = []
    options: List[Dict[str, str]] = []
    matched_jobs: List[Dict[str, Any]] = []
    nearby_routes: List[Dict[str, Any]] = []
    ask_location = False
    should_ask_login = False

    # Coordenadas para buscar vacantes: otro municipio pedido > ubicación registrada > municipio mencionado
    if search_elsewhere:
        c_lat, c_lon = get_municipio_coords(mentioned_muni)
    elif loc_known:
        c_lat, c_lon = float(data["latitud"]), float(data["longitud"])
    else:
        c_lat, c_lon = get_municipio_coords(data.get("municipio") or "monterrey")

    if wants_change_location:
        # Quiere cambiar/registrar ubicación: se lo pedimos en este momento
        ask_location = True
        bot_messages.append(
            "¡Claro! Toca **📍 Elegir nueva ubicación** (GPS o mapa) y vuelvo a calcular tus vacantes cercanas."
        )
        options = [CHIP_CHANGE_LOCATION if loc_known else CHIP_SHARE_LOCATION]

    elif wants_routes:
        if not loc_known:
            ask_location = True
            bot_messages.append(
                "Para decirte qué rutas pasan por tu casa necesito tu ubicación: toca **📍 Compartir mi ubicación**."
            )
            options = [CHIP_SHARE_LOCATION]
        else:
            try:
                nearby_routes = find_nearby_stops(db, c_lat, c_lon, max_km=8.0, limit=4)
            except Exception as exc:  # noqa: BLE001
                logger.error("Error consultando rutas de transporte: %s", exc)
            if nearby_routes:
                bot_messages.append(
                    f"🚌 Rutas de transporte de personal cerca de **{zona_label}**, con parada y hora de paso:"
                )
            else:
                bot_messages.append(
                    f"Por ahora no hay rutas de personal registradas cerca de **{zona_label}**. En cuanto una planta dé de alta una por tu rumbo, te la muestro."
                )
            options = [CHIP_NEAREST_JOBS, CHIP_FIXED_SHIFT, {"label": "📍 Cambiar mi ubicación", "value": LOCATION_SHARE_VALUE}]

    else:
        if is_location_event:
            bot_messages.append(
                f"📍 Listo, guardé tu ubicación en **{zona_label}**. Ya te muestro las vacantes más cercanas; si quieres, pregúntame qué rutas de transporte pasan por tu colonia."
            )
            options = [CHIP_ROUTES, CHIP_NEAREST_JOBS, CHIP_FIXED_SHIFT]
        elif answered_pending:
            # Respondió la pregunta de perfil: confirmar y, si falta algo, encadenar la siguiente
            bot_messages.append(profile_note or "✅ Anotado en tu perfil.")
            nxt = profile_service.next_question(profile_user, data)
            if nxt:
                data["onboarding_pending"] = nxt["field"]
                data["last_onboarding_turn"] = int(data.get("user_turns", 0))
                bot_messages.append(nxt["pregunta"])
                options = [{"label": o, "value": o} for o in nxt["opciones"]]
            else:
                bot_messages.append("¡Listo! Tu perfil quedó completo. ¿Seguimos con las vacantes?")
                options = list(WELCOME_OPTIONS)
        else:
            llm = await query_deepseek_chat(conversation_history=history, user_message=input_text, context_data=data)
            bot_messages.append(_shorten_reply(llm["reply_text"]))
            for k, v in (llm.get("extracted_profile") or {}).items():
                if v and k not in ("latitud", "longitud"):
                    data[k] = v
            options = list(llm.get("suggested_chips") or [])
            should_ask_login = bool(llm.get("should_ask_login", False))
            if loc_known:
                options = _without_location_chips(options)
            if profile_note:
                bot_messages.append(profile_note)
            # Onboarding progresivo: una pregunta corta de perfil cada dos mensajes, sin interrumpir otras peticiones
            if not search_elsewhere and profile_service.should_ask(profile_user, data):
                nxt = profile_service.next_question(profile_user, data)
                if nxt:
                    data["onboarding_pending"] = nxt["field"]
                    data["last_onboarding_turn"] = int(data.get("user_turns", 0))
                    bot_messages.append(nxt["pregunta"])
                    options = [{"label": o, "value": o} for o in nxt["opciones"]] + [o for o in options if o.get("value") != LOCATION_SHARE_VALUE][:2]

        if search_elsewhere:
            ask_location = True
            bot_messages.append(
                f"Busqué en **{mentioned_muni}**. Si te mudaste o quieres que esa sea tu zona fija, toca **📍 Elegir nueva ubicación**."
            )
            options = [CHIP_CHANGE_LOCATION] + [o for o in options if o.get("value") != LOCATION_SHARE_VALUE]

        wants_jobs = bool(
            data.get("municipio") or data.get("puesto_deseado") or is_location_event or loc_known
            or any(w in text_norm for w in ["vacante", "jale", "chamba", "trabajo", "empleo"])
        )
        if wants_jobs:
            all_jobs = db.query(Job).filter(Job.activa.is_(True)).all()
            if data.get("email"):
                excluded = blocked_company_ids_for_candidate(db, data["email"])
                if excluded:
                    all_jobs = [j for j in all_jobs if j.empresa_id not in excluded]
            matched_jobs = match_jobs_for_candidate(
                candidate_lat=c_lat,
                candidate_lon=c_lon,
                municipio=(mentioned_muni if search_elsewhere else data.get("loc_municipio") or data.get("municipio")) or "Monterrey",
                puesto_keyword=data.get("puesto_deseado"),
                all_jobs=all_jobs,
            )[:4]

    history.append({"sender": "bot", "text": bot_messages[-1] if bot_messages else ""})

    candidate_profile = None
    if data.get("nombre") or data.get("municipio") or data.get("puesto_deseado") or is_location_event or data.get("email"):
        candidate_profile = _upsert_candidate(db, data, c_lat, c_lon)

    result = _response(
        chat_session, data, history,
        bot_messages=bot_messages,
        options=options,
        matched_jobs=matched_jobs,
        nearby_routes=nearby_routes,
        completed=bool(candidate_profile and matched_jobs),
        candidate_profile=candidate_profile,
        should_ask_login=should_ask_login and not data.get("google_logged_in"),
        ask_location=ask_location,
    )
    db.commit()
    return result
