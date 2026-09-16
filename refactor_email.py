import re

with open('backend/app/services/email_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

dispatch_logic = """import logging

logger = logging.getLogger(__name__)

def _dispatch_email(to_email: str, subject: str, html_content: str) -> dict:
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import requests
    
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@chambachat.com")
    resend_key = os.getenv("RESEND_API_KEY")

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
                logger.error(f"[Resend Error] {res.status_code}: {res.text}")
        except Exception as e:
            resend_error = f"Resend Exception: {str(e)}"
            logger.error(f"[Resend Exception]: {e}")

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
            logger.error(f"[SMTP Exception]: {e}")
            return {"sent": False, "error": str(e)}

    return {"sent": False, "error": resend_error or "SMTP_NOT_CONFIGURED"}

"""

# Add _dispatch_email to the top (after initial imports)
content = content.replace("import requests\n", "import requests\n\n" + dispatch_logic)

# Replace print with logger
content = re.sub(r'print\(f"(.*?)"\)', r'logger.error(f"\1")', content)
content = re.sub(r"print\(f'(.*?)'\)", r"logger.error(f'\1')", content)

# Remove the smtp variable declarations in send_real_verification_email and send_team_invitation_email
content = re.sub(r'    smtp_host = os\.getenv\("SMTP_HOST", "smtp\.gmail\.com"\).*?resend_key = os\.getenv\("RESEND_API_KEY"\)\n', '', content, flags=re.DOTALL)

# Replace the dispatch blocks
resend_block = r'    # 1\. Intentar con Resend API.*?return \{"sent": False, "error": resend_error or "SMTP_NOT_CONFIGURED"\}'
content = re.sub(resend_block, '    return _dispatch_email(to_email, subject, html_content)', content, flags=re.DOTALL)

with open('backend/app/services/email_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
