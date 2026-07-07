import os
import sys
import time
import pytest
from unittest.mock import patch

# Setup sys.path
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root not in sys.path:
    sys.path.insert(0, root)
backend_path = os.path.join(root, "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.app import create_app
from backend.utils.auth_utils import sign_token, DEFAULT_SECRET


@pytest.fixture
def app():
    # Make sure we start fresh
    app = create_app()
    app.config["TESTING"] = True
    app.config["ENV"] = "development"
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def test_mock_token_rejected_in_production(app, client):
    """Sends Authorization: Bearer token_admin to a protected endpoint with production config and asserts 401."""
    # Force production mode configuration
    app.config["ENV"] = "production"
    
    with patch.dict(os.environ, {"FLASK_ENV": "production"}):
        resp = client.get("/api/analytics/summary", headers={"Authorization": "Bearer token_admin"})
        assert resp.status_code == 401
        assert "invalid or expired" in resp.get_json()["error"]


def test_wrong_signature_jwt_rejected(client):
    """Sends a syntactically valid but wrong-signature JWT and asserts 401."""
    payload = {"username": "JaneDoe", "exp": int(time.time()) + 3600}
    # Sign with a wrong secret
    bad_token = sign_token(payload, secret="wrong-secret-key-1234567890123456")
    resp = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {bad_token}"})
    assert resp.status_code == 401


def test_expired_jwt_rejected(client):
    """Sends an expired JWT (exp in the past) and asserts 401."""
    # Expired 1 hour ago
    payload = {"username": "JaneDoe", "exp": int(time.time()) - 3600}
    expired_token = sign_token(payload, secret=DEFAULT_SECRET)
    resp = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


def test_real_jwt_succeeds(client):
    """Confirms a real login token still returns 200 on a protected route."""
    import uuid
    username = f"testuser_{uuid.uuid4().hex[:8]}"
    password = "securepassword123"

    # Register & Login
    client.post("/api/auth/register", json={"username": username, "password": password})
    login_resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert login_resp.status_code == 200
    token = login_resp.get_json()["token"]

    resp = client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


def test_idor_protection(client):
    """Authenticate as user A, create session, authenticate as user B, try to get A's session -> expect 403."""
    # Create User A
    username_a = "user_a_idor"
    password = "password123"
    client.post("/api/auth/register", json={"username": username_a, "password": password})
    login_a = client.post("/api/auth/login", json={"username": username_a, "password": password})
    token_a = login_a.get_json()["token"]

    # Create User B
    username_b = "user_b_idor"
    client.post("/api/auth/register", json={"username": username_b, "password": password})
    login_b = client.post("/api/auth/login", json={"username": username_b, "password": password})
    token_b = login_b.get_json()["token"]

    # Start an interview session for User A
    start_resp = client.post(
        "/api/interview/start",
        json={
            "questions": [{"id": 0, "text": "Question 1"}],
            "role": "software_engineer",
            "candidate_name": "User A",
            "difficulty": "medium",
            "interview_format": "text"
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert start_resp.status_code == 200
    session_id = start_resp.get_json()["session_id"]

    # Attempt to access User A's session as User B
    get_resp = client.get(
        f"/api/interview/session/{session_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert get_resp.status_code == 403
    assert get_resp.get_json()["error"] == "Forbidden"


def test_cors_origin_filtering(app, client):
    """Confirm a request from a non-allow-listed Origin header does not receive Access-Control-Allow-Origin back."""
    # Setup allowed origins config
    app.config["ALLOWED_ORIGINS"] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Origin header not in list
    resp = client.get("/health", headers={"Origin": "http://malicious-site.com"})
    assert "Access-Control-Allow-Origin" not in resp.headers


def test_file_upload_sniffing(client):
    """Confirm a non-magic-byte-matching file is rejected (e.g. .exe renamed to .pdf)."""
    import io
    import uuid
    username = f"testuser_{uuid.uuid4().hex[:8]}"
    password = "securepassword123"

    # Register & Login
    client.post("/api/auth/register", json={"username": username, "password": password})
    login_resp = client.post("/api/auth/login", json={"username": username, "password": password})
    token = login_resp.get_json()["token"]

    # Create dummy fake binary content (an executable signature MZ)
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00blahblahblah")
    
    # Try to upload fake PDF
    resp = client.post(
        "/api/resume/upload",
        data={
            "file": (fake_exe, "resume.pdf"),
            "job_description": "We need a python engineer with experience in django and fastapi."
        },
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"}
    )
    # Once sniffing is wired in, this must fail with 400!
    assert resp.status_code == 400


def test_production_rate_limiting_config():
    """Confirm ProductionConfig has RATE_LIMIT_ENABLED == True even when env var is unset."""
    with patch.dict(os.environ, {}):
        if "RATE_LIMIT_ENABLED" in os.environ:
            del os.environ["RATE_LIMIT_ENABLED"]
        from config import ProductionConfig
        prod_config = ProductionConfig()
        assert prod_config.RATE_LIMIT_ENABLED is True
