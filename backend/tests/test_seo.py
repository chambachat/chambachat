"""Páginas indexables: listado y ficha de vacantes con JobPosting, sitemap y robots."""
from conftest import make_auth_header


def _job(client, headers, company_id, titulo, activa=True):
    res = client.post("/api/v1/jobs", json={
        "company_id": company_id, "titulo": titulo, "sueldo_semanal_libre": 3100, "municipio": "Apodaca",
        "latitud": 25.78, "longitud": -100.19, "tipo_turno": "Fijo matutino", "hora_entrada": "06:00", "hora_salida": "14:00",
        "dias_laborales": "Lunes a Sábado", "tipo_contrato": "Planta (tiempo indeterminado)", "escolaridad_minima": "Secundaria",
        "prestaciones": ["Transporte de personal", "Vales de despensa"], "descripcion": "Operación de montacargas en almacén.", "activa": activa,
    }, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_robots_and_sitemap(client):
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "Sitemap:" in robots.text and "Disallow: /api/" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "application/xml" in sitemap.headers["content-type"]
    assert "/vacantes</loc>" in sitemap.text


def test_vacantes_pages_render_jobposting(client):
    owner = make_auth_header("seo_owner@test.com", nombre="SEO Owner")
    company = client.post("/api/v1/companies", json={"nombre": "Planta SEO", "municipio": "Apodaca"}, headers=owner).json()["company"]
    job = _job(client, owner, company["id"], "Montacarguista Nocturno SEO")
    oculta = _job(client, owner, company["id"], "Vacante Oculta SEO", activa=False)

    lista = client.get("/vacantes")
    assert lista.status_code == 200
    assert "text/html" in lista.headers["content-type"]
    assert "Montacarguista Nocturno SEO" in lista.text
    assert "Vacante Oculta SEO" not in lista.text
    assert f"/vacantes/{job['id']}-montacarguista-nocturno-seo" in lista.text

    ficha = client.get(f"/vacantes/{job['id']}-cualquier-slug")
    assert ficha.status_code == 200
    assert '"JobPosting"' in ficha.text
    assert '"currency": "MXN"' in ficha.text and '"unitText": "WEEK"' in ficha.text
    assert '"employmentType": "FULL_TIME"' in ficha.text
    assert f'rel="canonical" href="https://www.chambachat.com/vacantes/{job["id"]}-montacarguista-nocturno-seo"' in ficha.text
    assert "Postularme por chat" in ficha.text
    assert f"codigo={company['smart_code']}" in ficha.text  # el CTA abre el Smart Link de la empresa
    assert "Transporte de personal" in ficha.text

    assert client.get(f"/vacantes/{oculta['id']}").status_code == 404
    assert client.get("/vacantes/no-existe").status_code == 404
    assert client.get("/vacantes/999999").status_code == 404

    sitemap = client.get("/sitemap.xml").text
    assert f"/vacantes/{job['id']}-montacarguista-nocturno-seo</loc>" in sitemap
    assert f"/vacantes/{oculta['id']}-" not in sitemap
