import json
import re
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

CHAMBABOT_SYSTEM_PROMPT = """Eres Chambabot 🤠, un reclutador experto, cálido, humano y empático de manufactura en Nuevo León, México.
Hablas con un tono norteño amable, respetuoso y cercano (usando términos como chamba, jale, planta, parque industrial, turno fijo, ruta de transporte, etc., sin exagerar).

Tus objetivos con el candidato son:
1. Conocer al operario de forma natural y sin fricción: su nombre, en qué municipio de Nuevo León vive o busca trabajo (ej. Apodaca, Pesquería, San Nicolás, Monterrey, Escobedo, Guadalupe, García, Santa Catarina), y su nivel de estudios.
2. Detección y Apoyo INEA (Muy importante): Si el candidato menciona que no terminó la secundaria o solo tiene primaria, trátalo con mucho respeto y aprecio. Explícale con calidez que en Chambachat colaboramos con empresas con convenio del INEA que le brindan tiempo y aula para terminar su certificado oficial gratis mientras sigue cobrando su sueldo íntegro. Pregúntale si le gustaría que lo consideremos para ese beneficio.
3. Responder con paciencia a cualquier pregunta libre que haga: sobre camiones/rutas, turnos de 8 o 12 horas, tiempos extras, comedor subsidiado, o sueldos.
4. Mantener respuestas concisas (máximo 2 o 3 párrafos breves), humanas y animadas.

SIEMPRE al final de tu respuesta, agrega una sección delimitada exactamente así:
<<<METADATA>>>
{
  "extracted_profile": {
    "nombre": "string o null si aún no lo dice",
    "municipio": "string o null si aún no lo dice",
    "nivel_educativo": "Primaria_Incompleta | Secundaria | Preparatoria | Tecnico | null",
    "tag_inea": true | false | null
  },
  "suggested_chips": [
    {"label": "Texto corto del botón", "value": "Valor a enviar"}
  ],
  "should_ask_login": true | false (true si ya se capturó nombre o municipio y aún no está logueado para invitarlo a guardar su perfil)
}
<<<END_METADATA>>>
"""

async def query_deepseek_chat(
    conversation_history: List[Dict[str, str]],
    user_message: str
) -> Dict[str, Any]:
    """
    Envía el historial y el nuevo mensaje a DeepSeek API (deepseek-chat).
    Si no hay API key configurada, usa el motor de fallback heurístico inteligente.
    """
    api_key = settings.DEEPSEEK_API_KEY.strip()
    
    if not api_key:
        return generate_heuristic_response(conversation_history, user_message)

    messages = [{"role": "system", "content": CHAMBABOT_SYSTEM_PROMPT}]
    
    # Agregar los últimos 10 mensajes del historial para no saturar
    for msg in conversation_history[-10:]:
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
                    "temperature": 0.7,
                    "max_tokens": 600
                }
            )

        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            return parse_deepseek_output(raw_text)
        else:
            print(f"DeepSeek API error {resp.status_code}: {resp.text}")
            return generate_heuristic_response(conversation_history, user_message)

    except Exception as e:
        print(f"Excepción al llamar a DeepSeek: {e}")
        return generate_heuristic_response(conversation_history, user_message)

def parse_deepseek_output(raw_text: str) -> Dict[str, Any]:
    """Separa el texto que ve el usuario de la metadata JSON interna."""
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

def generate_heuristic_response(conversation_history: List[Dict[str, str]], user_message: str) -> Dict[str, Any]:
    """
    Motor inteligente de respaldo cuando aún no se ingresa la DEEPSEEK_API_KEY.
    Garantiza que el bot siempre hable en tono humano y cálido.
    """
    msg_lower = user_message.lower()
    extracted = {}
    chips = []
    should_login = False

    # Detección de municipio
    municipios = ["apodaca", "pesquería", "pesqueria", "san nicolás", "san nicolas", "monterrey", "guadalupe", "escobedo", "garcía", "garcia", "santa catarina"]
    found_muni = next((m for m in municipios if m in msg_lower), None)
    if found_muni:
        extracted["municipio"] = found_muni.capitalize()

    # Detección de rezago escolar
    if any(term in msg_lower for term in ["primaria", "incompleta", "no termine", "no terminé", "trunca"]):
        extracted["nivel_educativo"] = "Primaria_Incompleta"
        reply = (
            "¡No te preocupes en lo más mínimo! Aquí en Nuevo León muchas plantas tienen convenios muy nobles con el INEA. "
            "Te dan aula en la misma planta y flexibilidad para que termines tu primaria o secundaria gratis, sin que descuides tu sueldo semanal 🎓🙌\n\n"
            "¿Te gustaría que te canalicemos a vacantes que ofrezcan este apoyo del INEA?"
        )
        chips = [
          {"label": "✅ Sí, me interesa el apoyo INEA", "value": "Sí, me interesa mucho el apoyo para terminar mis estudios con el INEA"},
          {"label": "❌ Por ahora solo la chamba directa", "value": "Por ahora prefiero entrar directo a trabajar"}
        ]
        should_login = True
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": should_login
        }

    # Respuesta sobre INEA aceptado
    if "sí" in msg_lower or "si" in msg_lower and ("inea" in msg_lower or "estudios" in msg_lower or "apoyo" in msg_lower):
        extracted["tag_inea"] = True
        reply = (
            "¡Excelente decisión, compadre! Ya te dejamos anotado con el beneficio del INEA. "
            "Esto te ayudará a ascender más rápido a puestos de operador calificado o líder de línea.\n\n"
            "¿Qué tipo de puesto o parque industrial te queda más cómodo para moverte?"
        )
        chips = [
            {"label": "🏭 Ensamble y Producción", "value": "Busco operario de ensamble general"},
            {"label": "🛠️ Maquinado / Prensas", "value": "Operario de prensas o máquinas"},
            {"label": "📦 Almacén y Empaque", "value": "Auxiliar de almacén o empaque"}
        ]
        should_login = True
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": should_login
        }

    # Detección de sueldo / vacantes
    if any(term in msg_lower for term in ["sueldo", "cuanto pagan", "cuánto pagan", "dinero", "2500", "3000"]):
        reply = (
            "En el corredor industrial (Apodaca, Pesquería, San Nicolás y García) los sueldos semanales libres van de $2,000 hasta $3,200 "
            "según el puesto (los que tienen turnos fijos o soldadura/maquinado son de los mejor pagados). Además casi todos incluyen transporte de personal y comedor subsidiado 🍲🚌\n\n"
            "¿En qué municipio vives para ver qué rutas de transporte te quedan a la mano?"
        )
        chips = [
            {"label": "Apodaca", "value": "Vivo en Apodaca"},
            {"label": "Pesquería", "value": "Vivo en Pesquería"},
            {"label": "San Nicolás", "value": "Vivo en San Nicolás"},
            {"label": "García", "value": "Vivo en García"}
        ]
        return {
            "reply_text": reply,
            "extracted_profile": extracted,
            "suggested_chips": chips,
            "should_ask_login": False
        }

    # Respuesta general cálida
    reply = (
        "¡Qué onda! Con todo gusto te oriento. Te conecto con las mejores plantas y naves industriales de Nuevo León. "
        "Cuéntame tu nombre, qué grado de estudios tienes o en qué zona prefieres jalar para filtrarte las mejores opciones."
    )
    chips = [
        {"label": "Buscar en Apodaca", "value": "Busco trabajo operativo en Apodaca"},
        {"label": "Apoyo de Estudios INEA", "value": "Quiero vacantes que apoyen con el INEA"},
        {"label": "Turnos Fijos", "value": "Busco trabajo con turnos fijos"}
    ]
    return {
        "reply_text": reply,
        "extracted_profile": extracted,
        "suggested_chips": chips,
        "should_ask_login": False
    }
