"""Traducción de errores de proveedores de correo a mensajes accionables."""
from app.services import email_service


def test_resend_sandbox_error_is_explained():
    body = ('{"statusCode":403,"name":"validation_error","message":"You can only send testing emails to your own '
            'email address (r063r@hotmail.com). To send emails to other recipients, please verify a domain at '
            'resend.com/domains, and change the `from` address to an email using this domain."}')
    msg = email_service._friendly_resend_error(403, body, "Chambachat <onboarding@resend.dev>")
    assert "resend.com/domains" in msg
    assert "RESEND_FROM" in msg


def test_resend_bad_key_error():
    msg = email_service._friendly_resend_error(401, '{"message":"API key is invalid"}', "ChambaChat <hola@chambachat.com>")
    assert "RESEND_API_KEY" in msg


def test_dispatch_without_providers_reports_not_configured(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)
    res = email_service._dispatch_email("x@test.com", "Asunto", "<p>hola</p>")
    assert res["sent"] is False
    assert res["error"] == "SMTP_NOT_CONFIGURED"
