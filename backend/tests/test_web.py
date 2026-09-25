"""Sitio informativo /web: HTML indexable con metadatos, datos estructurados y enlaces internos."""
import json
import re

PAGES = ["/web", "/web/candidatos", "/web/empresas", "/web/planes", "/web/aviso-de-privacidad", "/web/terminos"]


def _jsonld_types(html):
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S)
    return [json.loads(b)["@type"] for b in blocks]


def test_web_pages_render_with_seo_tags(client):
    for path in PAGES:
        res = client.get(path)
        assert res.status_code == 200, path
        assert "text/html" in res.headers["content-type"]
        html = res.text
        assert '<html lang="es-MX">' in html
        assert f'<link rel="canonical" href="https://www.chambachat.com{path}">' in html
        assert '<meta name="description" content="' in html
        assert 'og:image" content="https://www.chambachat.com/og-chambachat.png"' in html
        assert "Quicksand" in html  # tipografía de la marca
        types = _jsonld_types(html)
        assert {"Organization", "WebSite", "BreadcrumbList"} <= set(types), (path, types)
        assert 'href="/web/aviso-de-privacidad"' in html and 'href="/vacantes"' in html  # pie de página


def test_web_home_describes_product_with_faq(client):
    html = client.get("/web").text
    assert "¿Qué es ChambaChat?" in html
    assert "FAQPage" in _jsonld_types(html)
    for href in ("/web/candidatos", "/web/empresas", "/web/planes"):
        assert f'href="{href}"' in html


def test_planes_has_no_invented_prices(client):
    html = client.get("/web/planes").text
    assert "Gratis" in html and "Consulta el precio" in html
    assert not re.search(r"\$\s?\d", html)


def test_legal_pages(client):
    aviso = client.get("/web/aviso-de-privacidad").text
    assert "Derechos ARCO" in aviso and "mailto:hola@chambachat.com" in aviso
    terminos = client.get("/web/terminos").text
    assert "Ley Federal del Trabajo" in terminos and 'href="/web/aviso-de-privacidad"' in terminos


def test_sitemap_lists_marketing_pages(client):
    sitemap = client.get("/sitemap.xml").text
    for path in PAGES:
        assert f"https://www.chambachat.com{path}</loc>" in sitemap
