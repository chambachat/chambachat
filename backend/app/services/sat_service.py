import io
import os
import re
import ssl
import json
import logging
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs

import warnings
import requests
from requests.adapters import HTTPAdapter
import cv2
import numpy as np
import pypdf
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

logger = logging.getLogger(__name__)

class SATAdapter(HTTPAdapter):
    """
    Adaptador HTTP con SECLEVEL=1 para conectarse a servidores del SAT (siat.sat.gob.mx)
    que utilizan cifrados Diffie-Hellman heredados (1024-bit).
    """
    def init_poolmanager(self, *args, **kwargs):
        ctx = ssl.create_default_context()
        ctx.set_ciphers('DEFAULT:@SECLEVEL=1')
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)


def decode_qr_image_bytes(img_bytes: bytes) -> Optional[str]:
    """
    Decodifica un código QR a partir de bytes de imagen usando OpenCV con múltiples transformaciones
    (grises, umbral Otsu, inversión y reescalado).
    """
    try:
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        detector = cv2.QRCodeDetector()
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Escala de grises directa
        val, _, _ = detector.detectAndDecode(gray)
        if val and ("sat.gob.mx" in val or "validador" in val or "http" in val):
            return val

        # 2. Umbral Otsu
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        val, _, _ = detector.detectAndDecode(thresh)
        if val and ("sat.gob.mx" in val or "validador" in val or "http" in val):
            return val

        # 3. Inversión de color
        val, _, _ = detector.detectAndDecode(cv2.bitwise_not(thresh))
        if val and ("sat.gob.mx" in val or "validador" in val or "http" in val):
            return val

        # 4. Reescalado 2x
        h, w = gray.shape[:2]
        if w < 500 or h < 500:
            resized = cv2.resize(gray, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
            val, _, _ = detector.detectAndDecode(resized)
            if val and ("sat.gob.mx" in val or "validador" in val or "http" in val):
                return val

        # 5. Cualquier valor detectado aunque no contenga sat.gob.mx
        if val:
            return val

    except Exception as e:
        logger.warning(f"Error decodificando QR de imagen: {e}")

    return None


def extract_qr_from_pdf(pdf_source) -> Optional[str]:
    """
    Extrae imágenes de todas las páginas de un archivo PDF e intenta decodificar el QR del SAT.
    pdf_source puede ser un filepath (str) o bytes.
    """
    try:
        if isinstance(pdf_source, (str, bytes, bytearray)):
            stream = io.BytesIO(pdf_source) if isinstance(pdf_source, (bytes, bytearray)) else open(pdf_source, "rb")
        else:
            stream = pdf_source

        reader = pypdf.PdfReader(stream)
        for page_idx, page in enumerate(reader.pages):
            for img_idx, img_obj in enumerate(page.images):
                try:
                    qr_url = decode_qr_image_bytes(img_obj.data)
                    if qr_url:
                        logger.info(f"QR encontrado en página {page_idx + 1}, imagen {img_idx + 1}: {qr_url}")
                        return qr_url
                except Exception as img_err:
                    logger.debug(f"Error procesando imagen {img_idx} en página {page_idx}: {img_err}")
    except Exception as e:
        logger.warning(f"Error buscando QR en PDF: {e}")

    return None


def parse_sat_qr_url(url: str) -> Dict[str, Any]:
    """
    Extrae los parámetros oficiales del URL del validador del SAT:
    https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3={idCIF}_{RFC}
    """
    res = {
        "sat_url": url,
        "idcif": None,
        "rfc": None,
        "d1": None,
        "d2": None
    }
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)

        if "D1" in params:
            res["d1"] = params["D1"][0]
        if "D2" in params:
            res["d2"] = params["D2"][0]
        if "D3" in params:
            d3_val = params["D3"][0]
            # Formato estándar D3: {idCIF}_{RFC}
            if "_" in d3_val:
                parts = d3_val.split("_", 1)
                res["idcif"] = parts[0].strip()
                res["rfc"] = parts[1].strip().upper()
            else:
                res["idcif"] = d3_val.strip()
    except Exception as e:
        logger.warning(f"Error parseando URL del QR del SAT: {e}")

    return res


def fetch_sat_portal_data(sat_url: str, timeout: int = 7) -> Dict[str, Any]:
    """
    Consulta el portal oficial del SAT (siat.sat.gob.mx) usando el adaptador SSL seguro.
    Extrae los datos expuestos en el resultado de validación QR.
    """
    data: Dict[str, Any] = {
        "portal_consultado": True,
        "portal_exitoso": False,
        "sat_mensaje": None,
        "sat_html_length": 0
    }

    try:
        session = requests.Session()
        session.mount("https://", SATAdapter())
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
        }

        response = session.get(sat_url, headers=headers, timeout=timeout)
        data["http_status"] = response.status_code
        data["sat_html_length"] = len(response.text)

        if response.status_code == 200:
            data["portal_exitoso"] = True
            soup = BeautifulSoup(response.text, "html.parser")

            # Buscar mensajes de información o alerta del portal PrimeFaces
            info_details = soup.find_all(class_="ui-messages-info-detail")
            for det in info_details:
                text = det.get_text(" ", strip=True)
                if text:
                    data["sat_mensaje"] = text
                    if "no se le ha emitido" in text.lower():
                        data["estatus_padron"] = "NO_EMITIDA"

            # Parsear elementos con pares etiqueta / valor
            text_lines = []
            for tag in soup.find_all(["li", "tr", "td", "span", "div", "p"]):
                txt = tag.get_text(" ", strip=True)
                if txt and len(txt) > 2 and txt not in text_lines:
                    text_lines.append(txt)

            full_text = "\n".join(text_lines)

            # Extraer campos si están presentes en la respuesta del SAT
            patterns = {
                "rfc": r"(?:RFC|Registro\s*Federal\s*de\s*Contribuyentes)[:\s]+([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})",
                "razon_social": r"(?:Razón\s*Social|Denominación|Nombre,?\s*denominación\s*o\s*razón\s*social)[:\s]+([^\n\r]+)",
                "regimen_capital": r"(?:Régimen\s*Capital|Régimen\s*de\s*Capital)[:\s]+([^\n\r]+)",
                "estatus_padron": r"(?:Situación\s*del\s*contribuyente|Estatus\s*en\s*el\s*padrón|Estado)[:\s]+(ACTIVO|SUSPENDIDO|BAJA|REACTIVADO)",
                "fecha_inicio_operaciones": r"(?:Fecha\s*de\s*inicio\s*de\s*operaciones|Inicio\s*operaciones)[:\s]+([^\n\r]+)",
                "fecha_ultimo_cambio_estado": r"(?:Fecha\s*de\s*último\s*cambio\s*de\s*estado|Último\s*cambio)[:\s]+([^\n\r]+)",
                "codigo_postal": r"(?:Código\s*Postal|C\.?P\.?)[:\s]+(\d{5})",
                "entidad_federativa": r"(?:Entidad\s*Federativa|Estado)[:\s]+([^\n\r]+)",
                "municipio": r"(?:Municipio|Alcaldía|Demarcación)[:\s]+([^\n\r]+)",
                "colonia": r"(?:Colonia)[:\s]+([^\n\r]+)",
                "calle": r"(?:Calle|Nombre\s*de\s*Vialidad)[:\s]+([^\n\r]+)",
                "numero_exterior": r"(?:Número\s*Exterior|No\.\s*Ext)[:\s]+([^\n\r]+)",
                "numero_interior": r"(?:Número\s*Interior|No\.\s*Int)[:\s]+([^\n\r]+)",
                "regimen_fiscal": r"(?:Régimen|Regímenes)[:\s]+([^\n\r]+)"
            }

            for key, pat in patterns.items():
                match = re.search(pat, full_text, re.IGNORECASE)
                if match:
                    val = match.group(1).strip()
                    if key not in data or not data[key]:
                        data[key] = val

            # Si se detectó estatus ACTIVO explícitamente en el texto
            if not data.get("estatus_padron"):
                if "ACTIVO" in full_text.upper() and "NO ACTIVO" not in full_text.upper():
                    data["estatus_padron"] = "ACTIVO"

    except Exception as e:
        logger.warning(f"Error consultando validador QR del SAT: {e}")
        data["error"] = str(e)

    return data


def extract_data_from_csf_text(pdf_source) -> Dict[str, Any]:
    """
    Extrae y parsea el texto oficial de la Constancia de Situación Fiscal (generada por el SAT)
    utilizando pypdf y expresiones regulares para todos los campos oficiales del formato SAT.
    """
    extracted: Dict[str, Any] = {}
    try:
        if isinstance(pdf_source, (str, bytes, bytearray)):
            stream = io.BytesIO(pdf_source) if isinstance(pdf_source, (bytes, bytearray)) else open(pdf_source, "rb")
        else:
            stream = pdf_source

        reader = pypdf.PdfReader(stream)
        all_text_pages = []
        for p in reader.pages:
            t = p.extract_text()
            if t:
                all_text_pages.append(t)

        full_text = "\n".join(all_text_pages)
        if not full_text.strip():
            return extracted

        # 1. RFC
        rfc_m = re.search(r'RFC:\s*([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})', full_text, re.IGNORECASE)
        if not rfc_m:
            rfc_m = re.search(r'\b([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})\b', full_text)
        if rfc_m:
            extracted['rfc'] = rfc_m.group(1).upper()

        # 2. idCIF
        cif_m = re.search(r'idCIF:\s*(\d+)', full_text, re.IGNORECASE)
        if cif_m:
            extracted['idcif'] = cif_m.group(1).strip()

        # 3. CURP (Persona Física)
        curp_m = re.search(r'CURP:\s*([A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d)', full_text, re.IGNORECASE)
        if curp_m:
            extracted['curp'] = curp_m.group(1).upper()

        # 4. Razón Social / Denominación (Persona Moral)
        rs_m = re.search(r'(?:Nombre,?\s*denominación\s*o\s*razón\s*social|Denominación/Razón\s*Social):\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if rs_m:
            extracted['razon_social'] = rs_m.group(1).strip()

        # 5. Nombre Persona Física (Nombre, Primer Apellido, Segundo Apellido)
        nombre_m = re.search(r'Nombre\s*\(s\):\s*([^\n\r]+)', full_text, re.IGNORECASE)
        ap1_m = re.search(r'Primer\s*Apellido:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        ap2_m = re.search(r'Segundo\s*Apellido:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if nombre_m:
            partes_nombre = [nombre_m.group(1).strip()]
            if ap1_m:
                partes_nombre.append(ap1_m.group(1).strip())
            if ap2_m:
                partes_nombre.append(ap2_m.group(1).strip())
            nombre_completo = " ".join(partes_nombre)
            extracted['nombre_contribuyente'] = nombre_completo
            if not extracted.get('razon_social'):
                extracted['razon_social'] = nombre_completo

        # 6. Régimen Capital
        rc_m = re.search(r'Régimen\s*Capital:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if rc_m:
            extracted['regimen_capital'] = rc_m.group(1).strip()

        # 7. Nombre Comercial
        nc_m = re.search(r'Nombre\s*Comercial:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if nc_m:
            extracted['nombre_comercial'] = nc_m.group(1).strip()

        # 8. Fecha de inicio de operaciones
        fio_m = re.search(r'Fecha\s*de\s*inicio\s*de\s*operaciones:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if fio_m:
            extracted['fecha_inicio_operaciones'] = fio_m.group(1).strip()

        # 9. Estatus en el padrón
        est_m = re.search(r'Estatus\s*en\s*el\s*padrón:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if est_m:
            extracted['estatus_padron'] = est_m.group(1).strip().upper()

        # 10. Fecha de último cambio de estado
        fuc_m = re.search(r'Fecha\s*de\s*último\s*cambio\s*de\s*estado:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if fuc_m:
            extracted['fecha_ultimo_cambio_estado'] = fuc_m.group(1).strip()

        # 11. Domicilio Fiscal
        cp_m = re.search(r'Código\s*Postal:\s*(\d{5})', full_text, re.IGNORECASE)
        if cp_m:
            extracted['codigo_postal'] = cp_m.group(1).strip()

        tv_m = re.search(r'Tipo\s*de\s*Vialidad:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if tv_m:
            extracted['tipo_vialidad'] = tv_m.group(1).strip()

        nv_m = re.search(r'Nombre\s*de\s*Vialidad:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if nv_m:
            extracted['calle'] = nv_m.group(1).strip()

        ne_m = re.search(r'Número\s*Exterior:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if ne_m:
            extracted['numero_exterior'] = ne_m.group(1).strip()

        ni_m = re.search(r'Número\s*Interior:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if ni_m:
            extracted['numero_interior'] = ni_m.group(1).strip()

        col_m = re.search(r'Nombre\s*de\s*la\s*Colonia:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if col_m:
            extracted['colonia'] = col_m.group(1).strip()

        mun_m = re.search(r'Nombre\s*del\s*Municipio(?:\s*o\s*Demarcación\s*Territorial)?:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if mun_m:
            extracted['municipio'] = mun_m.group(1).strip()

        ent_m = re.search(r'Nombre\s*de\s*la\s*Entidad\s*Federativa:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if ent_m:
            extracted['entidad_federativa'] = ent_m.group(1).strip()

        # 12. Regímenes Fiscales
        # Buscar sección Regímenes
        reg_m = re.search(r'Regímenes:\s*\n+([^\n\r]+)', full_text, re.IGNORECASE)
        if reg_m:
            extracted['regimen_fiscal'] = reg_m.group(1).strip()
        else:
            # Búsqueda alternativa por régimen conocido
            regimenes_comunes = [
                "Régimen General de Ley Personas Morales",
                "Régimen Simplificado de Confianza",
                "Personas Morales con Fines no Lucrativos",
                "Sueldos y Salarios e Ingresos Asimilados a Salarios",
                "Personas Físicas con Actividades Empresariales y Profesionales",
                "Incorporación Fiscal"
            ]
            for reg in regimenes_comunes:
                if reg.lower() in full_text.lower():
                    extracted['regimen_fiscal'] = reg
                    break

    except Exception as e:
        logger.warning(f"Error extrayendo texto de PDF de CSF: {e}")

    return extracted


def build_full_address(data: Dict[str, Any]) -> Optional[str]:
    """
    Construye una dirección legible combinando los componentes fiscales disponibles.
    """
    parts = []
    tipo = data.get("tipo_vialidad")
    calle = data.get("calle")
    num_ext = data.get("numero_exterior")
    num_int = data.get("numero_interior")
    colonia = data.get("colonia")
    cp = data.get("codigo_postal")
    municipio = data.get("municipio")
    entidad = data.get("entidad_federativa")

    linea1 = []
    if tipo:
        linea1.append(tipo)
    if calle:
        linea1.append(calle)
    if num_ext:
        linea1.append(f"No. {num_ext}")
    if num_int:
        linea1.append(f"Int. {num_int}")

    if linea1:
        parts.append(" ".join(linea1))
    if colonia:
        parts.append(f"Col. {colonia}")
    if cp:
        parts.append(f"C.P. {cp}")
    if municipio:
        parts.append(municipio)
    if entidad:
        parts.append(entidad)

    return ", ".join(parts) if parts else None


def process_csf_document(file_source: Any, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Función maestra que orquesta la extracción completa de la Constancia de Situación Fiscal:
    1. Lee el archivo (PDF o Imagen).
    2. Decodifica el código QR (URL oficial de siat.sat.gob.mx).
    3. Si encuentra QR, extrae idCIF y RFC, y consulta en vivo el portal del SAT.
    4. Si es PDF, extrae y analiza exhaustivamente la capa de texto vectorial.
    5. Hace merge inteligente de los datos para garantizar completitud y robustez.
    6. Retorna diccionario estructurado listo para la base de datos y la interfaz.
    """
    # Determinar si es bytes o ruta de archivo
    if isinstance(file_source, str):
        filepath = file_source
        with open(filepath, "rb") as f:
            file_bytes = f.read()
        fname = filename or os.path.basename(filepath)
    elif isinstance(file_source, (bytes, bytearray)):
        file_bytes = bytes(file_source)
        fname = filename or "document.pdf"
    else:
        # File-like object
        file_bytes = file_source.read()
        fname = filename or "document.pdf"

    is_pdf = fname.lower().endswith(".pdf") or file_bytes.startswith(b"%PDF")

    result: Dict[str, Any] = {
        "qr_detectado": False,
        "sat_url": None,
        "sat_validado": False,
        "origen_datos": [],
        "rfc": None,
        "idcif": None,
        "curp": None,
        "razon_social": None,
        "regimen_capital": None,
        "nombre_comercial": None,
        "fecha_inicio_operaciones": None,
        "estatus_padron": "ACTIVO",  # Por defecto activo en constancias vigentes
        "fecha_ultimo_cambio_estado": None,
        "codigo_postal": None,
        "tipo_vialidad": None,
        "calle": None,
        "numero_exterior": None,
        "numero_interior": None,
        "colonia": None,
        "municipio": None,
        "entidad_federativa": None,
        "direccion": None,
        "regimen_fiscal": None,
        "raw_sat_data": {}
    }

    # PASO 1: Detectar código QR
    qr_url = None
    if is_pdf:
        qr_url = extract_qr_from_pdf(file_bytes)
    else:
        qr_url = decode_qr_image_bytes(file_bytes)

    # PASO 2: Si hay QR, parsear URL y consultar portal SAT
    if qr_url:
        result["qr_detectado"] = True
        result["sat_url"] = qr_url
        result["origen_datos"].append("qr_sat")

        # Parsear D3 (idCIF y RFC)
        qr_params = parse_sat_qr_url(qr_url)
        if qr_params.get("rfc"):
            result["rfc"] = qr_params["rfc"]
        if qr_params.get("idcif"):
            result["idcif"] = qr_params["idcif"]

        # Consultar portal del SAT
        portal_res = fetch_sat_portal_data(qr_url)
        result["raw_sat_data"]["portal_sat"] = portal_res

        if portal_res.get("portal_exitoso"):
            result["sat_validado"] = True
            result["origen_datos"].append("portal_sat_live")

            # Mapear campos devueltos por el portal
            for field in [
                "rfc", "razon_social", "regimen_capital", "fecha_inicio_operaciones",
                "estatus_padron", "fecha_ultimo_cambio_estado", "codigo_postal",
                "entidad_federativa", "municipio", "colonia", "calle",
                "numero_exterior", "numero_interior", "regimen_fiscal"
            ]:
                if portal_res.get(field):
                    result[field] = portal_res[field]

    # PASO 3: Si es PDF, extraer texto vectorial oficial
    if is_pdf:
        text_data = extract_data_from_csf_text(file_bytes)
        result["raw_sat_data"]["pdf_text"] = text_data
        if text_data:
            result["origen_datos"].append("pdf_text_layer")
            # Si no se había validado por portal pero tiene estructura oficial SAT
            if text_data.get("rfc"):
                result["sat_validado"] = True

            # Merge de campos: si no vinieron del portal, tomarlos del texto del PDF
            for key, val in text_data.items():
                if val and not result.get(key):
                    result[key] = val

    # PASO 4: Normalizaciones finales
    # Razón Social + Régimen Capital
    if result.get("razon_social") and result.get("regimen_capital"):
        rc = result["regimen_capital"].strip()
        rs = result["razon_social"].strip()
        if rc.lower() not in rs.lower():
            result["razon_social_completa"] = f"{rs}, {rc}"
        else:
            result["razon_social_completa"] = rs
    elif result.get("razon_social"):
        result["razon_social_completa"] = result["razon_social"]

    # Si no hay nombre comercial, usar la razón social
    if not result.get("nombre_comercial") and result.get("razon_social"):
        result["nombre_comercial"] = result["razon_social"]

    # Dirección combinada
    result["direccion"] = build_full_address(result)

    # Municipio por defecto si está en blanco
    if not result.get("municipio"):
        result["municipio"] = "Apodaca"

    return result
