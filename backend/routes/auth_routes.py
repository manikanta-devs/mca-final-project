"""
Authentication routes Blueprint.
Handles /api/auth/register and /api/auth/login.
Extracted from app.py to keep the app factory clean.
"""

import hashlib
import logging

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

RESERVED_USERNAMES = {
    "candidate", "admin", "administrator", "anonymous",
    "null", "system", "root",
}


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Supports both modern Werkzeug hashes and legacy SHA-256 fallback."""
    if (
        ":" in hashed_password
        and not hashed_password.startswith("scrypt:")
        and not hashed_password.startswith("pbkdf2:")
    ):
        # Legacy SHA-256 fallback for backward compatibility
        try:
            salt, pwd_hash = hashed_password.split(":")
            legacy_hash = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
            return f"{salt}:{legacy_hash}" == hashed_password
        except ValueError:
            return False
    return check_password_hash(hashed_password, password)


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")  # NEVER strip passwords

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if username.lower() in RESERVED_USERNAMES:
        return jsonify({"error": "This username is reserved and cannot be used."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    from services.database import create_user
    pwd_hash = hash_password(password)
    success = create_user(username, pwd_hash)
    if not success:
        return jsonify({"error": "Username already exists"}), 409

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    from flask import current_app
    from services.database import get_user
    from utils.auth_utils import sign_token

    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")  # NEVER strip passwords

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = get_user(username)
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid username or password"}), 401

    secret = current_app.config.get("SECRET_KEY")
    _weak = {"dev-secret-key-change-in-prod", "dev-secret-key-change-in-prod-secure-128bits-key", ""}
    if not secret or secret in _weak:
        logger.warning("SECURITY WARNING: Using a weak or default SECRET_KEY for token signing.")
        secret = secret or "dev-secret-key-change-in-prod-secure-128bits-key"

    token = sign_token({"username": username}, secret=secret)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {"username": username},
    }), 200
