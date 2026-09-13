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
                print(f"[Resend Error] {res.status_code}: {res.text}")
        except Exception as e:
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

    return {"sent": False, "error": "SMTP_NOT_CONFIGURED"}
