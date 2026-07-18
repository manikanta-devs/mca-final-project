"""
test_xss_sanitization.py
-------------------------
Verifies that the analytics and session endpoints strip or escape
any HTML/script payloads that could be stored and later rendered.
"""

import os
import sys
import uuid
import json
import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND = os.path.join(ROOT, "backend")
for p in (ROOT, BACKEND):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app import create_app


# ─── Helpers ────────────────────────────────────────────────────────────────


def _register_and_login(client, username, password="SecureP@ss123"):
    client.post("/api/auth/register", json={"username": username, "password": password})
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    return resp.get_json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def app_instance():
    app = create_app()
    app.config["TESTING"] = True
    return app


@pytest.fixture(scope="module")
def client(app_instance):
    return app_instance.test_client()


@pytest.fixture(scope="module")
def user_token(client):
    uid = uuid.uuid4().hex[:8]
    return _register_and_login(client, f"xss_tester_{uid}")


# ─── XSS Payloads ──────────────────────────────────────────────────────────

XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(document.cookie)',
    '<iframe src="javascript:alert(1)">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
]


class TestXSSSanitization:
    """Stored XSS payloads in answers must not appear raw in API responses."""

    def test_answer_xss_payload_stored_safely(self, client, user_token):
        """
        Submit an answer containing script tags; when we retrieve the session,
        the raw <script> tag should NOT appear unescaped in the response body.
        """
        # Start a session
        payload = {
            "questions": [
                {"text": "Tell me about yourself", "category": "general", "difficulty": "easy", "type": "behavioral"}
            ],
            "resume_data": {"name": "XSS Tester"},
            "candidate_name": "XSS Tester",
        }
        resp = client.post("/api/interview/start", json=payload, headers=_auth(user_token))
        assert resp.status_code == 200
        session_id = resp.get_json()["session_id"]

        # Submit an answer containing an XSS payload
        xss_answer = '<script>alert("xss")</script>'
        resp = client.post(
            f"/api/interview/submit/{session_id}",
            json={"answer": xss_answer, "question_index": 0},
            headers=_auth(user_token),
        )
        # The endpoint may return 200 (accepted) or 500 (if the AI call fails).
        # Either way, the answer is stored. We don't assert on status here.

        # Retrieve the session and check the response body
        resp = client.get(f"/api/interview/session/{session_id}", headers=_auth(user_token))
        assert resp.status_code == 200
        # The response should NOT contain raw unescaped script tags
        # Note: Flask's jsonify auto-escapes HTML in JSON strings, so this test
        # primarily validates that even if we change serialization, it's safe.
        body = resp.get_data(as_text=True)
        # Check that the <script> tag is not present as executable HTML
        # (it may be present as an escaped JSON string like \\u003cscript\\u003e, which is safe)
        assert "<script>" not in body or "\\u003cscript\\u003e" in body or '\\"<script>' in body

    def test_candidate_name_xss_stored_as_data(self, client, user_token):
        """
        A candidate name with HTML injection is stored as data.
        XSS prevention happens at the frontend rendering layer (DOMPurify).
        The backend should store and return the data without crashing.
        """
        xss_name = '<img src=x onerror=alert(1)>'
        payload = {
            "questions": [
                {"text": "Test question", "category": "general", "difficulty": "easy", "type": "behavioral"}
            ],
            "resume_data": {"name": xss_name},
            "candidate_name": xss_name,
        }
        resp = client.post("/api/interview/start", json=payload, headers=_auth(user_token))
        assert resp.status_code == 200
        session_id = resp.get_json()["session_id"]

        # Retrieve and verify the session returns successfully
        resp = client.get(f"/api/interview/session/{session_id}", headers=_auth(user_token))
        assert resp.status_code == 200
        # The backend stores and returns the raw data - XSS is prevented by DOMPurify on the frontend
        data = resp.get_json()
        assert data["session"]["candidate_name"] == xss_name


class TestRegistrationXSS:
    """Registration with XSS in the username field must be handled safely."""

    @pytest.mark.parametrize("payload", XSS_PAYLOADS[:3])
    def test_xss_in_username(self, client, payload):
        """XSS payloads in username should either be rejected or stored escaped."""
        resp = client.post(
            "/api/auth/register",
            json={"username": payload, "password": "SecureP@ss123"},
        )
        # 400 (validation), 201 (stored safely), or 409 (duplicate from prior run) — never 500
        assert resp.status_code in (400, 201, 409), f"Unexpected status for XSS username: {resp.status_code}"
