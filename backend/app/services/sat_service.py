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
    - CSF: https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3={idCIF}_{RFC}
    - 32-D: https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=1&D2=1&D3={Folio}_{RFC}_{Fecha}_{Sentido}
    """
    res = {
        "sat_url": url,
        "idcif": None,
        "folio": None,
        "rfc": None,
        "d1": None,
        "d2": None,
        "tipo_documento": "constancia_fiscal",
        "tipo_documento_label": "Constancia de Situación Fiscal",
        "sentido_opinion": None
    }
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)

        if "D1" in params:
            res["d1"] = params["D1"][0]
            if res["d1"] == "1":
                res["tipo_documento"] = "opinion_32d"
                res["tipo_documento_label"] = "Opinión del Cumplimiento 32-D"
            elif res["d1"] == "10":
                res["tipo_documento"] = "constancia_fiscal"
                res["tipo_documento_label"] = "Constancia de Situación Fiscal"

        if "D2" in params:
            res["d2"] = params["D2"][0]

        if "D3" in params:
            d3_val = params["D3"][0]
            parts = [p.strip() for p in d3_val.split("_") if p.strip()]
            if parts:
                if res["tipo_documento"] == "opinion_32d":
                    res["folio"] = parts[0]
                else:
                    res["idcif"] = parts[0]

            # Buscar token con formato exacto de RFC
            rfc_regex = re.compile(r"^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$")
            for p in parts:
                p_up = p.upper()
                if rfc_regex.match(p_up):
                    res["rfc"] = p_up
                    break

            # En 32-D, el último parámetro suele indicar el sentido (P = Positivo, N = Negativo)
            if res["tipo_documento"] == "opinion_32d" and len(parts) >= 4:
                last_token = parts[-1].upper()
                if last_token in ["P", "POSITIVO"]:
                    res["sentido_opinion"] = "POSITIVO"
                elif last_token in ["N", "NEGATIVO"]:
                    res["sentido_opinion"] = "NEGATIVO"

    except Exception as e:
        logger.warning(f"Error parseando URL del QR del SAT: {e}")

    return res


def fetch_sat_portal_data(sat_url: str, timeout: int = 7) -> Dict[str, Any]:
    """
    Consulta el portal oficial del SAT (siat.sat.gob.mx) usando el adaptador SSL seguro.
    Extrae los datos expuestos en el resultado de validación QR usando pares estructurados
    de tablas PrimeFaces y fallback de texto limpio.
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

            # 1. Extraer pares clave-valor estructurados de tablas HTML (td / th)
            kv_pairs = {}
            for tr in soup.find_all("tr"):
                tds = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
                if len(tds) == 2:
                    k = tds[0].rstrip(":").strip().lower()
                    v = tds[1].strip()
                    if k and v:
                        kv_pairs[k] = v

            # Mapeo limpio de etiquetas SAT a propiedades
            field_mapping = {
                "rfc": "rfc",
                "curp": "curp",
                "nombre": "nombre",
                "apellido paterno": "apellido_paterno",
                "apellido materno": "apellido_materno",
                "razón social": "razon_social",
                "denominación": "razon_social",
                "denominación o razón social": "razon_social",
                "nombre, denominación o razón social": "razon_social",
                "régimen capital": "regimen_capital",
                "situación del contribuyente": "estatus_padron",
                "estatus en el padrón": "estatus_padron",
                "fecha de inicio de operaciones": "fecha_inicio_operaciones",
                "fecha del último cambio de situación": "fecha_ultimo_cambio_estado",
                "fecha de último cambio de estado": "fecha_ultimo_cambio_estado",
                "entidad federativa": "entidad_federativa",
                "municipio o delegación": "municipio",
                "municipio": "municipio",
                "colonia": "colonia",
                "nombre de la vialidad": "calle",
                "tipo de vialidad": "tipo_vialidad",
                "número exterior": "numero_exterior",
                "número interior": "numero_interior",
                "cp": "codigo_postal",
                "código postal": "codigo_postal",
                "régimen": "regimen_fiscal",
                "sentido": "sentido_opinion",
                "folio": "folio"
            }

            for k, v in kv_pairs.items():
                target_key = field_mapping.get(k)
                if target_key and v and target_key not in data:
                    data[target_key] = v

            # Si es Persona Física con nombre + apellidos
            if data.get("nombre") and data.get("apellido_paterno"):
                partes = [data["nombre"], data["apellido_paterno"]]
                if data.get("apellido_materno"):
                    partes.append(data["apellido_materno"])
                nombre_pf = " ".join(partes)
                data["nombre_contribuyente"] = nombre_pf
                if not data.get("razon_social"):
                    data["razon_social"] = nombre_pf

            # Si se obtuvo sentido de opinión (32-D)
            if data.get("sentido_opinion"):
                data["sentido_opinion"] = data["sentido_opinion"].upper()

            # Si se detectó estatus ACTIVO explícitamente en el texto
            if not data.get("estatus_padron"):
                raw_upper = soup.get_text().upper()
                if "ACTIVO" in raw_upper and "NO ACTIVO" not in raw_upper:
                    data["estatus_padron"] = "ACTIVO"

    except Exception as e:
        logger.warning(f"Error consultando validador QR del SAT: {e}")
        data["error"] = str(e)

    return data


def clean_field_value(val: Optional[str]) -> Optional[str]:
    """Limpia espacios en blanco repetidos y puntuación marginal de un campo extraído."""
    if not val:
        return None
    val = re.sub(r"[\s\n\r]+", " ", str(val)).strip(" :;,-")
    return val if val else None


def extract_data_from_csf_text(pdf_source) -> Dict[str, Any]:
    """
    Extrae y parsea el texto oficial de la Constancia de Situación Fiscal o de la Opinión 32-D
    utilizando pypdf y expresiones regulares de alta precisión con stop-lookaheads.
    """
    extracted: Dict[str, Any] = {
        "tipo_documento": "constancia_fiscal",
        "tipo_documento_label": "Constancia de Situación Fiscal"
    }
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

        lower_text = full_text.lower()

        # 0. Detección del tipo de documento
        if "opinión del cumplimiento" in lower_text or "32-d" in lower_text:
            extracted["tipo_documento"] = "opinion_32d"
            extracted["tipo_documento_label"] = "Opinión del Cumplimiento 32-D"
            if "sentido positivo" in lower_text or "sentido: positivo" in lower_text:
                extracted["sentido_opinion"] = "POSITIVO"
            elif "sentido negativo" in lower_text or "sentido: negativo" in lower_text:
                extracted["sentido_opinion"] = "NEGATIVO"

        # 1. RFC
        # 1a. Cadena Original: ||RFC|...||
        cadena_m = re.search(r'\|\|([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})\|', full_text)
        if cadena_m:
            extracted["rfc"] = cadena_m.group(1).upper()

        if not extracted.get("rfc"):
            # 1b. Clave R.F.C. o RFC:
            rfc_m = re.search(r'(?:Clave\s*R\.?F\.?C\.?|RFC)[:\s]*\n*([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})', full_text, re.IGNORECASE)
            if rfc_m:
                extracted["rfc"] = rfc_m.group(1).upper()

        if not extracted.get("rfc"):
            # 1c. Cualquier token RFC válido en el texto
            rfc_any = re.search(r'\b([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})\b', full_text)
            if rfc_any:
                extracted["rfc"] = rfc_any.group(1).upper()

        # 2. idCIF y Folio
        cif_m = re.search(r'idCIF:\s*(\d+)', full_text, re.IGNORECASE)
        if cif_m:
            extracted["idcif"] = cif_m.group(1).strip()

        folio_m = re.search(r'Folio[:\s]*\n*([A-Z0-9]{10,20})', full_text, re.IGNORECASE)
        if folio_m:
            extracted["folio"] = folio_m.group(1).strip()

        # 3. CURP (Persona Física)
        curp_m = re.search(r'CURP:\s*([A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d)', full_text, re.IGNORECASE)
        if curp_m:
            extracted["curp"] = curp_m.group(1).upper()

        # 4. Razón Social / Denominación / Nombre
        rs = None

        # 4a. Encabezado 'Nombre, Denominación o Razón social' (usado en 32-D y CSFs)
        m_rs = re.search(
            r'(?:Nombre,?\s*Denominaci[oó]n\s*o\s*Raz[oó]n\s*social|Denominaci[oó]n/Raz[oó]n\s*Social)[:\s]*\n+([^\n\r]+)',
            full_text,
            re.IGNORECASE
        )
        if m_rs:
            cand = m_rs.group(1).strip()
            bad_headers = ['IDCIF', 'VALIDA TU INFORMACI', 'DATOS DEL DOMICILIO', 'ESTIMADO CONTRIBUYENTE', 'RESPUESTA DE OPINI']
            if not any(bad in cand.upper() for bad in bad_headers):
                rs = cand

        # 4b. Persona Física en CSF: Nombre(s), Primer Apellido, Segundo Apellido
        nom_m = re.search(r'Nombre\s*\(s\)[:\s]*([^\n\r]+)', full_text, re.IGNORECASE)
        ap1_m = re.search(r'Primer\s*Apellido[:\s]*([^\n\r]+)', full_text, re.IGNORECASE)
        ap2_m = re.search(r'Segundo\s*Apellido[:\s]*([^\n\r]+)', full_text, re.IGNORECASE)
        if nom_m:
            partes_nombre = [nom_m.group(1).strip()]
            if ap1_m:
                partes_nombre.append(ap1_m.group(1).strip())
            if ap2_m:
                partes_nombre.append(ap2_m.group(1).strip())
            nombre_completo = " ".join(partes_nombre)
            extracted["nombre_contribuyente"] = nombre_completo
            if not rs:
                rs = nombre_completo

        # 4c. Cédula CIF en primera página de CSF
        if not rs:
            m_cif = re.search(r'Registro Federal de Contribuyentes\s*\n+([^\n\r]+)\s*\n+Nombre,?\s*denominaci[oó]n', full_text, re.IGNORECASE)
            if m_cif:
                rs = m_cif.group(1).strip()

        if rs:
            extracted["razon_social"] = clean_field_value(rs)

        # 5. Régimen Capital
        rc_m = re.search(r'R[eé]gimen\s*Capital:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if rc_m:
            cand_rc = clean_field_value(rc_m.group(1))
            if cand_rc and not any(bad in cand_rc.upper() for bad in ['NOMBRE COMERCIAL', 'DATOS DEL DOMICILIO']):
                extracted["regimen_capital"] = cand_rc

        # 6. Nombre Comercial
        nc_m = re.search(r'Nombre\s*Comercial:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if nc_m:
            cand_nc = clean_field_value(nc_m.group(1))
            if cand_nc and not any(bad in cand_nc.upper() for bad in ['DATOS DEL DOMICILIO', 'CÓDIGO POSTAL']):
                extracted["nombre_comercial"] = cand_nc

        # 7. Fechas y Estatus
        fio_m = re.search(r'Fecha\s*de\s*inicio\s*de\s*operaciones:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if fio_m:
            extracted["fecha_inicio_operaciones"] = clean_field_value(fio_m.group(1))

        est_m = re.search(r'Estatus\s*en\s*el\s*padr[oó]n:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if est_m:
            cand_est = clean_field_value(est_m.group(1))
            if cand_est and not any(bad in cand_est.upper() for bad in ['FECHA DE', 'NOMBRE COMERCIAL']):
                extracted["estatus_padron"] = cand_est.upper()

        fuc_m = re.search(r'Fecha\s*de\s*último\s*cambio\s*de\s*estado:\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if fuc_m:
            extracted["fecha_ultimo_cambio_estado"] = clean_field_value(fuc_m.group(1))

        # 8. Domicilio Fiscal (Solo aplica en CSF; la Opinión 32-D no incluye domicilio del contribuyente)
        if extracted["tipo_documento"] != "opinion_32d":
            cp_m = re.search(r'C[oó]digo\s*Postal[:\s]*(\d{5})', full_text, re.IGNORECASE)
            if cp_m:
                extracted["codigo_postal"] = cp_m.group(1).strip()

            tv_m = re.search(
                r'Tipo\s*de\s*Vialidad[:\s]*(.*?)(?=\s*(?:Nombre\s*de\s*Vialidad|Nombre\s*de\s*la\s*Vialidad|Calle|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if tv_m:
                extracted["tipo_vialidad"] = clean_field_value(tv_m.group(1))

            nv_m = re.search(
                r'Nombre\s*de\s*(?:la\s*)?Vialidad[:\s]*(.*?)(?=\s*(?:N[uú]mero\s*Exterior|No\.\s*Ext|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if nv_m:
                extracted["calle"] = clean_field_value(nv_m.group(1))

            ne_m = re.search(
                r'N[uú]mero\s*Exterior[:\s]*(.*?)(?=\s*(?:N[uú]mero\s*Interior|No\.\s*Int|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if ne_m:
                extracted["numero_exterior"] = clean_field_value(ne_m.group(1))

            ni_m = re.search(
                r'N[uú]mero\s*Interior[:\s]*(.*?)(?=\s*(?:Nombre\s*de\s*la\s*Colonia|Colonia|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if ni_m:
                extracted["numero_interior"] = clean_field_value(ni_m.group(1))

            col_m = re.search(
                r'Nombre\s*de\s*la\s*Colonia[:\s]*(.*?)(?=\s*(?:Nombre\s*de\s*la\s*Localidad|Localidad|Municipio|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if col_m:
                extracted["colonia"] = clean_field_value(col_m.group(1))

            mun_m = re.search(
                r'(?:Nombre\s*del\s*)?Municipio(?:\s*o\s*Demarcaci[oó]n\s*Territorial)?[:\s]*(.*?)(?=\s*(?:Nombre\s*de\s*la\s*Entidad|Entidad|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if mun_m:
                extracted["municipio"] = clean_field_value(mun_m.group(1))

            ent_m = re.search(
                r'(?:Nombre\s*de\s*la\s*)?Entidad\s*Federativa[:\s]*(.*?)(?=\s*(?:Entre\s*Calle|Y\s*Calle|\n|$))',
                full_text,
                re.IGNORECASE
            )
            if ent_m:
                extracted["entidad_federativa"] = clean_field_value(ent_m.group(1))

        # 9. Regímenes Fiscales
        regimenes_comunes = [
            "Régimen General de Ley Personas Morales",
            "Régimen Simplificado de Confianza",
            "Personas Morales con Fines no Lucrativos",
            "Régimen de las Personas Físicas con Actividades Empresariales y Profesionales",
            "Personas Físicas con Actividades Empresariales y Profesionales",
            "Régimen de Sueldos y Salarios e Ingresos Asimilados a Salarios",
            "Sueldos y Salarios e Ingresos Asimilados a Salarios",
            "Incorporación Fiscal"
        ]
        for reg in regimenes_comunes:
            if reg.lower() in lower_text:
                extracted["regimen_fiscal"] = reg
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
    if tipo and tipo.lower() not in (calle or "").lower():
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
    Función maestra que orquesta la extracción completa de la Constancia Fiscal o de la Opinión 32-D:
    1. Lee el archivo (PDF o Imagen).
    2. Decodifica el código QR oficial del SAT (siat.sat.gob.mx).
    3. Si encuentra QR, extrae folio/idCIF y RFC, y consulta en vivo el portal del SAT.
    4. Si es PDF, extrae y analiza exhaustivamente la capa de texto vectorial.
    5. Hace merge inteligente de los datos para garantizar completitud, fidelidad y robustez.
    6. Retorna diccionario estructurado listo para la base de datos y la interfaz.
    """
    if isinstance(file_source, str):
        filepath = file_source
        with open(filepath, "rb") as f:
            file_bytes = f.read()
        fname = filename or os.path.basename(filepath)
    elif isinstance(file_source, (bytes, bytearray)):
        file_bytes = bytes(file_source)
        fname = filename or "document.pdf"
    else:
        file_bytes = file_source.read()
        fname = filename or "document.pdf"

    is_pdf = fname.lower().endswith(".pdf") or file_bytes.startswith(b"%PDF")

    result: Dict[str, Any] = {
        "qr_detectado": False,
        "sat_url": None,
        "sat_validado": False,
        "tipo_documento": "constancia_fiscal",
        "tipo_documento_label": "Constancia de Situación Fiscal",
        "sentido_opinion": None,
        "origen_datos": [],
        "rfc": None,
        "idcif": None,
        "folio": None,
        "curp": None,
        "razon_social": None,
        "regimen_capital": None,
        "nombre_comercial": None,
        "fecha_inicio_operaciones": None,
        "estatus_padron": "ACTIVO",
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

        qr_params = parse_sat_qr_url(qr_url)
        if qr_params.get("tipo_documento"):
            result["tipo_documento"] = qr_params["tipo_documento"]
            result["tipo_documento_label"] = qr_params["tipo_documento_label"]
        if qr_params.get("rfc"):
            result["rfc"] = qr_params["rfc"]
        if qr_params.get("idcif"):
            result["idcif"] = qr_params["idcif"]
        if qr_params.get("folio"):
            result["folio"] = qr_params["folio"]
        if qr_params.get("sentido_opinion"):
            result["sentido_opinion"] = qr_params["sentido_opinion"]

        # Consultar portal del SAT en vivo
        portal_res = fetch_sat_portal_data(qr_url)
        result["raw_sat_data"]["portal_sat"] = portal_res

        if portal_res.get("portal_exitoso"):
            result["sat_validado"] = True
            result["origen_datos"].append("portal_sat_live")

            # Mapear campos limpios devueltos por el portal
            for field in [
                "rfc", "razon_social", "regimen_capital", "fecha_inicio_operaciones",
                "estatus_padron", "fecha_ultimo_cambio_estado", "codigo_postal",
                "entidad_federativa", "municipio", "colonia", "calle",
                "numero_exterior", "numero_interior", "regimen_fiscal",
                "sentido_opinion", "curp", "folio"
            ]:
                if portal_res.get(field):
                    result[field] = portal_res[field]

    # PASO 3: Si es PDF, extraer texto vectorial oficial
    if is_pdf:
        text_data = extract_data_from_csf_text(file_bytes)
        result["raw_sat_data"]["pdf_text"] = text_data
        if text_data:
            result["origen_datos"].append("pdf_text_layer")

            # Si el tipo se detectó del texto y no del QR
            if text_data.get("tipo_documento"):
                result["tipo_documento"] = text_data["tipo_documento"]
                result["tipo_documento_label"] = text_data["tipo_documento_label"]

            # Si no se había validado por portal pero tiene estructura oficial SAT
            if text_data.get("rfc"):
                result["sat_validado"] = True

            # Merge de campos: si no vinieron del portal, tomarlos del texto del PDF
            for key, val in text_data.items():
                if val and (not result.get(key) or str(result.get(key)).strip() == ""):
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

    # Construir dirección física combinada
    result["direccion"] = build_full_address(result)

    # En opiniones 32-D, la dirección fiscal no está impresa por el SAT
    result["requiere_direccion_manual"] = (result["tipo_documento"] == "opinion_32d" and not result.get("direccion"))

    return result

