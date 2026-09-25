"""
Tests para el servicio de visión (job_vision_service) y los endpoints /from-photo.

Usa mocks de Gemini para no hacer llamadas reales en CI.
Prueba: normalización al catálogo, extracción de contactos, confianza, edge cases.
"""

import base64
import io
import json
from unittest.mock import AsyncMock, patch

import pytest
from PIL import Image

from app.services.job_vision_service import (
    _calculate_confidence,
    _clean_phone,
    _extract_contacts,
    _fuzzy_match,
    _normalize_to_catalog,
    _preprocess_image,
)
from app.schemas import ExtractedContact


# ─── Helpers ──────────────────────────────────────────────────────────

def _make_test_image_b64(width=800, height=600, color=(200, 200, 200)):
    """Crea una imagen JPEG de prueba codificada en base64."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=50)
    return base64.b64encode(buf.getvalue()).decode("ascii")


MOCK_GEMINI_RESPONSE = {
    "es_oferta_laboral": True,
    "titulo": "Operador de producción",
    "empresa_nombre": "Plásticos del Norte S.A.",
    "descripcion": "Se solicitan operadores para línea de producción en planta de inyección.",
    "sueldo_semanal_libre": 2800.0,
    "categoria": "Operador de producción / Ensamble",
    "tipo_turno": "Fijo matutino",
    "dias_laborales": "Lunes a Sábado",
    "tipo_contrato": "Planta (tiempo indeterminado)",
    "escolaridad_minima": "Secundaria",
    "experiencia_minima": "Sin experiencia",
    "prestaciones": [
        "Prestaciones de ley (IMSS, Infonavit, aguinaldo, vacaciones)",
        "Transporte de personal",
        "Comedor subsidiado",
    ],
    "certificaciones": [],
    "requisitos_fisicos": ["Trabajo de pie prolongado"],
    "vacantes_disponibles": 15,
    "municipio": "Apodaca",
    "contacto_telefono": "8112345678",
    "contacto_whatsapp": "8187654321",
    "contacto_email": "rh@plasticosdelnorte.mx",
    "texto_crudo": "SE SOLICITAN OPERADORES DE PRODUCCION Plásticos del Norte S.A. Sueldo: $2,800 libres semanales...",
}


# ─── Tests de limpieza de teléfono ────────────────────────────────────

class TestCleanPhone:
    def test_ten_digits(self):
        assert _clean_phone("8112345678") == "8112345678"

    def test_with_separators(self):
        assert _clean_phone("81-1234-5678") == "8112345678"

    def test_with_spaces(self):
        assert _clean_phone("81 1234 5678") == "8112345678"

    def test_with_country_code_52(self):
        assert _clean_phone("+528112345678") == "8112345678"

    def test_with_leading_1(self):
        assert _clean_phone("18112345678") == "8112345678"

    def test_too_short(self):
        assert _clean_phone("812345") is None

    def test_too_long(self):
        assert _clean_phone("811234567890") is None

    def test_none(self):
        assert _clean_phone(None) is None

    def test_empty(self):
        assert _clean_phone("") is None


# ─── Tests de fuzzy match ────────────────────────────────────────────

class TestFuzzyMatch:
    def test_exact_match(self):
        catalog = ["Montacarguista", "Soldador", "Ayudante general"]
        assert _fuzzy_match("Montacarguista", catalog) == "Montacarguista"

    def test_close_match(self):
        catalog = ["Operador de producción / Ensamble", "Montacarguista"]
        result = _fuzzy_match("Operador de produccion", catalog)
        assert result == "Operador de producción / Ensamble"

    def test_case_insensitive(self):
        catalog = ["Soldador", "Montacarguista"]
        assert _fuzzy_match("soldador", catalog) == "Soldador"

    def test_no_match(self):
        catalog = ["Montacarguista", "Soldador"]
        assert _fuzzy_match("Chef de cocina", catalog) is None

    def test_none_value(self):
        assert _fuzzy_match(None, ["a", "b"]) is None

    def test_empty_catalog(self):
        assert _fuzzy_match("algo", []) is None


# ─── Tests de extracción de contactos ─────────────────────────────────

class TestExtractContacts:
    def test_explicit_fields(self):
        raw = {
            "contacto_telefono": "81-1234-5678",
            "contacto_whatsapp": "81-8765-4321",
            "contacto_email": "rh@empresa.com",
            "texto_crudo": "",
        }
        c = _extract_contacts(raw)
        assert c.telefono == "8112345678"
        assert c.whatsapp == "8187654321"
        assert c.email == "rh@empresa.com"

    def test_fallback_to_text_crudo(self):
        raw = {
            "contacto_telefono": None,
            "contacto_whatsapp": None,
            "contacto_email": None,
            "texto_crudo": (
                "Para información, llamar al teléfono de oficina 8112345678 de lunes a viernes. "
                "También puede mandar WhatsApp al 8187654321. Correo: rh@plasticos.mx"
            ),
        }
        c = _extract_contacts(raw)
        assert c.telefono == "8112345678"
        assert c.whatsapp == "8187654321"
        assert c.email == "rh@plasticos.mx"

    def test_invalid_email(self):
        raw = {
            "contacto_telefono": None,
            "contacto_whatsapp": None,
            "contacto_email": "not-an-email",
            "texto_crudo": "",
        }
        c = _extract_contacts(raw)
        assert c.email is None

    def test_no_contacts(self):
        raw = {
            "contacto_telefono": None,
            "contacto_whatsapp": None,
            "contacto_email": None,
            "texto_crudo": "Se solicita personal.",
        }
        c = _extract_contacts(raw)
        assert c.telefono is None
        assert c.whatsapp is None
        assert c.email is None


# ─── Tests de normalización ──────────────────────────────────────────

class TestNormalize:
    def test_normalize_full_response(self):
        raw = {
            "categoria": "operador de produccion",
            "tipo_turno": "matutino fijo",
            "dias_laborales": "Lunes a Sabado",
            "tipo_contrato": "planta",
            "escolaridad_minima": "secundaria",
            "experiencia_minima": "sin experiencia",
            "prestaciones": ["IMSS", "Transporte"],
            "certificaciones": ["Licencia de montacargas"],
            "requisitos_fisicos": ["trabajo de pie"],
        }
        result = _normalize_to_catalog(raw)
        assert result["categoria"] == "Operador de producción / Ensamble"
        assert result["tipo_turno"] == "Fijo matutino"
        assert result["escolaridad_minima"] == "Secundaria"
        assert result["experiencia_minima"] == "Sin experiencia"


# ─── Tests de confianza ──────────────────────────────────────────────

class TestConfidence:
    def test_full_extraction(self):
        data = {
            "titulo": "Montacarguista",
            "empresa_nombre": "Acme",
            "sueldo_semanal_libre": 3000,
            "categoria": "Montacarguista",
            "tipo_turno": "Fijo matutino",
            "dias_laborales": "Lunes a Viernes",
            "tipo_contrato": "Planta (tiempo indeterminado)",
            "escolaridad_minima": "Secundaria",
            "experiencia_minima": "1 año",
            "municipio": "Apodaca",
            "descripcion": "Se busca montacarguista",
            "vacantes_disponibles": 5,
            "prestaciones": ["IMSS"],
            "certificaciones": ["DC-3"],
        }
        contacto = ExtractedContact(telefono="8112345678")
        score, count = _calculate_confidence(data, contacto)
        assert score == 1.0
        assert count == 15

    def test_minimal_extraction(self):
        data = {"titulo": "Operador"}
        contacto = ExtractedContact()
        score, count = _calculate_confidence(data, contacto)
        assert count == 1
        assert score == round(1 / 15, 2)


# ─── Tests de preprocesamiento ────────────────────────────────────────

class TestPreprocess:
    def test_resize_large_image(self):
        b64 = _make_test_image_b64(4000, 3000)
        result_b64, mime = _preprocess_image(b64)
        assert mime == "image/jpeg"
        # Verificar que la imagen resultante es más pequeña
        result_bytes = base64.b64decode(result_b64)
        img = Image.open(io.BytesIO(result_bytes))
        assert max(img.size) <= 1280

    def test_small_image_not_resized(self):
        b64 = _make_test_image_b64(640, 480)
        result_b64, mime = _preprocess_image(b64)
        result_bytes = base64.b64decode(result_b64)
        img = Image.open(io.BytesIO(result_bytes))
        assert img.size[0] == 640
        assert img.size[1] == 480

    def test_strips_data_uri_prefix(self):
        raw = _make_test_image_b64(100, 100)
        b64_with_prefix = f"data:image/jpeg;base64,{raw}"
        result_b64, mime = _preprocess_image(b64_with_prefix)
        assert mime == "image/jpeg"
        # Should not crash
        base64.b64decode(result_b64)


# ─── Tests de endpoint /from-photo (con mock de Gemini) ──────────────

@pytest.fixture
def _mock_gemini():
    """Mock que intercepta la llamada a Gemini y devuelve una respuesta predefinida."""
    from unittest.mock import MagicMock

    response_json = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": json.dumps(MOCK_GEMINI_RESPONSE)
                }]
            }
        }]
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = response_json
    mock_response.text = json.dumps(response_json)

    mock_client_instance = AsyncMock()
    mock_client_instance.post.return_value = mock_response
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.job_vision_service.httpx.AsyncClient", return_value=mock_client_instance):
        with patch("app.services.job_vision_service.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = "test-key-123"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
            mock_settings.GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"
            yield mock_client_instance


@pytest.mark.asyncio
async def test_analyze_job_photo_full_flow(_mock_gemini):
    """Test completo: imagen → Gemini mock → extracción normalizada."""
    from app.services.job_vision_service import analyze_job_photo

    b64 = _make_test_image_b64(800, 600)
    result = await analyze_job_photo(b64, latitud=25.67, longitud=-100.31, municipio="Apodaca")

    assert result.es_oferta_laboral is True
    assert result.titulo == "Operador de producción"
    assert result.empresa_nombre == "Plásticos del Norte S.A."
    assert result.sueldo_semanal_libre == 2800.0
    assert result.categoria == "Operador de producción / Ensamble"
    assert result.tipo_turno == "Fijo matutino"
    assert result.municipio == "Apodaca"
    assert result.contacto.telefono == "8112345678"
    assert result.contacto.whatsapp == "8187654321"
    assert result.contacto.email == "rh@plasticosdelnorte.mx"
    assert result.confianza > 0.5
    assert result.latitud == 25.67
    assert result.longitud == -100.31


@pytest.mark.asyncio
async def test_analyze_not_a_job_photo(_mock_gemini):
    """Test: imagen que no es una oferta laboral."""
    not_job_response = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": json.dumps({
                        "es_oferta_laboral": False,
                        "texto_crudo": "Foto de un paisaje montañoso",
                    })
                }]
            }
        }]
    }
    _mock_gemini.post.return_value.json.return_value = not_job_response

    from app.services.job_vision_service import analyze_job_photo

    b64 = _make_test_image_b64(800, 600)
    result = await analyze_job_photo(b64)

    assert result.es_oferta_laboral is False
    assert result.confianza == 0.0


# ─── Tests de endpoint HTTP (con TestClient) ─────────────────────────

def test_from_photo_endpoint_requires_auth(client):
    """El endpoint /from-photo requiere autenticación JWT."""
    res = client.post("/api/v1/jobs/from-photo", json={"image_base64": "abc"})
    assert res.status_code in (401, 403, 422)


def test_from_photo_confirm_creates_job(client, recruiter_headers):
    """Confirmar una foto crea una vacante comunitaria con origen='foto_comunitaria'."""
    payload = {
        "titulo": "Montacarguista",
        "empresa_nombre": "Bodega Express",
        "sueldo_semanal_libre": 3200,
        "municipio": "Apodaca",
        "latitud": 25.77,
        "longitud": -100.19,
    }
    res = client.post("/api/v1/jobs/from-photo/confirm", json=payload, headers=recruiter_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["titulo"] == "Montacarguista"
    assert data["empresa_nombre"] == "Bodega Express"
    assert data["sueldo_semanal_libre"] == 3200

    # Verificar que aparece en la lista de vacantes
    jobs_res = client.get("/api/v1/jobs")
    assert jobs_res.status_code == 200
    titles = [j["titulo"] for j in jobs_res.json()]
    assert "Montacarguista" in titles
