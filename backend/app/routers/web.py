"""
Sitio informativo de ChambaChat (SEO): /web, /web/candidatos, /web/empresas, /web/planes,
/web/aviso-de-privacidad y /web/terminos.

Se sirve desde el servidor como HTML puro (sin JavaScript) bajo el mismo dominio que la app,
para que toda la autoridad de búsqueda sume a www.chambachat.com. Estilo, tipografía y
colores de la marca; datos estructurados Organization, WebSite, BreadcrumbList y FAQPage.
"""
import json
from typing import Dict, List, Optional

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.routers.seo import PUBLIC_BASE_URL, SITE_NAME, _e
from app.web_pages import candidatos, empresas, home, legal, planes

router = APIRouter(tags=["Web"])

NAV = [("Inicio", "/web"), ("Candidatos", "/web/candidatos"), ("Empresas", "/web/empresas"), ("Vacantes", "/vacantes"), ("Planes", "/web/planes")]
CONTACT_EMAIL = "hola@chambachat.com"

CSS = """
:root{--navy:#052B52;--green:#65A30D;--lime:#B7F542;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--bg:#fcfdfd}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Quicksand,system-ui,sans-serif;font-weight:500;color:var(--ink);background:var(--bg);line-height:1.55}
a{color:var(--green)}img{max-width:100%}.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
header.top{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);z-index:5}
.nav{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;flex-wrap:wrap;padding:8px 0}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--navy);font-weight:600;font-size:22px}.brand span{color:var(--green)}.brand img{width:36px;height:36px}
.links{display:flex;gap:4px;flex-wrap:wrap;align-items:center}.links a{color:var(--ink);text-decoration:none;font-weight:600;padding:8px 10px;border-radius:10px;font-size:14px}.links a:hover,.links a.on{background:#f1f5f9}
.btn{display:inline-block;background:var(--navy);color:#fff;font-weight:700;padding:12px 18px;border-radius:12px;text-decoration:none}.btn.lime{background:var(--lime);color:var(--navy)}.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--line)}.btn.sm{padding:8px 14px;font-size:14px}
.hero{background:linear-gradient(135deg,#052B52,#0b3f78);color:#fff;padding:64px 0}.hero h1{font-size:clamp(30px,5vw,48px);line-height:1.1;margin:0 0 14px}.hero p{font-size:18px;max-width:640px;opacity:.92;margin:0 0 24px}.hero .cta{display:flex;gap:10px;flex-wrap:wrap}.hero .pill{background:var(--lime);color:var(--navy)}
section{padding:48px 0}section.alt{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
h2{font-size:clamp(24px,3.5vw,32px);color:var(--navy);margin:0 0 8px}h3{color:var(--navy)}p.lead{color:var(--muted);margin:0 0 24px;max-width:720px}
.grid{display:grid;gap:14px}@media(min-width:720px){.grid.c2{grid-template-columns:1fr 1fr}.grid.c3{grid-template-columns:repeat(3,1fr)}.grid.c4{grid-template-columns:repeat(4,1fr)}}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px}.card h3{margin:0 0 6px;font-size:17px}.card p{margin:0;color:var(--muted);font-size:14px}.card .ic{font-size:26px;margin-bottom:8px}
.steps{counter-reset:s;padding:0;list-style:none}.step{position:relative;padding-left:52px;margin-bottom:18px}.step:before{counter-increment:s;content:counter(s);position:absolute;left:0;top:0;width:38px;height:38px;border-radius:12px;background:var(--lime);color:var(--navy);font-weight:800;display:flex;align-items:center;justify-content:center}.step h3{margin:0 0 4px;font-size:17px}.step p{margin:0;color:var(--muted)}
details{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:8px}summary{cursor:pointer;font-weight:700;color:var(--navy)}details p{margin:8px 0 0;color:var(--muted)}
.price{text-align:center}.price .amt{font-size:30px;font-weight:800;color:var(--navy);margin:6px 0}.price ul{text-align:left;padding-left:18px;color:var(--muted);font-size:14px}.price.best{border:2px solid var(--green)}.price small{color:var(--muted)}
.pill{display:inline-block;font-size:12px;font-weight:700;background:#ecfccb;color:#3f6212;padding:4px 10px;border-radius:999px;margin-bottom:10px}
.legal h2{font-size:20px;margin-top:28px}.legal p,.legal li{color:#334155;font-size:15px}.legal .meta{color:var(--muted);font-size:13px}
.band{background:var(--lime);color:var(--navy);padding:40px 0;text-align:center}.band h2{color:var(--navy)}
footer{background:var(--navy);color:#cbd5e1;padding:36px 0;font-size:14px}footer a{color:#fff;text-decoration:none;display:block;margin-bottom:8px}footer .cols{display:grid;gap:18px}@media(min-width:720px){footer .cols{grid-template-columns:2fr 1fr 1fr}}footer .fine{margin-top:24px;font-size:12px;color:#94a3b8}
"""


def _jsonld_base(path: str, title: str) -> List[Dict]:
    crumbs = [{"@type": "ListItem", "position": 1, "name": SITE_NAME, "item": f"{PUBLIC_BASE_URL}/web"}]
    if path != "/web":
        crumbs.append({"@type": "ListItem", "position": 2, "name": title.split("|")[0].strip(), "item": f"{PUBLIC_BASE_URL}{path}"})
    return [
        {
            "@context": "https://schema.org", "@type": "Organization", "name": SITE_NAME, "url": f"{PUBLIC_BASE_URL}/",
            "logo": f"{PUBLIC_BASE_URL}/logo-chambachat.png", "email": CONTACT_EMAIL,
            "description": "Plataforma de reclutamiento operativo por chat: vacantes operativas con chat directo entre candidatos y reclutadores.",
            "areaServed": "MX",
        },
        {"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME, "url": f"{PUBLIC_BASE_URL}/", "inLanguage": "es-MX"},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs},
    ]


def layout(page: Dict) -> str:
    path, title, description = page["path"], page["title"], page["description"]
    canonical = f"{PUBLIC_BASE_URL}{path}"
    links = "".join(f'<a href="{href}" class="{"on" if href == path else ""}">{label}</a>' for label, href in NAV)
    jsonld = _jsonld_base(path, title) + list(page.get("jsonld") or [])
    ld = "".join(f'<script type="application/ld+json">{json.dumps(item, ensure_ascii=False)}</script>' for item in jsonld)
    return f"""<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_e(title)}</title>
<meta name="description" content="{_e(description)}">
<link rel="canonical" href="{_e(canonical)}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#052B52">
<meta property="og:type" content="website"><meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{_e(title)}"><meta property="og:description" content="{_e(description)}">
<meta property="og:url" content="{_e(canonical)}"><meta property="og:image" content="{PUBLIC_BASE_URL}/og-chambachat.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{_e(title)}"><meta name="twitter:description" content="{_e(description)}"><meta name="twitter:image" content="{PUBLIC_BASE_URL}/og-chambachat.png">
<link rel="icon" type="image/png" href="/globoch.png"><link rel="apple-touch-icon" href="/globoch.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
{ld}
<style>{CSS}</style>
</head>
<body>
<header class="top"><div class="wrap nav">
  <a class="brand" href="/web"><img src="/globoch.png" alt="{SITE_NAME}">Chamba<span>Chat</span></a>
  <nav class="links" aria-label="Secciones">{links}<a class="btn lime sm" href="/">Abrir el chat</a></nav>
</div></header>
<main>
{page["body"]}
</main>
<footer><div class="wrap">
  <div class="cols">
    <div><strong style="color:#fff;font-size:18px">Chamba<span style="color:var(--lime)">Chat</span></strong><p>Reclutamiento operativo por chat: vacantes operativas con chat directo entre candidatos y reclutadores, entrevista rápida con IA y empresas verificadas ante el SAT.</p><p>Contacto: <a href="mailto:{CONTACT_EMAIL}" style="display:inline">{CONTACT_EMAIL}</a></p></div>
    <div><a href="/web/candidatos">Para candidatos</a><a href="/web/empresas">Para empresas</a><a href="/vacantes">Vacantes activas</a><a href="/web/planes">Planes</a></div>
    <div><a href="/">Abrir el chat</a><a href="/">Portal de empresa</a><a href="/web/aviso-de-privacidad">Aviso de privacidad</a><a href="/web/terminos">Términos y condiciones</a></div>
  </div>
  <div class="fine">© {SITE_NAME}. Las vacantes publicadas cumplen la Ley Federal del Trabajo: sin requisitos de edad, sexo, estado civil ni foto.</div>
</div></footer>
</body>
</html>"""


def _render(page: Dict) -> HTMLResponse:
    return HTMLResponse(layout(page))


@router.get("/web", response_class=HTMLResponse, include_in_schema=False)
def web_home():
    return _render(home.build())


@router.get("/web/candidatos", response_class=HTMLResponse, include_in_schema=False)
def web_candidatos():
    return _render(candidatos.build())


@router.get("/web/empresas", response_class=HTMLResponse, include_in_schema=False)
def web_empresas():
    return _render(empresas.build())


@router.get("/web/planes", response_class=HTMLResponse, include_in_schema=False)
def web_planes():
    return _render(planes.build())


@router.get("/web/aviso-de-privacidad", response_class=HTMLResponse, include_in_schema=False)
def web_aviso():
    return _render(legal.build_aviso(CONTACT_EMAIL))


@router.get("/web/terminos", response_class=HTMLResponse, include_in_schema=False)
def web_terminos():
    return _render(legal.build_terminos(CONTACT_EMAIL))
