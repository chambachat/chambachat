"""
Currículum operativo del candidato (users.perfil_operativo).

Se llena desde tres lados y siempre con la misma estructura:
- Onboarding progresivo en el chat: una pregunta corta cada dos mensajes, con chips.
- Lo que el candidato diga en cualquier chat ("tengo prepa", "3 años de experiencia") se guarda.
- Edición directa desde su perfil (PATCH /api/v1/profile/me).
La entrevista rápida del chat directo (screening_service) también escribe aquí.

Claves de perfil_operativo:
  escolaridad, experiencia_general, experiencia {rol: nivel}, certificaciones {nombre: "Sí"|"No"|"En proceso"},
  sin_certificaciones, habilidades [..], disponibilidad, turno_preferido, puesto_deseado, edad,
  telefono_omitido, ubicacion_texto, ubicacion_municipio, actualizado_en
"""
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.constants import job_catalog
from app.models import User

ESCOLARIDADES = list(job_catalog.ESCOLARIDADES)
EXPERIENCIAS = list(job_catalog.EXPERIENCIA_CANDIDATO)
DISPONIBILIDADES = list(job_catalog.DISPONIBILIDADES)
TURNOS = list(job_catalog.TIPOS_TURNO)

FIELD_ORDER = ["puesto_deseado", "escolaridad", "experiencia_general", "certificaciones", "disponibilidad", "turno_preferido", "telefono"]
FIELD_LABELS = {
    "puesto_deseado": "Puesto que buscas", "escolaridad": "Escolaridad", "experiencia_general": "Experiencia",
    "certificaciones": "Certificaciones", "disponibilidad": "Disponibilidad", "turno_preferido": "Turno preferido",
    "telefono": "WhatsApp", "ubicacion": "Ubicación",
}
PESOS = {"escolaridad": 20, "experiencia_general": 20, "puesto_deseado": 15, "certificaciones": 10, "disponibilidad": 10, "turno_preferido": 5, "telefono": 10, "ubicacion": 10}

QUESTIONS = {
    "puesto_deseado": {
        "pregunta": "🧰 Para armarte tu perfil rapidito: ¿qué tipo de puesto buscas?",
        "opciones": ["Operador de producción / Ensamble", "Montacarguista", "Almacén y logística", "Soldador", "Empaque y etiquetado", "Ayudante general"],
    },
    "escolaridad": {"pregunta": "🎓 ¿Hasta qué grado estudiaste? Así te propongo vacantes que sí te acepten.", "opciones": ESCOLARIDADES},
    "experiencia_general": {"pregunta": "🏭 ¿Cuánta experiencia tienes trabajando en planta, almacén o producción?", "opciones": EXPERIENCIAS},
    "certificaciones": {
        "pregunta": "📄 ¿Cuentas con alguna certificación o licencia? (ej. DC-3 de montacargas)",
        "opciones": ["Licencia de montacargas (DC-3)", "Soldadura MIG / TIG / eléctrica", "Curso de seguridad industrial", "Licencia de conducir (B, C o E)", "Ninguna por ahora"],
    },
    "disponibilidad": {"pregunta": "📅 ¿Cuándo podrías empezar a trabajar?", "opciones": DISPONIBILIDADES},
    "turno_preferido": {"pregunta": "⏰ ¿Qué turno te acomoda mejor?", "opciones": TURNOS},
    "telefono": {"pregunta": "📱 ¿Me dejas tu WhatsApp (10 dígitos) para que el reclutador te pueda marcar? Es opcional.", "opciones": ["Prefiero no dar mi número por ahora"]},
}

PUESTOS = [
    ("montacarg", "Montacarguista"), ("forklift", "Montacarguista"), ("soldad", "Soldador"), ("almacen", "Almacén y logística"),
    ("embarque", "Almacén y logística"), ("ensambl", "Operador de producción / Ensamble"), ("operador", "Operador de producción / Ensamble"),
    ("produccion", "Operador de producción / Ensamble"), ("empaque", "Empaque y etiquetado"), ("calidad", "Inspector de calidad"),
    ("mantenimiento", "Mantenimiento / Técnico"), ("chofer", "Chofer / Repartidor"), ("limpieza", "Limpieza / Intendencia"),
    ("ayudante", "Ayudante general"), ("cocin", "Ayudante general"),
]


# ─── Utilidades ──────────────────────────────────────────────────────

def _norm(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def match_option(text: str, options: List[str]) -> Optional[str]:
    t = _norm(text)
    if not t:
        return None
    for opt in options:
        if _norm(opt) == t:
            return opt
    for opt in options:
        o = _norm(opt)
        if (len(t) >= 3 and t in o) or o in t:
            return opt
    return None


def parse_escolaridad(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"licenciatura|universidad|ingenier|carrera profesional", t):
        return "Licenciatura"
    if re.search(r"\btecnic|conalep|cbtis|cetis|carrera tecnica", t):
        return "Carrera técnica"
    if re.search(r"\bprepa\b|preparatoria|bachiller", t):
        return "Preparatoria / Bachillerato"
    if re.search(r"\bsecu(ndaria)?\b", t):
        return "Secundaria"
    if re.search(r"\bprimaria\b", t):
        return "Primaria"
    if re.search(r"sin estudios|ningun estudio|no estudi|no fui a la escuela", t):
        return "Sin estudios"
    return None


def parse_experiencia(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"\b(sin experiencia|no tengo experiencia|ninguna experiencia|nunca he trabajado|primer trabajo)\b", t):
        return "Sin experiencia"
    palabras = {"un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "medio": 0.5, "media": 0.5}
    m = re.search(r"(\d+(?:\.\d+)?|\b(?:un|uno|una|dos|tres|cuatro|cinco|seis|medio|media)\b)\s*(anos?|anios?|meses?|mes)\b", t)
    if not m:
        return None
    cantidad = float(m.group(1)) if m.group(1)[0].isdigit() else palabras[m.group(1)]
    meses = cantidad * 12 if m.group(2).startswith("a") else cantidad
    if meses < 6:
        return "Menos de 6 meses"
    if meses < 12:
        return "6 meses a 1 año"
    if meses <= 24:
        return "1 a 2 años"
    return "Más de 2 años"


def parse_disponibilidad(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"\b(ya|inmediat|hoy|manana|ahora|de una vez)\b", t):
        return "De inmediato"
    if "semana" in t:
        return "Esta semana"
    if re.search(r"\b15\b|quince", t):
        return "En 15 días"
    if "mes" in t:
        return "En un mes"
    return None


def parse_turno(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"matutino|manana|temprano|primer turno", t):
        return "Fijo matutino"
    if re.search(r"vespertino|tarde|segundo turno", t):
        return "Fijo vespertino"
    if re.search(r"nocturno|noche|tercer turno", t):
        return "Fijo nocturno"
    if re.search(r"rol|rotativ", t):
        return "Rotativo (rola turnos)"
    if re.search(r"12 horas|4x3|4 x 3", t):
        return "12 horas (4x3)"
    if "mixto" in t:
        return "Mixto"
    return None


def parse_phone(text: str) -> Optional[str]:
    m = re.search(r"(?<!\d)(?:\+?52\s?)?(\d{2}[\s.\-]?\d{4}[\s.\-]?\d{4}|\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4})(?!\d)", text or "")
    if not m:
        return None
    digits = re.sub(r"\D", "", m.group(1))
    if len(digits) != 10:
        return None
    return f"{digits[:2]}-{digits[2:6]}-{digits[6:]}"


def detect_puesto(text: str) -> Optional[str]:
    t = _norm(text)
    for term, label in PUESTOS:
        if term in t:
            return label
    return None


# ─── Vista del perfil ────────────────────────────────────────────────

def _perfil_of(user: Optional[User], data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if user is not None:
        return dict(user.perfil_operativo or {})
    return dict((data or {}).get("perfil") or {})


def profile_view(user: Optional[User], data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Perfil consolidado (usuario o sesión de invitado) con lo que se sabe hasta ahora."""
    perfil = _perfil_of(user, data)
    data = data or {}
    certs = [c for c, v in (perfil.get("certificaciones") or {}).items() if v == "Sí"]
    ubic_conf = bool(user is not None and user.ubicacion_confirmada and user.latitud is not None)
    ubicacion = None
    if ubic_conf:
        ubicacion = ", ".join(p for p in [user.colonia, user.municipio] if p) or "Registrada"
    elif perfil.get("ubicacion_texto"):
        ubicacion = perfil["ubicacion_texto"]
    elif data.get("latitud") is not None:
        ubicacion = ", ".join(p for p in [data.get("colonia"), data.get("loc_municipio")] if p) or "Registrada"
    return {
        "nombre": (user.nombre if user else data.get("nombre")),
        "email": (user.email if user else data.get("email")),
        "telefono": (user.telefono if user else None) or data.get("telefono"),
        "telefono_omitido": bool(perfil.get("telefono_omitido")),
        "edad": perfil.get("edad"),
        "genero": (user.genero if user else data.get("genero")),
        "aura_puntos": (user.aura_puntos if user else 0),
        "escolaridad": perfil.get("escolaridad"),
        "experiencia_general": perfil.get("experiencia_general"),
        "experiencia_por_rol": dict(perfil.get("experiencia") or {}),
        "puesto_deseado": perfil.get("puesto_deseado") or data.get("puesto_deseado"),
        "certificaciones": certs,
        "sin_certificaciones": bool(perfil.get("sin_certificaciones")),
        "habilidades": list(perfil.get("habilidades") or []),
        "disponibilidad": perfil.get("disponibilidad"),
        "turno_preferido": perfil.get("turno_preferido"),
        "sueldo_deseado": user.sueldo_deseado if user else None,
        "ubicacion": ubicacion,
        "ubicacion_confirmada": ubic_conf,
        "actualizado_en": perfil.get("actualizado_en"),
    }


def missing_fields(view: Dict[str, Any]) -> List[str]:
    faltan = []
    if not view.get("puesto_deseado"):
        faltan.append("puesto_deseado")
    if not view.get("escolaridad"):
        faltan.append("escolaridad")
    if not view.get("experiencia_general"):
        faltan.append("experiencia_general")
    if not view.get("certificaciones") and not view.get("sin_certificaciones"):
        faltan.append("certificaciones")
    if not view.get("disponibilidad"):
        faltan.append("disponibilidad")
    if not view.get("turno_preferido"):
        faltan.append("turno_preferido")
    if not view.get("telefono") and not view.get("telefono_omitido"):
        faltan.append("telefono")
    if not view.get("ubicacion"):
        faltan.append("ubicacion")
    return faltan


def completeness(view: Dict[str, Any]) -> int:
    faltan = set(missing_fields(view))
    return int(sum(p for k, p in PESOS.items() if k not in faltan))


def snapshot(user: Optional[User], data: Dict[str, Any]) -> Dict[str, Any]:
    """Resumen corto para el contexto del LLM (se guarda en la sesión)."""
    v = profile_view(user, data)
    return {k: v.get(k) for k in ("escolaridad", "experiencia_general", "certificaciones", "disponibilidad", "turno_preferido", "puesto_deseado", "edad") if v.get(k)}


# ─── Onboarding progresivo en el chat ────────────────────────────────

def question_for(field: str) -> Optional[Dict[str, Any]]:
    q = QUESTIONS.get(field)
    return {"field": field, "pregunta": q["pregunta"], "opciones": list(q["opciones"])} if q else None


def next_question(user: Optional[User], data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    faltan = missing_fields(profile_view(user, data))
    for field in FIELD_ORDER:
        if field in faltan:
            return question_for(field)
    return None


def should_ask(user: Optional[User], data: Dict[str, Any]) -> bool:
    """Una pregunta cada dos mensajes del candidato, nunca dos pendientes a la vez, y solo a candidatos."""
    if user is not None and user.role in ("recruiter", "admin"):
        return False
    if data.get("onboarding_pending"):
        return False
    turns = int(data.get("user_turns", 0))
    return turns >= 2 and (turns - int(data.get("last_onboarding_turn", 0))) >= 2


def interpret_answer(field: str, text: str) -> Optional[Dict[str, Any]]:
    """Traduce la respuesta a una pregunta de perfil en hechos; None si no parece una respuesta."""
    q = QUESTIONS.get(field)
    if not q or not text or not text.strip():
        return None
    t = _norm(text)
    opciones = q["opciones"]
    if field == "puesto_deseado":
        val = match_option(text, opciones) or detect_puesto(text) or (text.strip()[:60] if len(text.strip()) <= 60 and "?" not in text else None)
        return {"puesto_deseado": val} if val else None
    if field == "escolaridad":
        val = match_option(text, opciones) or parse_escolaridad(text)
        return {"escolaridad": val} if val else None
    if field == "experiencia_general":
        val = match_option(text, opciones) or parse_experiencia(text)
        return {"experiencia_general": val} if val else None
    if field == "certificaciones":
        if re.search(r"ningun|no tengo|no cuento|\bno\b|todavia no|aun no", t):
            return {"sin_certificaciones": True}
        found = [opt for opt in opciones if opt != "Ninguna por ahora" and (_norm(opt) in t or match_option(text, [opt]) == opt)]
        found = found or [opt for opt in job_catalog.CERTIFICACIONES if _norm(opt) in t]
        if found:
            return {"certificaciones_add": found}
        return {"certificaciones_add": [text.strip()[:60]]} if len(text.strip()) <= 60 and "?" not in text else None
    if field == "disponibilidad":
        val = match_option(text, opciones) or parse_disponibilidad(text)
        return {"disponibilidad": val} if val else None
    if field == "turno_preferido":
        val = match_option(text, opciones) or parse_turno(text)
        return {"turno_preferido": val} if val else None
    if field == "telefono":
        if re.search(r"prefiero no|no por ahora|no quiero|luego|despues|mas adelante", t):
            return {"telefono_omitido": True}
        phone = parse_phone(text)
        return {"telefono": phone} if phone else None
    return None


def extract_profile_facts(text: str) -> Dict[str, Any]:
    """Hechos de perfil mencionados de pasada en cualquier mensaje (con contexto para no confundir edad con experiencia)."""
    facts: Dict[str, Any] = {}
    t = _norm(text)
    if not t:
        return facts
    if re.search(r"\bprepa\b|preparatoria|bachiller|\bsecundaria\b|\bsecu\b|\bprimaria\b|licenciatura|universidad|ingenier|\btecnic|conalep|sin estudios|no estudi", t):
        esc = parse_escolaridad(text)
        if esc:
            facts["escolaridad"] = esc
    if re.search(r"experiencia|trabaj|he sido|labor|manejando|operando|de montacarg|como soldador|como operador", t):
        exp = parse_experiencia(text)
        if exp:
            facts["experiencia_general"] = exp
            rol = detect_puesto(text)
            if rol:
                facts["experiencia_rol"] = {rol: exp}
    m = re.search(r"\b(?:tengo|edad(?: de)?|cumpli|cumplo)\s+(\d{2})\s*(?:anos|años)\b", t)
    if m:
        ventana = t[max(0, m.start() - 20):m.end() + 20]
        if not re.search(r"experiencia|trabaj|manej|oper", ventana):
            edad = int(m.group(1))
            if 15 <= edad <= 75:
                facts["edad"] = edad
    certs = []
    if re.search(r"dc-?3|licencia de montacarg|certificad[oa] (?:de|en|para) montacarg", t):
        certs.append("Licencia de montacargas (DC-3)")
    if re.search(r"certific\w* (?:de|en) soldadura|soldador certificado|curso de soldadura", t):
        certs.append("Soldadura MIG / TIG / eléctrica")
    if re.search(r"licencia de (?:conducir|manejo|chofer|manejar)", t):
        certs.append("Licencia de conducir (B, C o E)")
    if "grua viajera" in t:
        certs.append("Operación de grúa viajera")
    if "curso de seguridad" in t:
        certs.append("Curso de seguridad industrial")
    if certs:
        facts["certificaciones_add"] = certs
    if re.search(r"whatsapp|telefono|celular|numero|marcar|contact|cel\b", t):
        phone = parse_phone(text)
        if phone:
            facts["telefono"] = phone
    if "turno" in t and not re.search(r"\?", text):
        turno = parse_turno(text)
        if turno:
            facts["turno_preferido"] = turno
    return facts


def _label(key: str, value: Any) -> Optional[str]:
    if key == "escolaridad":
        return str(value)
    if key == "experiencia_general":
        return f"{value} de experiencia"
    if key == "edad":
        return f"{value} años"
    if key == "certificaciones_add":
        return ", ".join(value)
    if key == "sin_certificaciones":
        return "sin certificaciones por ahora"
    if key == "telefono":
        return "tu WhatsApp"
    if key == "telefono_omitido":
        return "sin teléfono por ahora"
    if key == "puesto_deseado":
        return f"puesto: {value}"
    if key == "disponibilidad":
        return f"disponible {str(value).lower()}"
    if key == "turno_preferido":
        return f"turno {str(value).lower()}"
    return None


def apply_facts(perfil: Dict[str, Any], facts: Dict[str, Any], rol_hint: Optional[str] = None) -> List[str]:
    """Aplica hechos al dict de perfil. Devuelve las etiquetas de lo que realmente cambió."""
    cambios: List[str] = []
    for key, value in facts.items():
        if key == "certificaciones_add":
            certs = dict(perfil.get("certificaciones") or {})
            nuevos = [c for c in value if certs.get(c) != "Sí"]
            for c in value:
                certs[c] = "Sí"
            perfil["certificaciones"] = certs
            perfil["sin_certificaciones"] = False
            if nuevos:
                cambios.append(_label(key, nuevos))
        elif key == "experiencia_rol":
            exp = dict(perfil.get("experiencia") or {})
            exp.update(value)
            perfil["experiencia"] = exp
        elif key == "habilidades_add":
            actuales = list(perfil.get("habilidades") or [])
            nuevos = [h for h in value if h not in actuales]
            perfil["habilidades"] = actuales + nuevos
            if nuevos:
                cambios.append(", ".join(nuevos))
        elif key == "telefono":
            continue  # se guarda en el usuario / sesión, no en el JSON
        elif perfil.get(key) != value:
            perfil[key] = value
            etiqueta = _label(key, value)
            if etiqueta:
                cambios.append(etiqueta)
    if facts.get("experiencia_general") and rol_hint:
        exp = dict(perfil.get("experiencia") or {})
        exp.setdefault(rol_hint, facts["experiencia_general"])
        perfil["experiencia"] = exp
    if cambios:
        perfil["actualizado_en"] = datetime.utcnow().isoformat()
    return cambios


def save_facts(db: Session, user: Optional[User], data: Dict[str, Any], facts: Dict[str, Any]) -> Optional[str]:
    """Guarda hechos en el usuario (o en la sesión si es invitado) y devuelve la nota de confirmación."""
    if not facts:
        return None
    rol_hint = facts.get("puesto_deseado") or data.get("puesto_deseado")
    perfil = _perfil_of(user, data)
    cambios = apply_facts(perfil, facts, rol_hint)
    if facts.get("telefono"):
        if user is not None and user.telefono != facts["telefono"]:
            user.telefono = facts["telefono"]
            cambios.append(_label("telefono", None))
        elif user is None and data.get("telefono") != facts["telefono"]:
            cambios.append(_label("telefono", None))
        data["telefono"] = facts["telefono"]
    if facts.get("puesto_deseado"):
        data["puesto_deseado"] = facts["puesto_deseado"]
    if user is not None:
        user.perfil_operativo = perfil
        if facts.get("escolaridad"):
            user.nivel_educativo = facts["escolaridad"]
    else:
        data["perfil"] = perfil
    data["perfil_resumen"] = snapshot(user, data)
    if not cambios:
        return None
    return f"📝 Lo guardé en tu perfil: {', '.join(cambios)}."


def merge_session_profile(user: User, data: Dict[str, Any]) -> None:
    """Al iniciar sesión, lo recogido como invitado pasa al currículum del usuario (sin pisar lo ya capturado)."""
    guest = dict(data.get("perfil") or {})
    if data.get("puesto_deseado") and not guest.get("puesto_deseado"):
        guest["puesto_deseado"] = data["puesto_deseado"]
    if not guest and not data.get("telefono"):
        return
    perfil = dict(user.perfil_operativo or {})
    for key, value in guest.items():
        if key == "certificaciones":
            merged = dict(perfil.get("certificaciones") or {})
            for c, v in (value or {}).items():
                merged.setdefault(c, v)
            perfil["certificaciones"] = merged
        elif key == "experiencia":
            merged = dict(perfil.get("experiencia") or {})
            for r, v in (value or {}).items():
                merged.setdefault(r, v)
            perfil["experiencia"] = merged
        elif key == "habilidades":
            perfil["habilidades"] = list(dict.fromkeys(list(perfil.get("habilidades") or []) + list(value or [])))
        elif perfil.get(key) in (None, "", False):
            perfil[key] = value
    if guest.get("escolaridad") and not (user.perfil_operativo or {}).get("escolaridad"):
        user.nivel_educativo = guest["escolaridad"]
    if data.get("telefono") and not user.telefono:
        user.telefono = data["telefono"]
    perfil["actualizado_en"] = datetime.utcnow().isoformat()
    user.perfil_operativo = perfil


# ─── Edición directa desde el perfil ─────────────────────────────────

def apply_profile_updates(user: User, updates: Dict[str, Any]) -> None:
    perfil = dict(user.perfil_operativo or {})
    for key, value in updates.items():
        if value is None:
            continue
        if key == "nombre":
            user.nombre = value.strip() or user.nombre
        elif key == "telefono":
            user.telefono = value.strip() or None
            perfil["telefono_omitido"] = False
        elif key == "sueldo_deseado":
            user.sueldo_deseado = float(value)
        elif key == "certificaciones":
            limpias = list(dict.fromkeys(c.strip() for c in value if c and c.strip()))
            perfil["certificaciones"] = {c: "Sí" for c in limpias}
            perfil["sin_certificaciones"] = len(limpias) == 0
        elif key == "habilidades":
            perfil["habilidades"] = list(dict.fromkeys(h.strip() for h in value if h and h.strip()))[:30]
        elif key == "escolaridad":
            perfil["escolaridad"] = value
            user.nivel_educativo = value
        else:
            perfil[key] = value
    perfil["actualizado_en"] = datetime.utcnow().isoformat()
    user.perfil_operativo = perfil


def build_profile_response(user: User) -> Dict[str, Any]:
    view = profile_view(user)
    faltan = missing_fields(view)
    view["completitud"] = completeness(view)
    view["faltantes"] = [FIELD_LABELS.get(f, f) for f in faltan]
    view["catalogos"] = {
        "escolaridades": ESCOLARIDADES,
        "experiencias": EXPERIENCIAS,
        "disponibilidades": DISPONIBILIDADES,
        "turnos": TURNOS,
        "puestos": list(job_catalog.CATEGORIAS),
        "certificaciones": list(job_catalog.CERTIFICACIONES),
    }
    return view
