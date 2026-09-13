import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests

def send_real_verification_email(to_email: str, code: str) -> dict:
    """
    Despacha un correo electrónico real con el código de 4 dígitos.
    Soporta:
    1. Resend API (si RESEND_API_KEY está configurada)
    2. SMTP estándar (Gmail, Outlook, Brevo, etc. si SMTP_USER y SMTP_PASSWORD están configuradas)
    """
    to_email = to_email.strip()
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@chambachat.com")
    resend_key = os.getenv("RESEND_API_KEY")

    subject = f"{code} es tu código de confirmación en Chambachat"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirma tu correo en Chambachat</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; }}
        .card {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 28px; border: 1px solid #e2e8f0; padding: 36px 28px; text-align: center; box-shadow: 0 4px 20px rgba(11,34,70,0.08); }}
        .logo-header {{ margin-bottom: 24px; text-align: center; }}
        .logo-img {{ max-height: 52px; width: auto; border-radius: 12px; }}
        .mascot-box {{ margin-bottom: 12px; }}
        .mascot-img {{ width: 64px; height: 64px; object-fit: contain; }}
        .title {{ font-size: 22px; font-weight: 900; color: #0b2246; margin-bottom: 8px; letter-spacing: -0.5px; }}
        .desc {{ font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px; }}
        .code-box {{ display: inline-block; background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 20px; padding: 14px 36px; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #047857; margin-bottom: 24px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 2px 8px rgba(16,185,129,0.15); }}
        .note {{ font-size: 12px; color: #94a3b8; line-height: 1.4; margin-top: 16px; }}
        .footer {{ font-size: 11px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-header">
          <img src="https://chambachat.onrender.com/logo-chambachat.png" alt="ChambaChat" class="logo-img" />
        </div>
        <div class="mascot-box">
          <img src="https://chambachat.onrender.com/chambot.png" alt="Chambot" class="mascot-img" />
        </div>
        <div class="title">Confirma tu Correo Personal</div>
        <div class="desc">
          ¡Qué onda! Usa el siguiente código de 4 dígitos para activar tu cuenta y postularte a las mejores vacantes industriales de Nuevo León:
        </div>
        <div class="code-box">{code}</div>
        <div class="note">
          ⏰ Este código vence en 15 minutos.<br>Si tú no solicitaste este registro en Chambachat, puedes ignorar este correo.
        </div>
        <div class="footer">
          Chambachat &copy; 2026 &bull; Conectando talento industrial y operarios en Nuevo León
        </div>
      </div>
    </body>
    </html>
    """

    # 1. Intentar con Resend API
    resend_error = None
    if resend_key:
        try:
            from_sender = os.getenv("RESEND_FROM", "Chambachat <onboarding@resend.dev>")
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_sender,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                },
                timeout=10
            )
            if res.status_code in (200, 201):
                return {"sent": True, "provider": "resend", "detail": res.json()}
            else:
                resend_error = f"Resend HTTP {res.status_code}: {res.text}"
                print(f"[Resend Error] {res.status_code}: {res.text}")
        except Exception as e:
            resend_error = f"Resend Exception: {str(e)}"
            print(f"[Resend Exception]: {e}")

    # 2. Intentar con SMTP estándar (ej. Gmail, Brevo, Outlook, etc.)
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_email
            msg.attach(MIMEText(html_content, "html"))

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
            server.quit()
            return {"sent": True, "provider": "smtp"}
        except Exception as e:
            print(f"[SMTP Exception]: {e}")
            return {"sent": False, "error": str(e)}

    return {"sent": False, "error": resend_error or "SMTP_NOT_CONFIGURED"}


def send_team_invitation_email(
    to_email: str, 
    inviter_name: str, 
    company_name: str, 
    role: str, 
    token: str, 
    invite_url: str
) -> dict:
    """
    Envía un correo formal de invitación a un reclutador para unirse al equipo de una empresa en Chambachat.
    Soporta Resend API y SMTP estándar.
    """
    to_email = to_email.strip()
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@chambachat.com")
    resend_key = os.getenv("RESEND_API_KEY")

    role_label = "Administrador de RH" if role == "admin" else "Reclutador Industrial"
    subject = f"Invitación para unirte al equipo de {company_name} en Chambachat"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitación de Equipo - Chambachat</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 20px rgba(15,23,42,0.06); }}
        .logo-header {{ text-align: center; margin-bottom: 24px; }}
        .logo-img {{ max-height: 48px; width: auto; border-radius: 10px; }}
        .badge {{ display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; border: 1px solid #dbeafe; }}
        .title {{ font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 10px; }}
        .desc {{ font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }}
        .highlight-box {{ background-color: #f1f5f9; border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; text-align: left; }}
        .highlight-item {{ font-size: 13px; color: #334155; margin-bottom: 6px; }}
        .btn {{ display: block; background-color: #059669; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 14px; text-align: center; box-shadow: 0 2px 8px rgba(5,150,105,0.25); margin-bottom: 16px; }}
        .token-box {{ font-family: monospace; font-size: 13px; font-weight: 700; color: #0f766e; background: #ecfdf5; padding: 10px 16px; border-radius: 12px; border: 1px dashed #10b981; text-align: center; word-break: break-all; margin-bottom: 20px; }}
        .footer {{ font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-header">
          <img src="https://chambachat.onrender.com/logo-chambachat.png" alt="Chambachat" class="logo-img" />
        </div>
        <div style="text-align: center;">
          <span class="badge">Portal Empresa &bull; Equipo B2B</span>
          <div class="title">¡Te invitaron a colaborar!</div>
        </div>
        <div class="desc">
          <strong>{inviter_name}</strong> te ha invitado a formar parte del equipo de atracción de talento para <strong>{company_name}</strong> en Chambachat.
        </div>
        <div class="highlight-box">
          <div class="highlight-item">🏭 <strong>Empresa / Planta:</strong> {company_name}</div>
          <div class="highlight-item">👤 <strong>Rol asignado:</strong> {role_label}</div>
          <div class="highlight-item">💼 <strong>Beneficios:</strong> Podrán gestionar vacantes compartidas, revisar postulaciones de operarios y responder en el chat grupal con IA de respaldo.</div>
        </div>
        
        <a href="{invite_url}" class="btn">Aceptar Invitación y Unirme al Equipo</a>
        
        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; text-align: center;">
          O copia este código de invitación al registrarte:
        </div>
        <div class="token-box">{token}</div>

        <div class="footer">
          Chambachat &copy; 2026 &bull; Ecosistema de Empleo Industrial y Manufactura en Nuevo León
        </div>
      </div>
    </body>
    </html>
    """

    # 1. Intentar con Resend API
    resend_error = None
    if resend_key:
        try:
            from_sender = os.getenv("RESEND_FROM", "Chambachat <onboarding@resend.dev>")
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": from_sender,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                },
                timeout=10
            )
            if res.status_code in (200, 201):
                return {"sent": True, "provider": "resend", "detail": res.json()}
            else:
                resend_error = f"Resend HTTP {res.status_code}: {res.text}"
        except Exception as e:
            resend_error = f"Resend Exception: {str(e)}"

    # 2. Intentar con SMTP estándar
    if smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_email
            msg.attach(MIMEText(html_content, "html"))

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())
            server.quit()
            return {"sent": True, "provider": "smtp"}
        except Exception as e:
            return {"sent": False, "error": str(e)}

    return {"sent": False, "error": resend_error or "SMTP_NOT_CONFIGURED"}
