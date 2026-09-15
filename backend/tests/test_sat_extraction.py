import os
import io
import sys
import json
import qrcode
from PIL import Image
import pypdf

# Ensure backend path is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.services.sat_service import process_csf_document, parse_sat_qr_url, decode_qr_image_bytes
from app.database import SessionLocal
from app.models import User

client = TestClient(app)


def _get_sat_test_auth_header():
    """Genera JWT de prueba para el test de SAT."""
    import jwt as pyjwt
    from datetime import datetime, timedelta
    from app.config import settings

    db = SessionLocal()
    try:
        email = "sat_test@chambachat.com"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(nombre="SAT Tester", email=email, role="admin", municipio="Monterrey", activo=True)
            db.add(user)
            db.commit()
            db.refresh(user)
        token = pyjwt.encode(
            {"user_id": user.id, "email": user.email, "role": "admin", "nombre": user.nombre,
             "iat": datetime.utcnow(), "exp": datetime.utcnow() + timedelta(hours=1)},
            settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM,
        )
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


SAT_AUTH = _get_sat_test_auth_header()

def create_sample_sat_csf_pdf():
    """
    Crea un PDF en memoria simulando una Constancia de Situación Fiscal oficial del SAT:
    - Incluye código QR con URL oficial del SAT.
    """
    sat_url = "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=18060383187_CME830831LJ2"
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(sat_url)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    pdf_buffer = io.BytesIO()
    qr_img.save(pdf_buffer, format="PDF")
    pdf_bytes = pdf_buffer.getvalue()

    return pdf_bytes, None, sat_url


def test_sat_qr_url_parser():
    sat_url = "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=18060383187_BBA830831LJ2"
    parsed = parse_sat_qr_url(sat_url)
    assert parsed["rfc"] == "BBA830831LJ2"
    assert parsed["idcif"] == "18060383187"
    assert parsed["d1"] == "10"
    assert parsed["d2"] == "1"
    assert parsed["tipo_documento"] == "constancia_fiscal"


def test_sat_qr_url_opinion_32d():
    url_32d = "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=1&D2=1&D3=23NB9010752_VALR8310091Y6_08-06-2023_P"
    parsed = parse_sat_qr_url(url_32d)
    assert parsed["rfc"] == "VALR8310091Y6"
    assert parsed["folio"] == "23NB9010752"
    assert parsed["tipo_documento"] == "opinion_32d"
    assert parsed["sentido_opinion"] == "POSITIVO"


def test_extract_real_documents_if_available():
    f1 = r"C:\Users\RogelioValdez\Downloads\Constancia Situacion fiscal.pdf"
    f2 = r"C:\Users\RogelioValdez\Downloads\reporteOpinion32DContribuyente080623 (2).pdf"

    if os.path.exists(f1):
        res1 = process_csf_document(f1)
        assert res1["rfc"] == "VALR8310091Y6"
        assert res1["razon_social"] == "ROGELIO VALDEZ LEAL"
        assert res1["municipio"] == "SANTIAGO"
        assert "FALCON" in (res1["direccion"] or "")
        assert "PESCADORES" in (res1["direccion"] or "")
        assert res1["codigo_postal"] == "67320"
        assert res1["tipo_documento"] == "constancia_fiscal"

    if os.path.exists(f2):
        res2 = process_csf_document(f2)
        assert res2["rfc"] == "VALR8310091Y6"
        assert res2["razon_social"] == "ROGELIO VALDEZ LEAL"
        assert res2["tipo_documento"] == "opinion_32d"
        assert res2["sentido_opinion"] == "POSITIVO"
        assert res2["requiere_direccion_manual"] is True



def test_qr_image_decoding():
    sat_url = "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=999888777_TEST900101XYZ"
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data(sat_url)
    img = qr.make_image().convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    
    decoded = decode_qr_image_bytes(buf.getvalue())
    assert decoded == sat_url


def test_process_csf_document_qr_direct():
    sat_url = "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=18060383187_CME830831LJ2"
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(sat_url)
    img = qr.make_image().convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    res = process_csf_document(buf.getvalue(), filename="constancia_sat.png")
    assert res["qr_detectado"] is True
    assert res["rfc"] == "CME830831LJ2"
    assert res["idcif"] == "18060383187"
    assert res["sat_validado"] is True


def test_api_upload_csf_and_create_company():
    # 1. Crear PDF con QR
    pdf_bytes, _, _ = create_sample_sat_csf_pdf()

    # 2. Subir vía API
    files = {
        "file": ("constancia_fiscal_test.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }
    response = client.post("/api/v1/companies/upload-csf", files=files, headers=SAT_AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "sat_data" in data
    assert data["sat_data"]["rfc"] == "CME830831LJ2"
    assert data["sat_data"]["idcif"] == "18060383187"

    # 3. Crear empresa con los datos oficiales extraídos del SAT
    comp_payload = {
        "nombre": "Carrier México S. de R.L. de C.V.",
        "municipio": "Apodaca",
        "industria": "Climatización y Manufactura",
        "rfc": data["sat_data"]["rfc"],
        "idcif": data["sat_data"]["idcif"],
        "razon_social": "CARRIER MEXICO",
        "regimen_capital": "SOCIEDAD DE RESPONSABILIDAD LIMITADA DE CAPITAL VARIABLE",
        "codigo_postal": "66600",
        "entidad_federativa": "NUEVO LEON",
        "colonia": "PARQUE INDUSTRIAL APODACA",
        "calle": "AV. MIGUEL ALEMAN",
        "numero_exterior": "500",
        "constancia_fiscal_url": data["file_url"],
        "sat_url_validacion": data["sat_data"]["sat_url"],
        "sat_validado": True,
        "creator_email": "sat_test@chambachat.com",
        "creator_name": "SAT Tester"
    }

    create_res = client.post("/api/v1/companies", json=comp_payload, headers=SAT_AUTH)
    assert create_res.status_code == 200
    comp_data = create_res.json()["company"]
    assert comp_data["rfc"] == "CME830831LJ2"
    assert comp_data["idcif"] == "18060383187"
    assert comp_data["sat_validado"] is True
    assert comp_data["estado_verificacion"] == "verificada"

    # 4. Consultar empresas registradas
    list_res = client.get("/api/v1/companies?user_email=sat_test@chambachat.com", headers=SAT_AUTH)
    assert list_res.status_code == 200
    companies = list_res.json()
    assert len(companies) >= 1
    carrier = next(c for c in companies if c["rfc"] == "CME830831LJ2")
    assert carrier["sat_validado"] is True
    assert carrier["idcif"] == "18060383187"
    assert carrier["codigo_postal"] == "66600"
    print("\n[SUCCESS] All SAT extraction and verification tests passed successfully!")


if __name__ == "__main__":
    test_sat_qr_url_parser()
    test_qr_image_decoding()
    test_process_csf_document_qr_direct()
    test_api_upload_csf_and_create_company()
    print("All tests passed!")
