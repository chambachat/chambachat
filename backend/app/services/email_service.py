"""
Servicio de correo transaccional.

Un solo punto de despacho (_dispatch_email) con dos proveedores en cascada:
1. Resend API (si RESEND_API_KEY está configurada)
2. SMTP estándar (si SMTP_USER y SMTP_PASSWORD están configuradas)

Las plantillas HTML viven en app/templates/*.html y se renderizan con
string.Template (placeholders ${nombre}).
"""
import html
import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import lru_cache
from string import Template

import requests

logger = logging.getLogger(__name__)

_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
_DEFAULT_BASE_URL = "https://chambachat.onrender.com"


# ─── Plantillas ───────────────────────────────────────────────────────

@lru_cache(maxsize=8)
def _load_template(name: str) -> Template:
    path = os.path.join(_TEMPLATES_DIR, name)
    with open(path, encoding="utf-8") as fh:
        return Template(fh.read())


def render_template(name: str, **context) -> str:
    """Renderiza una plantilla HTML escapando los valores para evitar inyección."""
    safe_ctx = {k: html.escape(str(v), quote=True) if v is not None else "" for k, v in context.items()}
    safe_ctx.setdefault("base_url", os.getenv("PUBLIC_BASE_URL", _DEFAULT_BASE_URL))
    safe_ctx.setdefault("year", str(datetime.utcnow().year))
    return _load_template(name).safe_substitute(safe_ctx)


# ─── Despacho ─────────────────────────────────────────────────────────

def _send_via_resend(to_email: str, subject: str, html_content: str, api_key: str) -> dict:
    from_sender = os.getenv("RESEND_FROM", "Chambachat <onboarding@resend.dev>")
    res = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"from": from_sender, "to": [to_email], "subject": subject, "html": html_content},
        timeout=10,
    )
    if res.status_code in (200, 201):
        return {"sent": True, "provider": "resend", "detail": res.json()}
    return {"sent": False, "error": _friendly_resend_error(res.status_code, res.text, from_sender)}


def _friendly_resend_error(status: int, body: str, from_sender: str) -> str:
    """Convierte los errores frecuentes de Resend en un mensaje que el usuario pueda accionar."""
    lower = body.lower()
    if "resend.dev" in from_sender and ("own email" in lower or "verify a domain" in lower or status == 403):
        return (
            "El remitente de pruebas de Resend (onboarding@resend.dev) solo puede enviar al correo del dueño "
            "de la cuenta. Verifica tu dominio en resend.com/domains y configura RESEND_FROM "
            "(ej. 'ChambaChat <hola@tudominio.com>') en Render."
        )
    if status in (401, 403):
        return "Resend rechazó la API key (RESEND_API_KEY inválida o sin permisos de envío)."
    if status == 422:
        return f"Resend rechazó el mensaje: {body[:200]}"
    if status == 429:
        return "Resend: límite de envíos alcanzado, intenta más tarde."
    return f"Resend HTTP {status}: {body[:200]}"


def _send_via_smtp(to_email: str, subject: str, html_content: str) -> dict:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@chambachat.com")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, [to_email], msg.as_string())
    return {"sent": True, "provider": "smtp"}


def _dispatch_email(to_email: str, subject: str, html_content: str) -> dict:
    """Intenta Resend y después SMTP. Devuelve {"sent": bool, "provider"?: str, "error"?: str}."""
    resend_key = os.getenv("RESEND_API_KEY")
    resend_error = None

    if resend_key:
        try:
            result = _send_via_resend(to_email, subject, html_content, resend_key)
            if result["sent"]:
                return result
            resend_error = result["error"]
            logger.error("[Resend] %s", resend_error)
        except Exception as exc:  # noqa: BLE001
            resend_error = f"Resend Exception: {exc}"
            logger.error("[Resend Exception] %s", exc)

    if os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
        try:
            return _send_via_smtp(to_email, subject, html_content)
        except Exception as exc:  # noqa: BLE001
            logger.error("[SMTP Exception] %s", exc)
            return {"sent": False, "error": str(exc)}

    return {"sent": False, "error": resend_error or "SMTP_NOT_CONFIGURED"}


# ─── Correos públicos ─────────────────────────────────────────────────

def send_real_verification_email(to_email: str, code: str, expiration_minutes: int = 15) -> dict:
    """Envía el código de verificación de inicio de sesión."""
    to_email = to_email.strip()
    subject = f"{code} es tu código de confirmación en Chambachat"
    html_content = render_template(
        "verification_code.html",
        code=code,
        code_length=len(code),
        expiration_minutes=expiration_minutes,
    )
    return _dispatch_email(to_email, subject, html_content)


def send_team_invitation_email(
    to_email: str,
    inviter_name: str,
    company_name: str,
    role: str,
    token: str,
    invite_url: str,
) -> dict:
    """Envía la invitación a un reclutador para unirse al equipo de una empresa."""
    to_email = to_email.strip()
    role_label = "Administrador de RH" if role == "admin" else "Reclutador Industrial"
    subject = f"Invitación para unirte al equipo de {company_name} en Chambachat"
    html_content = render_template(
        "team_invitation.html",
        inviter_name=inviter_name,
        company_name=company_name,
        role_label=role_label,
        token=token,
        invite_url=invite_url,
    )
    return _dispatch_email(to_email, subject, html_content)
