"""
Servicio de visión para extraer ofertas laborales desde fotos callejeras.

Flujo:
1. Recibe imagen base64 (JPEG/PNG) + coordenadas GPS opcionales.
2. Preprocesa la imagen (EXIF, redimensiona a max 1280px, comprime).
3. Envía a Gemini Flash con un prompt estructurado + el catálogo de ChambaChat.
4. Parsea la respuesta JSON.
5. Normaliza los campos al catálogo (fuzzy match).
6. Extrae y limpia datos de contacto (teléfono MX, email, WhatsApp).
7. Calcula un score de confianza (% de campos detectados).
8. Retorna un JobPhotoExtraction listo para que el usuario lo revise.

Costos: ~$0.00002 USD por imagen (Gemini 2.0 Flash: 259 tokens por imagen).
"""

import base64
import io
import json
import logging
import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image, ImageOps

from app.config import settings
from app.constants import job_catalog
from app.schemas import ExtractedContact, JobPhotoExtraction

logger = logging.getLogger(__name__)

# ─── Constantes ───────────────────────────────────────────────────────

MAX_IMAGE_DIMENSION = 1280
JPEG_QUALITY = 85
GEMINI_TIMEOUT_SECONDS = 30
FUZZY_MATCH_THRESHOLD = 0.55

_PHONE_PATTERNS = [
    re.compile(r"(?<!\d)(\d{2}[\s\-.]?\d{4}[\s\-.]?\d{4})(?!\d)"),
    re.compile(r"(?<!\d)(\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4})(?!\d)"),
    re.compile(r"(?<!\d)(\d{10})(?!\d)"),
]
_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

_CONFIDENCE_FIELDS = [
    "titulo", "empresa_nombre", "sueldo_semanal_libre", "categoria",
    "tipo_turno", "dias_laborales", "tipo_contrato", "escolaridad_minima",
    "experiencia_minima", "municipio", "descripcion", "vacantes_disponibles",
    "prestaciones", "certificaciones", "contacto_telefono",
]


# ─── Prompt de extracción ────────────────────────────────────────────

def _build_extraction_prompt() -> str:
    """Construye el prompt con el catálogo completo de ChambaChat."""
    cats = json.dumps(job_catalog.CATEGORIAS, ensure_ascii=False)
    turnos = json.dumps(job_catalog.TIPOS_TURNO, ensure_ascii=False)
    dias = json.dumps(job_catalog.DIAS_LABORALES, ensure_ascii=False)
    contratos = json.dumps(job_catalog.TIPOS_CONTRATO, ensure_ascii=False)
    escolaridades = json.dumps(job_catalog.ESCOLARIDADES, ensure_ascii=False)
    experiencias = json.dumps(job_catalog.EXPERIENCIAS, ensure_ascii=False)
    prestaciones = json.dumps(job_catalog.PRESTACIONES, ensure_ascii=False)
    certificaciones = json.dumps(job_catalog.CERTIFICACIONES, ensure_ascii=False)
    requisitos = json.dumps(job_catalog.REQUISITOS_FISICOS, ensure_ascii=False)

    return (
        "Eres un experto en ofertas laborales operativas de manufactura y logística en México.\n"
        "Analiza esta foto de un anuncio de empleo (puede ser una lona, poster, volante, "
        "pantalla, pizarrón o publicación impresa).\n\n"
        "INSTRUCCIONES:\n"
        "1. Transcribe TODO el texto visible en la imagen, incluyendo números de teléfono, emails y direcciones.\n"
        "2. Extrae los datos de la oferta laboral y normalízalos a los campos del JSON.\n"
        "3. Para los campos de catálogo, elige la opción MÁS CERCANA de la lista proporcionada.\n"
        "4. Si el sueldo aparece como mensual, divídelo entre 4.33 para obtener el semanal.\n"
        "5. Si el sueldo aparece como quincenal, divídelo entre 2.17 para obtener el semanal.\n"
        "6. Si no puedes identificar un dato, déjalo como null.\n"
        "7. Si la imagen NO contiene una oferta laboral (es comida, paisaje, selfie, etc.), "
        "pon es_oferta_laboral=false.\n\n"
        "CATÁLOGO DE CAMPOS:\n\n"
        f"Categorías (elige una): {cats}\n\n"
        f"Tipos de turno: {turnos}\n\n"
        f"Días laborales: {dias}\n\n"
        f"Tipos de contrato: {contratos}\n\n"
        f"Escolaridad mínima: {escolaridades}\n\n"
        f"Experiencia mínima: {experiencias}\n\n"
        f"Prestaciones (elige varias): {prestaciones}\n\n"
        f"Certificaciones (texto libre, pero estas son comunes): {certificaciones}\n\n"
        f"Requisitos físicos: {requisitos}\n\n"
        "Devuelve SOLO un JSON válido con esta estructura exacta:\n"
        "{\n"
        '  "es_oferta_laboral": true,\n'
        '  "titulo": "nombre del puesto",\n'
        '  "empresa_nombre": "nombre de la empresa o null",\n'
        '  "descripcion": "resumen breve de la oferta",\n'
        '  "sueldo_semanal_libre": 0.0,\n'
        '  "categoria": "una del catálogo o null",\n'
        '  "tipo_turno": "uno del catálogo o null",\n'
        '  "dias_laborales": "uno del catálogo o null",\n'
        '  "tipo_contrato": "uno del catálogo o null",\n'
        '  "escolaridad_minima": "una del catálogo o null",\n'
        '  "experiencia_minima": "una del catálogo o null",\n'
        '  "prestaciones": [],\n'
        '  "certificaciones": [],\n'
        '  "requisitos_fisicos": [],\n'
        '  "vacantes_disponibles": 1,\n'
        '  "municipio": "municipio o ciudad o null",\n'
        '  "contacto_telefono": "teléfono a 10 dígitos o null",\n'
        '  "contacto_whatsapp": "WhatsApp a 10 dígitos o null",\n'
        '  "contacto_email": "email o null",\n'
        '  "texto_crudo": "transcripción literal de todo el texto visible en la imagen"\n'
        "}"
    )


# ─── Preprocesamiento de imagen ─────────────────────────────────────

def _preprocess_image(image_b64: str) -> Tuple[str, str]:
    """Corrige EXIF, redimensiona a max 1280px y comprime a JPEG."""
    if "," in image_b64[:100]:
        image_b64 = image_b64.split(",", 1)[1]

    raw_bytes = base64.b64decode(image_b64)
    img = Image.open(io.BytesIO(raw_bytes))
    img = ImageOps.exif_transpose(img)

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    original_size = img.size
    max_dim = max(img.size)
    if max_dim > MAX_IMAGE_DIMENSION:
        scale = MAX_IMAGE_DIMENSION / max_dim
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.LANCZOS)
        logger.info("Imagen redimensionada de %dx%d a %dx%d", *original_size, *new_size)

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    compressed_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    logger.info(
        "Imagen preprocesada: %d bytes -> %d bytes (%.0f%% reducción)",
        len(raw_bytes), buffer.tell(),
        (1 - buffer.tell() / len(raw_bytes)) * 100 if raw_bytes else 0,
    )

    return compressed_b64, "image/jpeg"


# ─── Llamada a Gemini Flash ─────────────────────────────────────────

async def _call_gemini_vision(image_b64: str, mime_type: str) -> Dict[str, Any]:
    """Envía la imagen a Gemini Flash y obtiene la extracción JSON."""
    if not settings.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY no está configurada. "
            "Obtén una clave gratuita en https://aistudio.google.com/apikey"
        )

    url = f"{settings.GEMINI_API_URL}/models/{settings.GEMINI_MODEL}:generateContent"
    params = {"key": settings.GEMINI_API_KEY}

    payload = {
        "contents": [{
            "parts": [
                {"inlineData": {"mimeType": mime_type, "data": image_b64}},
                {"text": _build_extraction_prompt()},
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
            "maxOutputTokens": 2048,
        },
    }

    async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
        response = await client.post(url, params=params, json=payload)

    if response.status_code != 200:
        error_detail = response.text[:500]
        logger.error("Gemini API error %d: %s", response.status_code, error_detail)
        raise RuntimeError(f"Error de Gemini Vision ({response.status_code}): {error_detail}")

    result = response.json()

    try:
        text = result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        logger.error("Respuesta inesperada de Gemini: %s", json.dumps(result)[:500])
        raise RuntimeError("Respuesta inesperada de Gemini Vision") from exc

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        logger.error("No se pudo parsear JSON de Gemini: %s", text[:500])
        raise RuntimeError("La respuesta de Gemini no contiene JSON válido")


# ─── Normalización al catálogo ────────────────────────────────────────

def _fuzzy_match(value: Optional[str], catalog: List[str]) -> Optional[str]:
    """Encuentra el elemento más parecido del catálogo usando similitud de secuencias."""
    if not value or not catalog:
        return None

    value_lower = value.strip().lower()
    best_match = None
    best_ratio = 0.0

    for item in catalog:
        ratio = SequenceMatcher(None, value_lower, item.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = item

    if best_ratio >= FUZZY_MATCH_THRESHOLD:
        if best_ratio < 1.0:
            logger.debug("Fuzzy match: '%s' -> '%s' (%.0f%%)", value, best_match, best_ratio * 100)
        return best_match

    logger.debug("Sin match para '%s' (mejor: '%s' al %.0f%%)", value, best_match, best_ratio * 100)
    return None


def _fuzzy_match_list(values: List[str], catalog: List[str]) -> List[str]:
    """Normaliza una lista de valores contra un catálogo, conservando tags libres."""
    result = []
    for val in values:
        matched = _fuzzy_match(val, catalog)
        if matched and matched not in result:
            result.append(matched)
        elif val.strip() and val.strip() not in result:
            result.append(val.strip())
    return result


def _normalize_to_catalog(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normaliza los campos extraídos al catálogo de ChambaChat."""
    raw["categoria"] = _fuzzy_match(raw.get("categoria"), job_catalog.CATEGORIAS)
    raw["tipo_turno"] = _fuzzy_match(raw.get("tipo_turno"), job_catalog.TIPOS_TURNO)
    raw["dias_laborales"] = _fuzzy_match(raw.get("dias_laborales"), job_catalog.DIAS_LABORALES)
    raw["tipo_contrato"] = _fuzzy_match(raw.get("tipo_contrato"), job_catalog.TIPOS_CONTRATO)
    raw["escolaridad_minima"] = _fuzzy_match(raw.get("escolaridad_minima"), job_catalog.ESCOLARIDADES)
    raw["experiencia_minima"] = _fuzzy_match(raw.get("experiencia_minima"), job_catalog.EXPERIENCIAS)
    raw["prestaciones"] = _fuzzy_match_list(raw.get("prestaciones") or [], job_catalog.PRESTACIONES)
    raw["certificaciones"] = _fuzzy_match_list(raw.get("certificaciones") or [], job_catalog.CERTIFICACIONES)
    raw["requisitos_fisicos"] = _fuzzy_match_list(raw.get("requisitos_fisicos") or [], job_catalog.REQUISITOS_FISICOS)
    return raw


# ─── Extracción de contactos ──────────────────────────────────────────

def _clean_phone(raw: Optional[str]) -> Optional[str]:
    """Limpia un teléfono a 10 dígitos puros."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("52") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    return digits if len(digits) == 10 else None


def _extract_contacts(raw: Dict[str, Any]) -> ExtractedContact:
    """Extrae y limpia datos de contacto del texto crudo y campos explícitos."""
    telefono = _clean_phone(raw.get("contacto_telefono"))
    whatsapp = _clean_phone(raw.get("contacto_whatsapp"))
    email = raw.get("contacto_email")

    if email and not _EMAIL_PATTERN.fullmatch(email.strip()):
        email = None
    elif email:
        email = email.strip().lower()

    texto = raw.get("texto_crudo") or ""

    if not telefono and not whatsapp:
        for pattern in _PHONE_PATTERNS:
            for m in pattern.findall(texto):
                cleaned = _clean_phone(m)
                if cleaned:
                    idx = texto.find(m)
                    context = texto[max(0, idx - 30):idx + len(m) + 30].lower()
                    if any(kw in context for kw in ("whatsapp", "whats", "wa.")):
                        if not whatsapp:
                            whatsapp = cleaned
                    elif not telefono:
                        telefono = cleaned

    if not email:
        email_match = _EMAIL_PATTERN.search(texto)
        if email_match:
            email = email_match.group().lower()

    return ExtractedContact(telefono=telefono, whatsapp=whatsapp, email=email)


# ─── Score de confianza ──────────────────────────────────────────────

def _calculate_confidence(data: Dict[str, Any], contacto: ExtractedContact) -> Tuple[float, int]:
    """Calcula score de confianza basado en campos detectados. Retorna (score, count)."""
    detected = 0
    for field in _CONFIDENCE_FIELDS:
        if field == "contacto_telefono":
            if contacto.telefono or contacto.whatsapp:
                detected += 1
        elif field in ("prestaciones", "certificaciones"):
            if data.get(field):
                detected += 1
        elif field == "vacantes_disponibles":
            if data.get(field) is not None and data.get(field) != 1:
                detected += 1
        elif data.get(field) is not None:
            detected += 1
    return round(detected / len(_CONFIDENCE_FIELDS), 2), detected


# ─── Función principal ────────────────────────────────────────────────

async def analyze_job_photo(
    image_b64: str,
    latitud: Optional[float] = None,
    longitud: Optional[float] = None,
    municipio: Optional[str] = None,
) -> JobPhotoExtraction:
    """
    Analiza una foto de una oferta laboral callejera y devuelve los datos estructurados.

    Args:
        image_b64: Imagen codificada en base64
        latitud: Latitud GPS de donde se tomó la foto
        longitud: Longitud GPS de donde se tomó la foto
        municipio: Municipio proporcionado por el usuario

    Returns:
        JobPhotoExtraction con los datos extraídos y normalizados
    """
    logger.info("Analizando foto de oferta laboral (GPS: %s, %s)", latitud, longitud)

    # 1. Preprocesar imagen
    processed_b64, mime_type = _preprocess_image(image_b64)

    # 2. Llamar a Gemini Flash
    raw = await _call_gemini_vision(processed_b64, mime_type)

    # 3. Verificar si es una oferta laboral
    if not raw.get("es_oferta_laboral", True):
        return JobPhotoExtraction(
            es_oferta_laboral=False,
            texto_crudo=raw.get("texto_crudo"),
            confianza=0.0,
            campos_detectados=0,
        )

    # 4. Normalizar al catálogo de ChambaChat
    raw = _normalize_to_catalog(raw)

    # 5. Extraer y limpiar contactos
    contacto = _extract_contacts(raw)

    # 6. Usar GPS del usuario si no hay municipio en la foto
    if not raw.get("municipio") and municipio:
        raw["municipio"] = municipio

    # 7. Normalizar sueldo
    sueldo = raw.get("sueldo_semanal_libre")
    if sueldo is not None:
        try:
            sueldo = round(float(sueldo), 2)
            if sueldo <= 0:
                sueldo = None
        except (ValueError, TypeError):
            sueldo = None

    # 8. Calcular confianza
    confidence, detected_count = _calculate_confidence(raw, contacto)

    return JobPhotoExtraction(
        titulo=raw.get("titulo"),
        empresa_nombre=raw.get("empresa_nombre"),
        descripcion=raw.get("descripcion"),
        sueldo_semanal_libre=sueldo,
        categoria=raw.get("categoria"),
        tipo_turno=raw.get("tipo_turno"),
        dias_laborales=raw.get("dias_laborales"),
        tipo_contrato=raw.get("tipo_contrato"),
        escolaridad_minima=raw.get("escolaridad_minima"),
        experiencia_minima=raw.get("experiencia_minima"),
        prestaciones=raw.get("prestaciones", []),
        certificaciones=raw.get("certificaciones", []),
        requisitos_fisicos=raw.get("requisitos_fisicos", []),
        vacantes_disponibles=max(1, int(raw.get("vacantes_disponibles") or 1)),
        municipio=raw.get("municipio"),
        latitud=latitud,
        longitud=longitud,
        contacto=contacto,
        texto_crudo=raw.get("texto_crudo"),
        confianza=confidence,
        campos_detectados=detected_count,
        campos_totales=len(_CONFIDENCE_FIELDS),
        es_oferta_laboral=True,
    )
