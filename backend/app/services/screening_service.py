"""
Entrevista rápida de Chambot al abrir el chat directo con el reclutador.

Las preguntas se derivan de los campos estructurados de la vacante (experiencia mínima,
escolaridad, certificaciones, condiciones físicas, turno) más ubicación y disponibilidad.
Lo que ya sabemos del candidato (perfil_operativo, ubicación confirmada) no se vuelve a
preguntar. Al terminar se calcula la compatibilidad (0-100) con desglose para el reclutador
y se le confirma al candidato que su información fue enviada.
"""
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.constants import job_catalog
from app.models import ApplicationMessage, Job, JobApplication, User
from app.services.geo import MUNICIPIOS_NL_COORDS, get_municipio_coords, haversine_distance_km

EXPERIENCIA_OPCIONES = list(job_catalog.EXPERIENCIA_CANDIDATO)
# Experiencia mínima de la vacante (catálogo) → nivel mínimo en EXPERIENCIA_OPCIONES
EXPERIENCIA_MINIMA_NIVEL = {"Sin experiencia": 0, "6 meses": 2, "1 año": 3, "2 años o más": 4}
SI_NO_PROCESO = ["Sí", "No", "En proceso"]
CONDICIONES_OPCIONES = ["Sí, sin problema", "Algunas sí", "No"]
TURNO_OPCIONES = ["Sí, me acomoda", "Prefiero otro turno", "No puedo ese turno"]
DISPONIBILIDAD_OPCIONES = list(job_catalog.DISPONIBILIDADES)

PESOS = {"experiencia": 25, "escolaridad": 20, "certificaciones": 20, "condiciones": 10, "turno": 10, "ubicacion": 10, "disponibilidad": 5}
ORDEN_CLAVES = ["experiencia", "escolaridad", "cert:", "condiciones", "turno", "ubicacion", "disponibilidad"]

BOT_NAME = "Chambot (IA)"


# ─── Utilidades de texto ─────────────────────────────────────────────

def _norm(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def _match_option(text: str, options: List[str]) -> Optional[str]:
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


def _yes_no(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"\b(proceso|tramit|sacando|por sacar|estoy por)\b", t):
        return "En proceso"
    if re.search(r"\bno\b", t):
        return "No"
    if re.search(r"\b(si|claro|tengo|cuento|por supuesto|afirmativo|simon|arre|obvio|correcto)\b", t):
        return "Sí"
    return None


def _parse_experiencia(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"\b(sin|no tengo|ninguna|nada|nunca|cero)\b", t):
        return "Sin experiencia"
    palabras = {"un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "medio": 0.5, "media": 0.5}
    meses = None
    m = re.search(r"(\d+(?:\.\d+)?|\b(?:un|uno|una|dos|tres|cuatro|cinco|seis|medio|media)\b)\s*(anos?|anios?|meses?|mes)\b", t)
    if m:
        cantidad = float(m.group(1)) if m.group(1)[0].isdigit() else palabras[m.group(1)]
        meses = cantidad * 12 if m.group(2).startswith("a") else cantidad
    if meses is None:
        return None
    if meses < 6:
        return "Menos de 6 meses"
    if meses < 12:
        return "6 meses a 1 año"
    if meses <= 24:
        return "1 a 2 años"
    return "Más de 2 años"


def _parse_escolaridad(text: str) -> Optional[str]:
    t = _norm(text)
    if re.search(r"licenciatura|universidad|ingenier|carrera profesional", t):
        return "Licenciatura"
    if re.search(r"tecnic|conalep|cbtis|cetis", t):
        return "Carrera técnica"
    if re.search(r"prepa|bachiller", t):
        return "Preparatoria / Bachillerato"
    if re.search(r"secu", t):
        return "Secundaria"
    if re.search(r"primaria", t):
        return "Primaria"
    if re.search(r"sin estudios|ninguno|no estudi|no fui", t):
        return "Sin estudios"
    return None


def detect_municipio(text: str) -> Optional[str]:
    t = _norm(text)
    for nombre in sorted(MUNICIPIOS_NL_COORDS.keys(), key=len, reverse=True):
        if _norm(nombre) in t:
            return nombre.title()
    return None


def _looks_like_question(text: str, options: List[str]) -> bool:
    """Durante la entrevista, una duda sobre la vacante no se toma como respuesta: se contesta y se repite la pregunta."""
    if _match_option(text, options):
        return False
    t = _norm(text)
    return "?" in text or bool(re.match(r"^(cuanto|cuantos|que|como|donde|cual|cuales|hay|tienen|pagan|dan|ofrecen)\b", t))


# ─── Conocimiento de la vacante (también lo usa el respaldo de 2 minutos) ─

def answer_job_question(job: Job, question: str) -> str:
    q = _norm(question)
    if re.search(r"sueldo|pagan|cuanto|dinero|semanal|salario|bono|vales", q):
        extras = ""
        if (job.bono_semanal or 0) > 0 or (job.vales_despensa_semanal or 0) > 0:
            extras = f" Además ofrece ${(job.bono_semanal or 0):,.0f} en bonos y ${(job.vales_despensa_semanal or 0):,.0f} en vales a la semana."
        return (
            f"Para la vacante de {job.titulo} en {job.empresa_nombre}, el sueldo es de ${job.sueldo_semanal_libre:,.0f} semanales libres "
            f"(~${round(job.sueldo_semanal_libre * 4.33):,.0f} al mes), más prestaciones de ley.{extras} El reclutador te dará los pormenores de nómina."
        )
    if re.search(r"turno|horario|hora|rolar|fijo|dias|descanso", q):
        horario = f" de {job.hora_entrada} a {job.hora_salida}" if job.hora_entrada and job.hora_salida else ""
        dias = f", {job.dias_laborales}" if job.dias_laborales else ""
        turnos_txt = f"{job.tipo_turno or 'turno fijo'}{horario}{dias}" if job.turnos_fijos or job.tipo_turno else "turnos que pueden ser rotativos según la línea de producción"
        return f"Sobre los horarios en {job.empresa_nombre}: esta posición es {turnos_txt}. El reclutador confirmará contigo la disponibilidad exacta."
    if re.search(r"camion|transporte|ruta|parada|llegar", q):
        trans_txt = "cuenta con rutas de transporte de personal incluidas" if job.transporte_incluido else "no cuenta con transporte directo, pero tiene acceso rápido a rutas urbanas"
        return f"Para la planta en {job.municipio}, la empresa {trans_txt}. Cuando el reclutador responda te indicará la ruta y parada más cercana a tu domicilio."
    if re.search(r"estudio|secundaria|prepa|inea|certificado|escolaridad", q):
        inea_txt = "cuenta con aula y facilidades del programa INEA en planta para certificar tu educación básica" if job.apoyo_inea else f"pide {job.escolaridad_minima or 'educación básica'}"
        return f"Respecto a los estudios: para {job.titulo}, {job.empresa_nombre} {inea_txt}."
    if re.search(r"prestacion|imss|infonavit|seguro|comedor|uniforme", q):
        prest = ", ".join(job.prestaciones or []) or "prestaciones de ley"
        return f"Las prestaciones de esta vacante son: {prest}."
    if re.search(r"donde|ubicacion|direccion|planta|queda", q):
        return f"La planta está ubicada en el municipio de {job.municipio}{(', ' + job.direccion) if job.direccion else ''}. El reclutador te dará referencias exactas para tu entrevista."
    return (
        f"¡Hola! El reclutador de {job.empresa_nombre} se encuentra atendiendo operaciones en planta, pero tu mensaje quedó registrado. "
        f"Mientras tanto, si tienes dudas sobre sueldos (${job.sueldo_semanal_libre:,.0f}/sem), turnos o rutas de transporte, ¡aquí sigo con gusto para ayudarte!"
    )


# ─── Plan de preguntas ───────────────────────────────────────────────

def _perfil(user: Optional[User]) -> Dict[str, Any]:
    return dict(getattr(user, "perfil_operativo", None) or {}) if user else {}


def _rol(job: Job) -> str:
    rol = (job.categoria or job.titulo or "el puesto").strip()
    if "(" not in rol and " / " in rol:
        rol = rol.split(" / ")[0]
    return rol


def _horario_txt(job: Job) -> str:
    partes = [job.tipo_turno or "turno fijo"]
    if job.hora_entrada and job.hora_salida:
        partes.append(f"de {job.hora_entrada} a {job.hora_salida}")
    if job.dias_laborales:
        partes.append(job.dias_laborales)
    return ", ".join(partes)


def build_steps(job: Job, user: Optional[User]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Preguntas pendientes para esta vacante y respuestas ya conocidas por el perfil del candidato."""
    perfil = _perfil(user)
    rol = _rol(job)
    steps: List[Dict[str, Any]] = []
    conocidos: Dict[str, Any] = {}

    exp = (perfil.get("experiencia") or {}).get(rol)
    if exp:
        conocidos["experiencia"] = {"pregunta": f"Experiencia como {rol}", "respuesta": exp, "fuente": "perfil"}
    else:
        steps.append({"key": "experiencia", "pregunta": f"¿Cuánta experiencia tienes como {rol}?", "opciones": EXPERIENCIA_OPCIONES})

    if perfil.get("escolaridad"):
        conocidos["escolaridad"] = {"pregunta": "Escolaridad", "respuesta": perfil["escolaridad"], "fuente": "perfil"}
    else:
        steps.append({"key": "escolaridad", "pregunta": "¿Hasta qué grado estudiaste?", "opciones": list(job_catalog.ESCOLARIDADES)})

    for cert in (job.certificaciones or [])[:4]:
        known = (perfil.get("certificaciones") or {}).get(cert)
        if known == "Sí":
            conocidos[f"cert:{cert}"] = {"pregunta": cert, "respuesta": "Sí", "fuente": "perfil"}
        else:
            steps.append({"key": f"cert:{cert}", "pregunta": f"¿Cuentas con {cert}?", "opciones": SI_NO_PROCESO, "cert": cert})

    if job.requisitos_fisicos:
        steps.append({
            "key": "condiciones",
            "pregunta": f"El puesto implica: {', '.join(job.requisitos_fisicos)}. ¿Puedes con eso?",
            "opciones": CONDICIONES_OPCIONES,
        })

    if job.tipo_turno or job.hora_entrada:
        steps.append({"key": "turno", "pregunta": f"El turno es {_horario_txt(job)}. ¿Te acomoda?", "opciones": TURNO_OPCIONES})

    if user is not None and user.ubicacion_confirmada and user.latitud is not None:
        conocidos["ubicacion"] = {
            "pregunta": "Ubicación",
            "respuesta": ", ".join(p for p in [user.colonia, user.municipio] if p) or "Registrada",
            "municipio": user.municipio, "fuente": "perfil",
        }
    elif perfil.get("ubicacion_texto"):
        conocidos["ubicacion"] = {"pregunta": "Ubicación", "respuesta": perfil["ubicacion_texto"], "municipio": perfil.get("ubicacion_municipio"), "fuente": "perfil"}
    else:
        steps.append({
            "key": "ubicacion",
            "pregunta": "¿En qué colonia y municipio vives? Escríbelo (ej. Huinalá, Apodaca) o toca 📍 Compartir mi ubicación.",
            "opciones": [],
        })

    steps.append({"key": "disponibilidad", "pregunta": "¿Cuándo podrías empezar?", "opciones": DISPONIBILIDAD_OPCIONES})
    return steps, conocidos


def _format_question(step: Dict[str, Any], index: int, total: int) -> str:
    text = f"🤖 ({index + 1}/{total}) {step['pregunta']}"
    if step.get("opciones"):
        text += "\n\nElige una opción abajo o escribe tu respuesta."
    return text


def _bot(db: Session, app: JobApplication, text: str) -> ApplicationMessage:
    msg = ApplicationMessage(application_id=app.id, sender_type="bot", sender_name=BOT_NAME, mensaje=text)
    db.add(msg)
    db.flush()
    return msg


def _first_name(app: JobApplication) -> str:
    return (app.candidate_name or "compa").split()[0]


def _resumen_conocidos(conocidos: Dict[str, Any]) -> str:
    etiquetas = []
    for key in conocidos:
        if key == "experiencia":
            etiquetas.append("tu experiencia")
        elif key == "escolaridad":
            etiquetas.append("tu escolaridad")
        elif key.startswith("cert:"):
            etiquetas.append("tus certificaciones")
        elif key == "ubicacion":
            etiquetas.append("tu ubicación")
    return ", ".join(dict.fromkeys(etiquetas))


def start_screening(db: Session, app: JobApplication, job: Job, user: Optional[User]) -> List[ApplicationMessage]:
    """Abre la entrevista: mensaje de intro + primera pregunta (o cierra de inmediato si ya sabemos todo)."""
    steps, conocidos = build_steps(job, user)
    state = {"steps": steps, "index": 0, "answers": conocidos, "rol": _rol(job)}
    app.screening_state = state
    app.screening_status = "in_progress"
    name = _first_name(app)

    intro = f"🤖 ¡Qué onda {name}! Este es tu chat directo con el equipo de {job.empresa_nombre}."
    if steps:
        n = len(steps)
        intro += f" Antes de pasarte con el reclutador te hago {n} pregunta{'s' if n != 1 else ''} rápida{'s' if n != 1 else ''} para enviarle tu información completa."
        if conocidos:
            intro += f" Ya tengo {_resumen_conocidos(conocidos)}; solo te pregunto lo que falta."
        posted = [_bot(db, app, intro), _bot(db, app, _format_question(steps[0], 0, n))]
        return posted
    posted = [_bot(db, app, intro + " Ya tengo toda tu información, así que se la envié al reclutador de una vez.")]
    posted.extend(_finalize(db, app, job, user, state))
    return posted


def current_screening(app: JobApplication) -> Optional[Dict[str, Any]]:
    """Estado para la API: pregunta y opciones vigentes (el frontend las muestra como chips)."""
    status = app.screening_status or "none"
    state = app.screening_state or {}
    steps = state.get("steps") or []
    if status == "in_progress" and state.get("index", 0) < len(steps):
        step = steps[state["index"]]
        return {
            "status": status, "step_key": step["key"], "question": step["pregunta"],
            "options": step.get("opciones") or [], "index": state["index"] + 1, "total": len(steps),
        }
    if status == "done":
        return {"status": status, "total": len(steps), "completed_at": app.screening_completed_at.isoformat() if app.screening_completed_at else None}
    return None


# ─── Respuestas ──────────────────────────────────────────────────────

def _interpret(step: Dict[str, Any], text: str, user: Optional[User]) -> Dict[str, Any]:
    key = step["key"]
    opciones = step.get("opciones") or []
    answer: Dict[str, Any] = {"pregunta": step["pregunta"], "texto": text.strip(), "fuente": "chat"}

    if key == "experiencia":
        answer["respuesta"] = _match_option(text, opciones) or _parse_experiencia(text) or text.strip()
    elif key == "escolaridad":
        answer["respuesta"] = _match_option(text, opciones) or _parse_escolaridad(text) or text.strip()
    elif key.startswith("cert:"):
        answer["respuesta"] = _match_option(text, opciones) or _yes_no(text) or text.strip()
    elif key == "condiciones":
        yn = _yes_no(text)
        answer["respuesta"] = _match_option(text, opciones) or ("Algunas sí" if "algun" in _norm(text) else {"Sí": "Sí, sin problema", "No": "No"}.get(yn)) or text.strip()
    elif key == "turno":
        yn = _yes_no(text)
        t = _norm(text)
        answer["respuesta"] = _match_option(text, opciones) or ("Prefiero otro turno" if re.search(r"otro|prefer|cambiar", t) else {"Sí": "Sí, me acomoda", "No": "No puedo ese turno"}.get(yn)) or text.strip()
    elif key == "ubicacion":
        raw = re.sub(r"^\W*(vivo en|mi ubicacion:?|estoy en)\s*", "", _norm(text)).strip()
        municipio = detect_municipio(text)
        if user is not None and user.ubicacion_confirmada and user.latitud is not None:
            municipio = user.municipio or municipio
            colonia = user.colonia or raw.split(",")[0].strip().title()
        else:
            colonia = raw.split(",")[0].strip().title() if "," in raw else (raw.replace(_norm(municipio or ""), "").strip(" ,").title() if municipio else raw.title())
        answer["respuesta"] = ", ".join(p for p in [colonia or None, municipio] if p) or text.strip()
        answer["municipio"] = municipio
        answer["colonia"] = colonia or None
    elif key == "disponibilidad":
        t = _norm(text)
        answer["respuesta"] = _match_option(text, opciones) or (
            "De inmediato" if re.search(r"ya|inmediat|hoy|manana|ahora", t)
            else "Esta semana" if "semana" in t
            else "En 15 días" if re.search(r"15|quince", t)
            else "En un mes" if "mes" in t else text.strip()
        )
    else:
        answer["respuesta"] = _match_option(text, opciones) or text.strip()
    return answer


def handle_candidate_answer(db: Session, app: JobApplication, user: Optional[User], text: str) -> List[ApplicationMessage]:
    """Registra la respuesta al paso vigente y publica la siguiente pregunta o el cierre."""
    state = dict(app.screening_state or {})
    steps = state.get("steps") or []
    idx = int(state.get("index", 0))
    if app.screening_status != "in_progress" or idx >= len(steps):
        return []
    step = steps[idx]
    job = app.job

    # Una duda sobre la vacante se contesta al momento y se repite la pregunta pendiente
    if _looks_like_question(text, step.get("opciones") or []) and step["key"] != "ubicacion":
        return [
            _bot(db, app, f"🤖 {answer_job_question(job, text)}"),
            _bot(db, app, f"🤖 Ahora sí, seguimos: ({idx + 1}/{len(steps)}) {step['pregunta']}"),
        ]

    answers = dict(state.get("answers") or {})
    answers[step["key"]] = _interpret(step, text, user)
    idx += 1
    state.update({"index": idx, "answers": answers})
    app.screening_state = state

    if idx < len(steps):
        return [_bot(db, app, _format_question(steps[idx], idx, len(steps)))]
    return _finalize(db, app, job, user, state)


# ─── Compatibilidad ──────────────────────────────────────────────────

def _distance_km(job: Job, answers: Dict[str, Any], user: Optional[User]) -> Optional[float]:
    if job.latitud is None or job.longitud is None:
        return None
    if user is not None and user.ubicacion_confirmada and user.latitud is not None and user.longitud is not None:
        return haversine_distance_km(user.latitud, user.longitud, job.latitud, job.longitud)
    municipio = (answers.get("ubicacion") or {}).get("municipio") or (user.municipio if user else None)
    if not municipio:
        return None
    lat, lon = get_municipio_coords(municipio)
    return haversine_distance_km(lat, lon, job.latitud, job.longitud)


def compute_score(job: Job, answers: Dict[str, Any], user: Optional[User]) -> Tuple[int, List[Dict[str, Any]], str]:
    def ans(key: str) -> Optional[str]:
        return (answers.get(key) or {}).get("respuesta")

    breakdown: List[Dict[str, Any]] = []

    # Experiencia (25)
    req = EXPERIENCIA_MINIMA_NIVEL.get(job.experiencia_minima or "Sin experiencia", 0)
    a = ans("experiencia")
    have = EXPERIENCIA_OPCIONES.index(a) if a in EXPERIENCIA_OPCIONES else None
    pts = 10 if have is None else 25 if have >= req else 12 if have == req - 1 else 0
    breakdown.append({"criterio": "Experiencia", "puntos": pts, "max": 25, "detalle": f"{a or 'sin dato'} · pide {job.experiencia_minima or 'sin experiencia'}"})

    # Escolaridad (20)
    esc = list(job_catalog.ESCOLARIDADES)
    req_i = esc.index(job.escolaridad_minima) if job.escolaridad_minima in esc else 0
    a = ans("escolaridad")
    have_i = esc.index(a) if a in esc else None
    pts = 8 if have_i is None else 20 if have_i >= req_i else 10 if have_i == req_i - 1 else 0
    breakdown.append({"criterio": "Escolaridad", "puntos": pts, "max": 20, "detalle": f"{a or 'sin dato'} · pide {job.escolaridad_minima or 'no especificada'}"})

    # Certificaciones (20)
    certs = job.certificaciones or []
    if not certs:
        pts, detalle = 20, "No requiere certificaciones"
    else:
        vals = []
        for c in certs:
            r = ans(f"cert:{c}")
            vals.append(1.0 if r == "Sí" else 0.0 if r == "No" else 0.5)
        pts = round(20 * sum(vals) / len(vals))
        detalle = f"{sum(1 for c in certs if ans(f'cert:{c}') == 'Sí')} de {len(certs)} acreditadas"
    breakdown.append({"criterio": "Certificaciones", "puntos": pts, "max": 20, "detalle": detalle})

    # Condiciones físicas (10)
    if not job.requisitos_fisicos:
        pts, detalle = 10, "Sin condiciones especiales"
    else:
        a = ans("condiciones")
        pts = {"Sí, sin problema": 10, "Algunas sí": 5, "No": 0}.get(a, 5)
        detalle = a or "sin dato"
    breakdown.append({"criterio": "Condiciones del puesto", "puntos": pts, "max": 10, "detalle": detalle})

    # Turno (10)
    if not (job.tipo_turno or job.hora_entrada):
        pts, detalle = 10, "Turno no especificado"
    else:
        a = ans("turno")
        pts = {"Sí, me acomoda": 10, "Prefiero otro turno": 4, "No puedo ese turno": 0}.get(a, 5)
        detalle = f"{a or 'sin dato'} · {_horario_txt(job)}"
    breakdown.append({"criterio": "Turno", "puntos": pts, "max": 10, "detalle": detalle})

    # Ubicación (10)
    dist = _distance_km(job, answers, user)
    if dist is None:
        pts, detalle = 5, "Ubicación no indicada"
    else:
        pts = 10 if dist <= 10 else 7 if dist <= 25 else 4 if dist <= 40 else 1
        detalle = f"~{dist:.0f} km de la planta ({ans('ubicacion') or 'municipio del perfil'})"
    breakdown.append({"criterio": "Cercanía", "puntos": pts, "max": 10, "detalle": detalle})

    # Disponibilidad (5)
    a = ans("disponibilidad")
    pts = {"De inmediato": 5, "Esta semana": 4, "En 15 días": 3, "En un mes": 2}.get(a, 3)
    breakdown.append({"criterio": "Disponibilidad", "puntos": pts, "max": 5, "detalle": a or "sin dato"})

    score = int(sum(b["puntos"] for b in breakdown))
    level = "Alta" if score >= 80 else "Media" if score >= 60 else "Baja"
    return score, breakdown, level


def ordered_answers(answers: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    def rank(key: str) -> int:
        for i, prefix in enumerate(ORDEN_CLAVES):
            if key == prefix or (prefix.endswith(":") and key.startswith(prefix)):
                return i
        return len(ORDEN_CLAVES)
    return sorted(answers.items(), key=lambda kv: rank(kv[0]))


def _finalize(db: Session, app: JobApplication, job: Job, user: Optional[User], state: Dict[str, Any]) -> List[ApplicationMessage]:
    answers = dict(state.get("answers") or {})
    score, breakdown, level = compute_score(job, answers, user)
    app.match_score = score
    app.match_breakdown = breakdown
    app.match_level = level
    app.screening_answers = answers
    app.screening_status = "done"
    app.screening_completed_at = datetime.utcnow()

    ubic = answers.get("ubicacion") or {}
    if ubic.get("municipio"):
        app.municipio = ubic["municipio"]

    if user is not None:
        perfil = _perfil(user)
        rol = state.get("rol") or _rol(job)
        if (answers.get("experiencia") or {}).get("respuesta") in EXPERIENCIA_OPCIONES:
            nivel = answers["experiencia"]["respuesta"]
            perfil["experiencia"] = {**(perfil.get("experiencia") or {}), rol: nivel}
            actual = perfil.get("experiencia_general")
            if actual not in EXPERIENCIA_OPCIONES or EXPERIENCIA_OPCIONES.index(nivel) > EXPERIENCIA_OPCIONES.index(actual):
                perfil["experiencia_general"] = nivel
        if (answers.get("escolaridad") or {}).get("respuesta") in job_catalog.ESCOLARIDADES:
            perfil["escolaridad"] = answers["escolaridad"]["respuesta"]
            user.nivel_educativo = answers["escolaridad"]["respuesta"]
        for key, val in answers.items():
            if key.startswith("cert:") and val.get("respuesta") in SI_NO_PROCESO:
                perfil.setdefault("certificaciones", {})[key[5:]] = val["respuesta"]
        if ubic.get("fuente") == "chat" and ubic.get("respuesta"):
            perfil["ubicacion_texto"] = ubic["respuesta"]
            perfil["ubicacion_municipio"] = ubic.get("municipio")
            if ubic.get("municipio") and not user.ubicacion_confirmada:
                user.municipio = ubic["municipio"]
        if (answers.get("disponibilidad") or {}).get("respuesta"):
            perfil["disponibilidad"] = answers["disponibilidad"]["respuesta"]
        perfil["ultima_entrevista"] = datetime.utcnow().isoformat()
        user.perfil_operativo = perfil

    bullets = "\n".join(f"• {v.get('pregunta')}: {v.get('respuesta')}" for _, v in ordered_answers(answers) if v.get("respuesta"))
    summary = (
        f"✅ ¡Listo, {_first_name(app)}! Ya envié tu información al reclutador de {job.empresa_nombre}:\n{bullets}\n\n"
        "El reclutador la revisará y te responderá por aquí. Si tarda, yo te apoyo con dudas de la vacante."
    )
    return [_bot(db, app, summary)]
