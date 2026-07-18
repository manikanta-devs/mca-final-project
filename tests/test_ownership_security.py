"""
test_ownership_security.py
--------------------------
Verifies that IDOR/ownership checks on interview and analytics endpoints
reject cross-user access, and that the reserved-username blocklist works.
"""

import os
import sys
import json
import uuid
import pytest

# Ensure backend directory is in sys.path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND = os.path.join(ROOT, "backend")
for p in (ROOT, BACKEND):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app import create_app


# ─── Helpers ────────────────────────────────────────────────────────────────


def _register_and_login(client, username, password="SecureP@ss123"):
    """Register + login a user, return the JWT token string."""
    client.post("/api/auth/register", json={"username": username, "password": password})
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, f"Login failed for {username}: {resp.data}"
    return resp.get_json()["token"]


def _auth(token):
    """Return headers dict with Bearer token."""
    return {"Authorization": f"Bearer {token}"}


def _start_session(client, token, candidate_name="Alice"):
    """Start an interview session and return the session_id."""
    payload = {
        "questions": [
            {"text": "Tell me about yourself", "category": "general", "difficulty": "easy", "type": "behavioral"}
        ],
        "resume_data": {"name": candidate_name},
        "candidate_name": candidate_name,
    }
    resp = client.post("/api/interview/start", json=payload, headers=_auth(token))
    assert resp.status_code == 200, f"Start session failed: {resp.data}"
    return resp.get_json()["session_id"]


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
def alice(client):
    """User A — owns the session."""
    uid = uuid.uuid4().hex[:8]
    return _register_and_login(client, f"alice_{uid}")


@pytest.fixture(scope="module")
def bob(client):
    """User B — the attacker."""
    uid = uuid.uuid4().hex[:8]
    return _register_and_login(client, f"bob_{uid}")


@pytest.fixture(scope="module")
def alice_session(client, alice):
    """A session that belongs to alice."""
    return _start_session(client, alice, "Alice")


# ─── Tests ──────────────────────────────────────────────────────────────────


class TestOwnershipIDOR:
    """Cross-user access to session endpoints must return 403."""

    def test_get_session_owner_ok(self, client, alice, alice_session):
        """Owner can fetch their own session."""
        resp = client.get(f"/api/interview/session/{alice_session}", headers=_auth(alice))
        assert resp.status_code == 200

    def test_get_session_cross_user_forbidden(self, client, bob, alice_session):
        """Non-owner must receive 403."""
        resp = client.get(f"/api/interview/session/{alice_session}", headers=_auth(bob))
        assert resp.status_code == 403

    def test_delete_session_cross_user_forbidden(self, client, bob, alice_session):
        """Non-owner cannot delete another user's session."""
        resp = client.delete(f"/api/interview/session/{alice_session}", headers=_auth(bob))
        assert resp.status_code == 403

    def test_submit_answer_cross_user_forbidden(self, client, bob, alice_session):
        """Non-owner cannot submit answers to another user's session."""
        resp = client.post(
            "/api/interview/answer",
            json={"session_id": alice_session, "answer": "My answer", "question_index": 0},
            headers=_auth(bob),
        )
        assert resp.status_code == 403

    def test_complete_interview_cross_user_forbidden(self, client, bob, alice_session):
        """Non-owner cannot complete another user's interview."""
        resp = client.post(
            "/api/interview/complete",
            json={"session_id": alice_session},
            headers=_auth(bob),
        )
        assert resp.status_code == 403

    def test_generate_follow_up_cross_user_forbidden(self, client, bob, alice_session):
        """Non-owner cannot generate follow-up for another user's session."""
        resp = client.post(
            "/api/interview/follow-up",
            json={"session_id": alice_session, "answer": "test", "question": {"text": "test"}},
            headers=_auth(bob),
        )
        assert resp.status_code == 403

    def test_analytics_session_cross_user_forbidden(self, client, bob, alice_session):
        """Non-owner cannot access analytics for another user's session."""
        resp = client.get(f"/api/analytics/session/{alice_session}", headers=_auth(bob))
        assert resp.status_code == 403

    def test_nonexistent_session_returns_404(self, client, alice):
        """Fetching a session that doesn't exist returns 404, not 500."""
        resp = client.get("/api/interview/session/does-not-exist", headers=_auth(alice))
        assert resp.status_code == 404


class TestReservedUsernames:
    """Registration with reserved usernames must be blocked."""

    RESERVED = ["candidate", "admin", "administrator", "anonymous", "null", "system", "root"]

    @pytest.mark.parametrize("name", RESERVED)
    def test_reserved_username_rejected(self, client, name):
        unique_name = f"{name}"  # exact reserved name
        resp = client.post(
            "/api/auth/register",
            json={"username": unique_name, "password": "SecureP@ss123"},
        )
        assert resp.status_code == 400, f"Reserved name '{name}' was not rejected"
        assert "reserved" in resp.get_json().get("error", "").lower()

    @pytest.mark.parametrize("name", ["Admin", "CANDIDATE", "Root"])
    def test_reserved_username_case_insensitive(self, client, name):
        """Case-insensitive match: 'Admin' should be rejected like 'admin'."""
        resp = client.post(
            "/api/auth/register",
            json={"username": name, "password": "SecureP@ss123"},
        )
        assert resp.status_code == 400, f"Case-variant '{name}' was not rejected"


class TestBackupEndpoint:
    """The /backup endpoint must require authentication and admin role."""

    def test_backup_unauthenticated_rejected(self, client):
        """No token → should be rejected (401 or 403)."""
        resp = client.post("/backup")
        # In test environment, PYTEST_CURRENT_TEST allows tokenless access
        # but sets username to 'Candidate', which fails the admin check (403).
        # In production, no token → 401.
        assert resp.status_code in (401, 403)

    def test_backup_non_admin_rejected(self, client, alice):
        """Normal user → 403."""
        resp = client.post("/backup", headers=_auth(alice))
        assert resp.status_code == 403
