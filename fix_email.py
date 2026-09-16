with open('backend/app/services/email_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '    resend_error = None'
replacement = '''    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@chambachat.com")
    resend_key = os.getenv("RESEND_API_KEY")

    resend_error = None'''

# We only want to replace the first occurrence (inside _dispatch_email)
content = content.replace(target, replacement, 1)

with open('backend/app/services/email_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
