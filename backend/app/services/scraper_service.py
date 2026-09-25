import httpx
from bs4 import BeautifulSoup
import re
import asyncio
from typing import Dict, Any, Optional

from app.config import settings

def _clean_text(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    # Remove script and style elements
    for script in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        script.extract()
    
    text = soup.get_text(separator="\n")
    # Clean up whitespace
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    text = "\n".join(chunk for chunk in chunks if chunk)
    return text

async def scrape_and_analyze_url(url: str) -> Optional[Dict[str, Any]]:
    """Descarga una URL, limpia el texto y usa Gemini para extraer la vacante si tiene contacto."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            text = _clean_text(response.text)
            
            # Limitar a primeros 15,000 caracteres para no exceder contexto
            text = text[:15000]
            
            if not settings.GEMINI_API_KEY:
                raise ValueError("No GEMINI_API_KEY")
                
            prompt = f"""
            Analiza el siguiente texto extraído de una página web de una vacante laboral.
            Busca información de contacto (teléfono, celular, WhatsApp o correo electrónico) para aplicar.
            Si NO encuentras ningún dato de contacto directo (teléfono o correo), responde con un JSON vacío: {{}}
            
            Si SÍ encuentras contacto, extrae los detalles del puesto.
            Responde ÚNICAMENTE con un JSON válido usando esta estructura:
            {{
                "puesto": "Nombre del puesto (ej. Ayudante General)",
                "sueldo_semanal_libre": numero o null,
                "turnos_fijos": true o false,
                "descripcion": "Breve resumen",
                "fuente_contacto_telefono": "numero a 10 digitos o null",
                "fuente_contacto_email": "email o null",
                "fuente_contacto_whatsapp": "numero a 10 digitos o null"
            }}
            
            TEXTO DE LA VACANTE:
            {text}
            """
            
            gemini_url = f"{settings.GEMINI_API_URL}/models/{settings.GEMINI_MODEL}:generateContent"
            params = {"key": settings.GEMINI_API_KEY}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }
            
            gemini_res = await client.post(gemini_url, params=params, json=payload, timeout=30.0)
            gemini_res.raise_for_status()
            
            data = gemini_res.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Gemini no retornó candidatos")
                
            json_text = candidates[0]["content"]["parts"][0]["text"]
            import json
            result = json.loads(json_text)
            
            if not result or not any([result.get("fuente_contacto_telefono"), result.get("fuente_contacto_email"), result.get("fuente_contacto_whatsapp")]):
                return None
                
            return {
                "puesto": result.get("puesto") or "Vacante Operativa",
                "sueldo_semanal_libre": result.get("sueldo_semanal_libre"),
                "turnos_fijos": bool(result.get("turnos_fijos")),
                "descripcion": result.get("descripcion", ""),
                "fuente_contacto_telefono": result.get("fuente_contacto_telefono"),
                "fuente_contacto_email": result.get("fuente_contacto_email"),
                "fuente_contacto_whatsapp": result.get("fuente_contacto_whatsapp"),
                "texto_ocr": text[:1000],
                "origen": "scraping",
                "foto_original_url": url,
                "municipio": "Monterrey",
            }
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None
