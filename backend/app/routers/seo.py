"""
Páginas indexables para buscadores.

La app es una SPA de React que los rastreadores ven casi vacía, así que el servidor entrega
HTML real para lo que más importa en búsquedas de empleo:
- /vacantes: listado de vacantes activas.
- /vacantes/{id}-{slug}: ficha de cada vacante con datos estructurados JobPosting (Google for Jobs).
- /sitemap.xml y /robots.txt.
Cada página enlaza al chat (Smart Link de la empresa) para postularse.
"""
import html
import json
import os
import re
import unicodedata
from datetime import timedelta
from typing import Dict, List, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, Job

router = APIRouter(tags=["SEO"])

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://www.chambachat.com").rstrip("/")
SITE_NAME = "ChambaChat"
SITE_DESCRIPTION = (
    "Vacantes operativas en manufactura y logística: montacarguistas, ensamble, almacén, soldadura. "
    "Habla directo con reclutadores por chat y postúlate en minutos."
)
JOB_VALID_DAYS = 60
MARKETING_PATHS = ["/web", "/web/candidatos", "/web/empresas", "/web/planes", "/web/aviso-de-privacidad", "/web/terminos"]

_EMPLOYMENT_TYPES = {
    "Planta (tiempo indeterminado)": "FULL_TIME",
    "Temporal (tiempo determinado)": "TEMPORARY",
    "Por proyecto / obra": "CONTRACTOR",
    "Por agencia / outsourcing": "CONTRACTOR",
    "Eventual / temporada": "TEMPORARY",
}


# ─── Utilidades ──────────────────────────────────────────────────────

def slugify(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    plain = "".join(c for c in nfkd if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", plain).strip("-")[:80] or "vacante"


def job_path(job: Job) -> str:
    return f"/vacantes/{job.id}-{slugify(job.titulo)}"


def chat_url(company: Optional[Company]) -> str:
    """Smart Link de la empresa (abre el chat con sus vacantes) o el chat general."""
    if company and company.smart_code:
        return f"{PUBLIC_BASE_URL}/?empresa={quote(company.nombre)}&codigo={company.smart_code}"
    return f"{PUBLIC_BASE_URL}/"


def _e(text) -> str:
    return html.escape(str(text)) if text is not None else ""


def _money(value) -> str:
    return f"${float(value or 0):,.0f}"


def _page(title: str, description: str, canonical: str, body: str, jsonld: Optional[dict] = None) -> str:
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ""
    return f"""<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_e(title)}</title>
<meta name="description" content="{_e(description)}">
<link rel="canonical" href="{_e(canonical)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{_e(title)}">
<meta property="og:description" content="{_e(description)}">
<meta property="og:url" content="{_e(canonical)}">
<meta property="og:image" content="{PUBLIC_BASE_URL}/og-chambachat.png">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/globoch.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
{ld}
<style>
  :root{{--navy:#052B52;--green:#65A30D;--lime:#B7F542;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}}
  *{{box-sizing:border-box}} body{{margin:0;font-family:Quicksand,system-ui,sans-serif;color:var(--ink);background:#fcfdfd;font-weight:500}}
  a{{color:var(--green)}} header{{display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid var(--line);background:#fff}}
  header img{{width:36px;height:36px}} header .brand{{font-weight:600;font-size:20px;color:var(--navy);text-decoration:none}} header .brand span{{color:var(--green)}}
  main{{max-width:900px;margin:0 auto;padding:24px 20px 48px}} h1{{font-size:28px;line-height:1.2;margin:0 0 8px;color:var(--navy)}} h2{{font-size:18px;margin:28px 0 8px;color:var(--navy)}}
  p.lead{{color:var(--muted);margin:0 0 20px}} .grid{{display:grid;gap:12px}} @media(min-width:720px){{.grid{{grid-template-columns:1fr 1fr}}}}
  .card{{display:block;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;text-decoration:none;color:inherit}} .card:hover{{border-color:var(--green)}}
  .card .co{{font-size:12px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.04em}} .card h3{{margin:4px 0 6px;font-size:16px}} .card .meta{{font-size:13px;color:var(--muted)}}
  .pay{{font-weight:700;color:var(--navy)}} .chips{{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}} .chip{{font-size:12px;background:#f1f5f9;border-radius:8px;padding:4px 8px}}
  .cta{{display:inline-block;background:var(--navy);color:#fff;font-weight:700;padding:12px 18px;border-radius:12px;text-decoration:none;margin-top:8px}} .cta.alt{{background:#fff;color:var(--navy);border:1px solid var(--line)}}
  dl{{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:14px}} dt{{color:var(--muted)}} dd{{margin:0}} ul{{padding-left:20px}}
  footer{{border-top:1px solid var(--line);padding:18px 20px;font-size:12px;color:var(--muted)}} footer a{{margin-right:14px}}
</style>
</head>
<body>
<header><a class="brand" href="{PUBLIC_BASE_URL}/"><img src="/globoch.png" alt="{SITE_NAME}"> Chamba<span>Chat</span></a></header>
<main>
{body}
</main>
<footer><a href="{PUBLIC_BASE_URL}/">Buscar chamba en el chat</a><a href="{PUBLIC_BASE_URL}/vacantes">Todas las vacantes</a><a href="{PUBLIC_BASE_URL}/">Soy empresa: publicar vacantes</a><br><br>© {SITE_NAME}. Vacantes formales con chat directo entre candidatos y reclutadores.</footer>
</body>
</html>"""


def _job_card(job: Job) -> str:
    extras = [job.municipio, job.tipo_turno or ("Turno fijo" if job.turnos_fijos else None), "Transporte de personal" if job.transporte_incluido else None]
    meta = " · ".join(_e(x) for x in extras if x)
    return (
        f'<a class="card" href="{PUBLIC_BASE_URL}{job_path(job)}"><div class="co">{_e(job.empresa_nombre)}</div>'
        f'<h3>{_e(job.titulo)}</h3><div class="meta">{meta}</div>'
        f'<div class="pay">{_money(job.sueldo_semanal_libre)} libres a la semana</div></a>'
    )


def _job_description_html(job: Job) -> str:
    parts: List[str] = []
    if job.descripcion:
        parts.append(f"<p>{_e(job.descripcion)}</p>")
    detalles = []
    if job.tipo_turno or job.hora_entrada:
        horario = f"{job.tipo_turno or 'Turno fijo'}" + (f" de {job.hora_entrada} a {job.hora_salida}" if job.hora_entrada and job.hora_salida else "") + (f", {job.dias_laborales}" if job.dias_laborales else "")
        detalles.append(f"<li>Horario: {_e(horario)}</li>")
    if job.escolaridad_minima:
        detalles.append(f"<li>Escolaridad mínima: {_e(job.escolaridad_minima)}</li>")
    if job.experiencia_minima:
        detalles.append(f"<li>Experiencia: {_e(job.experiencia_minima)}</li>")
    if job.certificaciones:
        detalles.append(f"<li>Certificaciones: {_e(', '.join(job.certificaciones))}</li>")
    if job.prestaciones:
        detalles.append(f"<li>Prestaciones: {_e(', '.join(job.prestaciones))}</li>")
    if job.transporte_incluido:
        detalles.append("<li>Transporte de personal incluido</li>")
    if detalles:
        parts.append("<ul>" + "".join(detalles) + "</ul>")
    return "".join(parts) or f"<p>Vacante de {_e(job.titulo)} en {_e(job.empresa_nombre)}.</p>"


def _jobposting_jsonld(job: Job, company: Optional[Company]) -> Dict:
    address = {"@type": "PostalAddress", "addressLocality": job.municipio, "addressCountry": "MX"}
    if company:
        if company.direccion:
            address["streetAddress"] = company.direccion
        if company.codigo_postal:
            address["postalCode"] = company.codigo_postal
        if company.entidad_federativa:
            address["addressRegion"] = company.entidad_federativa
    data = {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": job.titulo,
        "description": _job_description_html(job),
        "identifier": {"@type": "PropertyValue", "name": SITE_NAME, "value": str(job.id)},
        "datePosted": (job.created_at.date().isoformat() if job.created_at else None),
        "validThrough": ((job.created_at + timedelta(days=JOB_VALID_DAYS)).date().isoformat() if job.created_at else None),
        "employmentType": _EMPLOYMENT_TYPES.get(job.tipo_contrato or "", "FULL_TIME"),
        "hiringOrganization": {"@type": "Organization", "name": job.empresa_nombre},
        "jobLocation": {"@type": "Place", "address": address},
        "baseSalary": {
            "@type": "MonetaryAmount", "currency": "MXN",
            "value": {"@type": "QuantitativeValue", "value": float(job.sueldo_semanal_libre or 0), "unitText": "WEEK"},
        },
        "directApply": True,
        "url": f"{PUBLIC_BASE_URL}{job_path(job)}",
    }
    if job.prestaciones:
        data["jobBenefits"] = ", ".join(job.prestaciones)
    if job.escolaridad_minima:
        data["educationRequirements"] = job.escolaridad_minima
    if job.experiencia_minima:
        data["experienceRequirements"] = job.experiencia_minima
    if job.hora_entrada and job.hora_salida:
        data["workHours"] = f"{job.hora_entrada} a {job.hora_salida}" + (f", {job.dias_laborales}" if job.dias_laborales else "")
    if job.vacantes_disponibles:
        data["totalJobOpenings"] = int(job.vacantes_disponibles)
    return {k: v for k, v in data.items() if v is not None}


def _active_jobs(db: Session, limit: int = 300) -> List[Job]:
    return db.query(Job).filter(Job.activa.is_(True)).order_by(Job.id.desc()).limit(limit).all()


# ─── Rutas ───────────────────────────────────────────────────────────

@router.get("/vacantes", response_class=HTMLResponse, include_in_schema=False)
def vacantes_index(db: Session = Depends(get_db)):
    jobs = _active_jobs(db)
    cards = "".join(_job_card(j) for j in jobs) or "<p>Por ahora no hay vacantes publicadas. Pregunta en el chat y te avisamos en cuanto salgan.</p>"
    jsonld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Vacantes operativas activas",
        "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f"{PUBLIC_BASE_URL}{job_path(j)}", "name": j.titulo} for i, j in enumerate(jobs[:50])],
    }
    body = (
        f"<h1>Vacantes operativas activas</h1>"
        f'<p class="lead">{len(jobs)} vacante{"s" if len(jobs) != 1 else ""} en manufactura y logística con sueldo libre semanal, turno y transporte a la vista. '
        f'Elige una y postúlate por chat directo con el reclutador.</p>'
        f'<a class="cta" href="{PUBLIC_BASE_URL}/">Buscar chamba en el chat</a>'
        f'<div class="grid" style="margin-top:20px">{cards}</div>'
    )
    return _page(f"Vacantes operativas activas | {SITE_NAME}", SITE_DESCRIPTION, f"{PUBLIC_BASE_URL}/vacantes", body, jsonld)


@router.get("/vacantes/{job_ref}", response_class=HTMLResponse, include_in_schema=False)
def vacante_detail(job_ref: str, db: Session = Depends(get_db)):
    match = re.match(r"^(\d+)", job_ref)
    if not match:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    job = db.query(Job).filter(Job.id == int(match.group(1)), Job.activa.is_(True)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    company = job.company
    canonical = f"{PUBLIC_BASE_URL}{job_path(job)}"
    title = f"{job.titulo} en {job.empresa_nombre} ({job.municipio}) | {SITE_NAME}"
    description = f"{job.titulo} en {job.empresa_nombre}, {job.municipio}: {_money(job.sueldo_semanal_libre)} libres a la semana" + (f", {job.tipo_turno.lower()}" if job.tipo_turno else "") + ". Postúlate por chat directo con el reclutador."

    chips = [c for c in [job.tipo_turno, job.dias_laborales, job.tipo_contrato, job.escolaridad_minima and f"Escolaridad: {job.escolaridad_minima}", job.experiencia_minima and f"Experiencia: {job.experiencia_minima}", "Transporte de personal" if job.transporte_incluido else None] if c]
    facts = [("Empresa", job.empresa_nombre), ("Municipio", job.municipio), ("Sueldo", f"{_money(job.sueldo_semanal_libre)} libres a la semana")]
    if job.bono_semanal or job.vales_despensa_semanal:
        facts.append(("Bonos y vales", f"{_money((job.bono_semanal or 0) + (job.vales_despensa_semanal or 0))} adicionales a la semana"))
    if job.hora_entrada and job.hora_salida:
        facts.append(("Horario", f"{job.hora_entrada} a {job.hora_salida}" + (f", {job.dias_laborales}" if job.dias_laborales else "")))
    if job.vacantes_disponibles and job.vacantes_disponibles > 1:
        facts.append(("Plazas", str(job.vacantes_disponibles)))
    dl = "".join(f"<dt>{_e(k)}</dt><dd>{_e(v)}</dd>" for k, v in facts)
    chips_html = "".join(f'<span class="chip">{_e(c)}</span>' for c in chips)
    body = (
        f'<div class="co" style="font-size:12px;font-weight:700;color:var(--green);text-transform:uppercase">{_e(job.empresa_nombre)}</div>'
        f"<h1>{_e(job.titulo)}</h1>"
        f'<p class="lead">{_e(job.municipio)} · {_money(job.sueldo_semanal_libre)} libres a la semana</p>'
        f'<div class="chips">{chips_html}</div>'
        f'<a class="cta" href="{_e(chat_url(company))}">Postularme por chat</a> '
        f'<a class="cta alt" href="{PUBLIC_BASE_URL}/vacantes">Ver más vacantes</a>'
        f"<h2>Datos de la vacante</h2><dl>{dl}</dl>"
        f"<h2>Descripción</h2>{_job_description_html(job)}"
        f"<h2>¿Cómo postularme?</h2><p>Toca <strong>Postularme por chat</strong>: Chambot te hace unas preguntas rápidas y pasa tu información al reclutador de {_e(job.empresa_nombre)}, quien te responde en el mismo chat.</p>"
    )
    return _page(title, description, canonical, body, _jobposting_jsonld(job, company))


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    jobs = _active_jobs(db, limit=2000)
    urls = [(f"{PUBLIC_BASE_URL}/", "daily", "1.0", None), (f"{PUBLIC_BASE_URL}/vacantes", "daily", "0.9", None)]
    urls += [(f"{PUBLIC_BASE_URL}{p}", "monthly", "0.3" if p.startswith(("/web/aviso", "/web/terminos")) else "0.7", None) for p in MARKETING_PATHS]
    urls += [(f"{PUBLIC_BASE_URL}{job_path(j)}", "weekly", "0.8", j.created_at.date().isoformat() if j.created_at else None) for j in jobs]
    items = "".join(
        f"<url><loc>{_e(loc)}</loc>" + (f"<lastmod>{lastmod}</lastmod>" if lastmod else "") + f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        for loc, freq, prio, lastmod in urls
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt", include_in_schema=False)
def robots():
    return PlainTextResponse(f"User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: {PUBLIC_BASE_URL}/sitemap.xml\n")
