import logging

logger = logging.getLogger(__name__)

import json
import re
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

CHAMBABOT_SYSTEM_PROMPT = """Eres Chambabot 🤠, un reclutador experto, ágil, cálido y muy humano de la industria de manufactura y logística en Nuevo León, México.
Hablas con un tono norteño amable, respetuoso y trabajador (usando modismos amables como chamba, jale, planta, compadre, nave industrial, turno fijo, ruta de transporte, etc.).

Tus objetivos principales:
1. Conocer al candidato de forma fluida y sin rodeos: qué puesto busca (ej. montacarguista, operario de ensamble, prensista, soldador, ayudante de almacén, maquinado CNC, electricista) y en qué municipio de Nuevo León vive o busca trabajar (Apodaca, Pesquería, San Nicolás, Monterrey, Escobedo, Guadalupe, García, Santa Catarina).
2. SI YA SE CONOCE EL NOMBRE DEL USUARIO (proporcionado en el contexto del sistema): dirígete a él por su nombre (ej: ¡Qué onda Juan! o ¡Con gusto María!) y NUNCA le vuelvas a pedir su nombre.
3. SI EL USUARIO PREGUNTA CÓMO SE COMUNICARÁN CON ÉL O CÓMO LO CONTACTAN:
   Explícale claramente que los reclutadores de la empresa le responderán directamente por esta misma plataforma en este mismo chat, y que si agrega su número de WhatsApp o teléfono en su perfil, el reclutador también podrá llamarle o escribirle directo por WhatsApp para agendar su entrevista más rápido.
4. RECORDAR SIEMPRE EL CONTEXTO: si el candidato ya preguntó o mencionó un puesto (como montacarguista o soldador), NUNCA lo olvides. Sigue la conversación sobre ese puesto específico cuando pregunten por zonas, sueldos o requisitos.
5. Responder con datos reales de la industria en NL:
   - Montacarguistas: $2,600 - $3,400 libres/sem (piden experiencia o constancia DC-3, hombre sentado/parado, casi siempre con transporte y comedor).
   - Operarios de ensamble/producción: $2,100 - $2,600 libres/sem (contratación rápida, turnos fijos o rolados).
   - Soldadores/Técnicos: $3,000 - $4,000 libres/sem.
6. Mantener respuestas breves (máximo 2 párrafos cortos), útiles y con energía positiva.
7. Ubicación: si el contexto dice que el candidato YA registró su ubicación, NUNCA le pidas compartirla o registrarla de nuevo; solo si él dice que se mudó, que quiere cambiarla o que quiere buscar en otro lado, indícale que toque "📍 Elegir nueva ubicación". Si NO la ha registrado y pregunta por vacantes cercanas o transporte, sugiérele una sola vez, sin insistir, el botón "📍 Compartir ubicación".
8. Rutas de transporte de personal: no las menciones ni las ofrezcas por iniciativa propia. Solo si el candidato pregunta por rutas, camiones o paradas, dile que con gusto se las muestras (el sistema las calcula cuando él las pide).

SIEMPRE al final de tu respuesta, agrega una sección delimitada exactamente así:
<<<METADATA>>>
{
  "extracted_profile": {
    "nombre": "string o null",
    "municipio": "string o null",
    "puesto_deseado": "string o null (ej: montacarguista, ensamble, soldador)",
    "nivel_educativo": "string o null"
  },
  "suggested_chips": [
    {"label": "Texto corto del botón", "value": "Texto que enviará el usuario"}
  ],
  "should_ask_login": true | false
}
<<<END_METADATA>>>
"""

async def query_deepseek_chat(
    conversation_history: List[Dict[str, str]],
    user_message: str,
    context_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Envía el historial completo y el nuevo mensaje a DeepSeek API.
    Si hay error o no hay conexión, usa el fallback heurístico inteligente con memoria de contexto.
    """
    api_key = settings.DEEPSEEK_API_KEY.strip()
    
    if not api_key:
        return generate_heuristic_response(conversation_history, user_message, context_data)

    messages = [{"role": "system", "content": CHAMBABOT_SYSTEM_PROMPT}]
    
    # Inyectar contexto previo e información del usuario autenticado
    if context_data:
        ctx_lines = []
        if context_data.get("nombre"):
            ctx_lines.append(f"- El candidato ya está conectado y se llama: {context_data.get('nombre')}. NO le vuelvas a pedir su nombre; háblale por su nombre.")
        if context_data.get("telefono"):
            ctx_lines.append(f"- Su número de teléfono/WhatsApp ya está registrado ({context_data.get('telefono')}).")
        else:
            ctx_lines.append("- Aún no tiene número de teléfono registrado. Si pregunta cómo lo contactan, dile que le escribirán por este chat y que si deja su WhatsApp en su perfil también le pueden marcar o mandar WhatsApp directo.")
        if context_data.get("puesto_deseado"):
            ctx_lines.append(f"- Puesto de interés activo: {context_data.get('puesto_deseado')}.")
        if context_data.get("municipio"):
            ctx_lines.append(f"- Zona o municipio: {context_data.get('municipio')}.")
        if context_data.get("latitud") is not None and context_data.get("longitud") is not None:
            zona = ", ".join(p for p in [context_data.get("colonia"), context_data.get("loc_municipio")] if p) or "su zona"
            ctx_lines.append(f"- Ubicación YA registrada: {zona}. No le pidas compartir ni registrar su ubicación otra vez; solo si él quiere cambiarla.")
        else:
            ctx_lines.append("- Aún no ha registrado su ubicación. Solo si pregunta por cercanía o transporte, sugiérele una vez el botón 📍 Compartir ubicación.")
        ctx_lines.append("- Rutas de transporte: no las ofrezcas ni las describas salvo que el candidato pregunte por rutas, camiones o paradas.")
        perfil = context_data.get("perfil_resumen") or {}
        conocido = [t for t in [
            f"escolaridad {perfil['escolaridad']}" if perfil.get("escolaridad") else None,
            f"experiencia {perfil['experiencia_general']}" if perfil.get("experiencia_general") else None,
            f"certificaciones: {', '.join(perfil['certificaciones'])}" if perfil.get("certificaciones") else None,
            f"disponibilidad {perfil['disponibilidad']}" if perfil.get("disponibilidad") else None,
            f"turno preferido {perfil['turno_preferido']}" if perfil.get("turno_preferido") else None,
        ] if t]
        if conocido:
            ctx_lines.append("- Perfil ya registrado del candidato: " + "; ".join(conocido) + ". NO vuelvas a preguntar estos datos.")
        ctx_lines.append("- No pidas tú datos de perfil (escolaridad, experiencia, certificaciones, disponibilidad, teléfono, edad): el sistema los pregunta por su cuenta con botones.")
        
        if ctx_lines:
            messages.append({
                "role": "system",
                "content": "Contexto actual del usuario:\n" + "\n".join(ctx_lines)
            })

    # Agregar historial de los últimos 12 mensajes
    for msg in conversation_history[-12:]:
        role = "user" if msg.get("sender") == "user" else "assistant"
        messages.append({"role": role, "content": msg.get("text", "")})
        
    messages.append({"role": "user", "content": user_message})

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                settings.DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": messages,
                    "temperature": 0.6,
                    "max_tokens": 500
                }
            )

        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            return parse_deepseek_output(raw_text)
        else:
            logger.error(f"DeepSeek API respondió código {resp.status_code}: {resp.text}")
            return generate_heuristic_response(conversation_history, user_message, context_data)

    except Exception as e:
        logger.error(f"Excepción al conectar con DeepSeek API: {e}")
        return generate_heuristic_response(conversation_history, user_message, context_data)

def parse_deepseek_output(raw_text: str) -> Dict[str, Any]:
    """Separa el texto visible para el usuario del bloque de metadata JSON."""
    metadata_match = re.search(r"<<<METADATA>>>(.*?)<<<END_METADATA>>>", raw_text, re.DOTALL)
    
    clean_text = raw_text
    metadata = {
        "extracted_profile": {},
        "suggested_chips": [],
        "should_ask_login": False
    }

    if metadata_match:
        clean_text = raw_text.replace(metadata_match.group(0), "").strip()
        try:
            parsed = json.loads(metadata_match.group(1).strip())
            metadata.update(parsed)
        except Exception:
            pass

    return {
        "reply_text": clean_text,
        "extracted_profile": metadata.get("extracted_profile", {}),
        "suggested_chips": metadata.get("suggested_chips", []),
        "should_ask_login": metadata.get("should_ask_login", False)
    }

def generate_heuristic_response(
    conversation_history: List[Dict[str, str]], 
    user_message: str,
    context_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Motor heurístico de respaldo que recuerda el contexto acumulado (ej: montacarguista, soldador, municipio).
    """
    msg_lower = user_message.lower()
    extracted = {}
    chips = []
    
    prev_puesto = context_data.get("puesto_deseado") if context_data else None
    prev_muni = context_data.get("municipio") if context_data else None
    loc_known = bool(context_data and context_data.get("latitud") is not None)

    # Detección de puesto
    if any(term in msg_lower for term in ["montacarguista", "montacarga", "montacargas", "forklift"]):
        extracted["puesto_deseado"] = "Montacarguista"
        prev_puesto = "Montacarguista"
    elif any(term in msg_lower for term in ["soldador", "soldadura", "microalambre", "tig", "mig"]):
        extracted["puesto_deseado"] = "Soldador"
        prev_puesto = "Soldador"
    elif any(term in msg_lower for term in ["almacen", "almacén", "embarques", "surtidor"]):
        extracted["puesto_deseado"] = "Almacén"
        prev_puesto = "Almacén"
    elif any(term in msg_lower for term in ["ensamble", "operario", "produccion", "producción"]):
        extracted["puesto_deseado"] = "Operario de Ensamble"
        prev_puesto = "Operario de Ensamble"

    # Detección de municipio
    municipios = ["apodaca", "pesquería", "pesqueria", "san nicolás", "san nicolas", "monterrey", "guadalupe", "escobedo", "garcía", "garcia", "santa catarina"]
    found_muni = next((m for m in municipios if m in msg_lower), None)
    if found_muni:
        extracted["municipio"] = found_muni.capitalize()
        prev_muni = found_muni.capitalize()

    # Caso 0: Pregunta sobre cómo se comunicarán o cómo lo contactan
    user_name_ctx = (context_data.get("nombre") if context_data else None) or extracted.get("nombre")
    if any(w in msg_lower for w in ["comunicar", "cumicaran", "contact", "reclutador", "llam", "whatsapp", "como me contactan"]):
        disp_name = user_name_ctx or "compa"
        reply = (
            f"¡Con gusto, {disp_name}! 🤠 Al postularte a una vacante, el equipo de reclutamiento de la planta recibe de inmediato tu solicitud y te puede responder directamente por **este mismo chat**.\n\n"
            "💡 **Tip muy importante:** Si agregas tu número de teléfono o WhatsApp en tus datos, el reclutador de la empresa también podrá llamarte o escribirte directamente por WhatsApp para coordinar tu entrevista."
        )
        chips = [
            {"label": "📱 Dejar mi WhatsApp", "value": "Quiero registrar mi número de WhatsApp"},
            {"label": "🚜 Ver vacantes activas", "value": "Ver vacantes de montacarguista"},
            {"label": "⏱️ ¿Hay turnos fijos?", "value": "¿Cuáles tienen turnos fijos?"}
        ]
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": not bool(user_name_ctx)
        }

    # Caso 1: Preguntan sobre Montacarguista
    if "montacarguista" in msg_lower or "montacarga" in msg_lower:
        reply = (
            "¡Claro que sí, compadre! Tenemos excelentes vacantes de **Montacarguista** (hombre sentado y hombre parado en almacenes y CEDIS). "
            "Los sueldos van de **$2,600 a $3,400 libres semanales**, e incluyen transporte de personal, tiempo extra pagado y comedor subsidiado.\n\n"
            "¿En qué municipio vives o buscas el jale (Apodaca, Pesquería, San Nicolás, etc.) y cuentas con constancia DC-3 o experiencia?"
        )
        chips = [
            {"label": "📍 Montacarguista en Apodaca", "value": "Busco de montacarguista en Apodaca"},
            {"label": "📍 Montacarguista en Pesquería", "value": "Busco de montacarguista en Pesquería"},
            {"label": "📄 Cuento con DC-3 y Experiencia", "value": "Sí tengo experiencia y DC-3 en montacargas"},
            {"label": "💵 ¿Cuánto pagan de tiempo extra?", "value": "¿Cuánto pagan de tiempo extra y bonos?"}
        ]
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": False
        }

    # Caso 2: El usuario ya había preguntado de montacarguista (u otro puesto) y ahora elige municipio (ej. "Buscar en Apodaca")
    if prev_puesto == "Montacarguista" and (found_muni or "apodaca" in msg_lower or "pesquer" in msg_lower):
        muni_target = prev_muni or "Apodaca"
        reply = (
            f"¡Excelente! En **{muni_target}** tenemos vacantes abiertas de **Montacarguista de Almacén** en Parque Industrial Monterrey y Stiva. "
            f"Ofrecen un sueldo semanal libre de **$2,850 a $3,200 MXN**, turno fijo y ruta de transporte directo a tu colonia.\n\n"
            + ("" if loc_known else "💡 **Tip:** Si le das clic a **📍 Compartir ubicación**, te muestro las plantas con menor tiempo de traslado desde tu casa. ")
            + "¿Cuál es tu nombre para registrarte?"
        )
        chips = [
            *([] if loc_known else [{"label": "📍 Compartir mi ubicación", "value": "Quiero compartir mi ubicación para ver rutas de transporte"}]),
            {"label": "Tengo experiencia en hombre sentado", "value": "Tengo experiencia en montacargas hombre sentado"},
            {"label": "Tengo experiencia en hombre parado", "value": "Tengo experiencia en montacargas hombre parado"},
            {"label": "Ver vacantes en Apodaca", "value": f"Muéstrame las vacantes de montacarguista en {muni_target}"}
        ]
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": True
        }

    # Caso 3: Pregunta sobre municipio en general
    if found_muni:
        muni_target = found_muni.capitalize()
        puesto_str = f" de {prev_puesto}" if prev_puesto else ""
        reply = (
            f"¡Arre! En **{muni_target}** hay mucho jale activo{puesto_str} en plantas de manufactura y logística. "
            f"Los sueldos van de **$2,300 a $3,200 libres por semana** con transporte y comedor."
            + ("" if loc_known else "\n\n💡 **Tip:** Si compartes tu ubicación con el botón de abajo, te muestro las plantas con menor tiempo de traslado desde tu casa.")
        )
        chips = [
            *([] if loc_known else [{"label": "📍 Compartir mi ubicación", "value": "Quiero compartir mi ubicación para ver rutas de transporte"}]),
            {"label": "🚜 Montacarguista", "value": f"Busco vacantes de montacarguista en {muni_target}"},
            {"label": "🏭 Operario de Ensamble", "value": f"Busco vacantes de ensamble en {muni_target}"},
            {"label": "📦 Almacén", "value": f"Busco vacantes de almacén en {muni_target}"}
        ]
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": True
        }

    # Caso 4: Saludo general o pregunta libre
    reply = (
        "¡Qué onda! Con gusto te ayudo a conseguir una buena chamba en Nuevo León. "
        "Tenemos vacantes operativas de montacarguistas, ensamble, soldadura y almacén en Apodaca, Pesquería, San Nicolás, García y Guadalupe. "
        "¿Qué puesto te interesa o en qué municipio te gustaría jalar?"
    )
    chips = [
        {"label": "🚜 Montacarguista", "value": "Busco vacantes de montacarguista"},
        {"label": "🏭 Ensamble en Apodaca", "value": "Busco de operario en Apodaca"},
        {"label": "📦 Almacén y Logística", "value": "Busco jale de almacén"},
        {"label": "💰 Sueldos mayores a $2,800", "value": "¿Qué puestos pagan más de $2,800 por semana?"}
    ]
    return {
        "reply_text": reply,
        "extracted_profile": extracted,
        "suggested_chips": chips,
        "should_ask_login": False
    }
