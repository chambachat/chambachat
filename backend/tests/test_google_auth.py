"""Acceso con Google: verificación del ID token (simulada) y emisión del JWT propio."""
from app.routers import auth as auth_router

FAKE_CREDENTIAL = "eyJhbGciOiJSUzI1NiJ9.token-simulado-de-google-para-tests.firma"


def _fake_payload(email="google_user@gmail.com", **extra):
    base = {
        "sub": "1234567890",
        "email": email,
        "email_verified": True,
        "name": "Usuario Google",
        "picture": "https://lh3.googleusercontent.com/a/foto.jpg",
    }
    base.update(extra)
    return base


def test_auth_config_reports_google_state(client, monkeypatch):
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "")
    res = client.get("/api/v1/auth/config")
    assert res.status_code == 200
    assert res.json()["google_client_id"] is None

    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com")
    assert client.get("/api/v1/auth/config").json()["google_client_id"] == "abc.apps.googleusercontent.com"


def test_google_login_disabled_without_client_id(client, monkeypatch):
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "")
    res = client.post("/api/v1/auth/google", json={"credential": FAKE_CREDENTIAL})
    assert res.status_code == 503


def test_google_login_creates_user_and_issues_jwt(client, monkeypatch):
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com")
    monkeypatch.setattr(auth_router, "_verify_google_id_token", lambda credential: _fake_payload())

    res = client.post("/api/v1/auth/google", json={"credential": FAKE_CREDENTIAL, "role": "recruiter"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "verified"
    assert body["token"]
    assert body["user"]["email"] == "google_user@gmail.com"
    assert body["user"]["nombre"] == "Usuario Google"
    assert body["user"]["role"] == "recruiter"
    assert body["user"]["avatar_url"].startswith("https://lh3.googleusercontent.com")

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "google_user@gmail.com"

    # Segundo acceso: mismo usuario, el rol existente no se degrada aunque pida candidate
    again = client.post("/api/v1/auth/google", json={"credential": FAKE_CREDENTIAL, "role": "candidate"})
    assert again.status_code == 200
    assert again.json()["user"]["id"] == body["user"]["id"]
    assert again.json()["user"]["role"] == "recruiter"


def test_google_login_rejects_unverified_or_invalid_token(client, monkeypatch):
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com")

    monkeypatch.setattr(auth_router, "_verify_google_id_token", lambda credential: _fake_payload(email_verified=False))
    assert client.post("/api/v1/auth/google", json={"credential": FAKE_CREDENTIAL}).status_code == 401

    def _boom(credential):
        raise ValueError("aud no coincide")
    monkeypatch.setattr(auth_router, "_verify_google_id_token", _boom)
    res = client.post("/api/v1/auth/google", json={"credential": FAKE_CREDENTIAL})
    assert res.status_code == 401
    assert "token" not in res.json()
