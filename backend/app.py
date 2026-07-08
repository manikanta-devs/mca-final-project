from flask import Flask, jsonify, request as flask_request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import os
import time
import logging
import json
import hashlib

load_dotenv()

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

env = os.getenv("FLASK_ENV", "development")
if env == "production":
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root_logger = logging.getLogger()
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
else:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file
    app.config["UPLOAD_FOLDER"] = "uploads"
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")
    app.config["ENV"] = os.getenv("FLASK_ENV", "development")

    # Strict key check for 2027 Production deployment
    if app.config["ENV"] == "production":
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key or len(secret_key) < 32 or secret_key in {
            "dev-secret-key-change-in-prod",
            "dev-secret-key-change-in-prod-secure-128bits-key",
            ""
        }:
            raise RuntimeError(
                "CRITICAL SECURITY EXCEPTION: A secure SECRET_KEY environment variable "
                "MUST be configured when running in production mode. Fallback keys are disabled."
            )

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs("data", exist_ok=True)

    from config import get_config
    config_obj = get_config()

    # ─── CORS Configuration ──────────────────────────────────
    allowed_origins = config_obj.ALLOWED_ORIGINS
    CORS(
        app,
        resources={
            r"/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "max_age": 3600,
            }
        },
    )

    # ─── Rate Limiting ──────────────────────────────────────
    limiter = Limiter(  # noqa: F841
        app=app,
        key_func=get_remote_address,
        default_limits=[config_obj.RATE_LIMIT_DEFAULT, config_obj.RATE_LIMIT_HOURLY],
        storage_uri="memory://",
        enabled=config_obj.RATE_LIMIT_ENABLED,
    )

    # ─── Security Headers ───────────────────────────────────
    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        is_prod = app.config.get("ENV") == "production"
        if is_prod:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "media-src 'self' data: blob:; "
                "worker-src 'self' blob: https://cdn.jsdelivr.net; "
                "child-src 'self' blob: https://cdn.jsdelivr.net; "
                "connect-src 'self' https://cdn.jsdelivr.net https:;"
            )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "media-src 'self' data: blob:; "
                "worker-src 'self' blob: https://cdn.jsdelivr.net; "
                "child-src 'self' blob: https://cdn.jsdelivr.net; "
                "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 https://cdn.jsdelivr.net https:;"
            )
        return response

    # ─── Request timing middleware ────────────────────────────
    @app.before_request
    def start_timer():
        flask_request._start_time = time.time()

    @app.after_request
    def log_request(response):
        elapsed = round(
            (time.time() - getattr(flask_request, "_start_time", time.time())) * 1000, 1
        )
        if elapsed > 2000:
            logger.info(
                f"[SLOW] {flask_request.method} {flask_request.path} — {elapsed}ms ({response.status_code})"
            )
        return response

    # ─── Register blueprints ─────────────────────────────────
    from routes.resume_routes import resume_bp
    from routes.interview_routes import interview_bp
    from routes.analytics_routes import analytics_bp
    from routes.quiz_routes import quiz_bp
    from routes.coach_routes import coach_bp

    app.register_blueprint(resume_bp, url_prefix="/api")
    app.register_blueprint(interview_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")
    app.register_blueprint(coach_bp, url_prefix="/api")

    # ─── Auth endpoints ─────────────────────────────────────
    from services.database import create_user, get_user
    from werkzeug.security import generate_password_hash, check_password_hash

    def hash_password(password: str) -> str:
        return generate_password_hash(password)

    def verify_password(password: str, hashed_password: str) -> bool:
        if ":" in hashed_password and not hashed_password.startswith("scrypt:") and not hashed_password.startswith("pbkdf2:"):
            # Legacy SHA-256 fallback for backward compatibility
            try:
                salt, pwd_hash = hashed_password.split(':')
                legacy_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
                return f"{salt}:{legacy_hash}" == hashed_password
            except ValueError:
                return False
        return check_password_hash(hashed_password, password)

    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = flask_request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        pwd_hash = hash_password(password)
        success = create_user(username, pwd_hash)
        if not success:
            return jsonify({"error": "Username already exists"}), 409

        return jsonify({"message": "User registered successfully"}), 201

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        data = flask_request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        user = get_user(username)
        if not user or not verify_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid username or password"}), 401

        from utils.auth_utils import sign_token
        secret = app.config.get("SECRET_KEY", "dev-secret-key-change-in-prod-secure-128bits-key")
        token = sign_token({"username": username}, secret=secret)
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {"username": username}
        }), 200

    # ─── Health endpoint ─────────────────────────────────────
    _health_gemini_service = None

    @app.route("/health")
    def health():
        nonlocal _health_gemini_service
        if _health_gemini_service is None:
            from ai.gemini_service import GeminiService

            _health_gemini_service = GeminiService()

        gemini = _health_gemini_service
        provider = gemini.provider_status()
        return jsonify(
            {
                "status": "ok",
                "message": "AstraPrep AI Backend API",
                "version": "3.1.0",
                "ai_available": gemini.is_available(),
                "ai_model": provider["active_provider"],
                "provider_status": provider,
                "free_stack": [
                    "Browser SpeechRecognition for transcript capture",
                    "MediaRecorder and getUserMedia for mic/camera recording",
                    "Canvas frame sampling for local presence signals",
                    "spaCy/PyPDF2/python-docx resume parsing",
                    "Rule-based fallback question and answer scoring",
                    "Optional Hugging Face free inference token",
                ],
                "features": [
                    "resume-analysis",
                    "ai-interview",
                    "2d-ai-interviewer",
                    "voice-video-capture",
                    "communication-coach",
                    "performance-analytics",
                    "quiz-practice",
                ],
            }
        )

    # ─── Error handlers ──────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        logger.warning(f"Bad request: {e}")
        return jsonify({"error": "Bad request", "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        logger.warning(f"Not found: {flask_request.path}")
        return jsonify({"error": "Endpoint not found", "path": flask_request.path}), 404

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "File too large. Maximum size is 16MB"}), 413

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return (
            jsonify({"error": "Rate limit exceeded", "message": "Too many requests"}),
            429,
        )

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Server error: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled exception: {e}", exc_info=True)
        return (
            jsonify(
                {
                    "error": "Internal server error",
                    "message": (
                        str(e)
                        if app.config["ENV"] == "development"
                        else "An error occurred"
                    ),
                }
            ),
            500,
        )

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    env_mode = os.getenv("FLASK_ENV", "development")
    debug = False
    if env_mode == "development":
        debug = os.getenv("DEBUG", os.getenv("FLASK_DEBUG", "false")).lower() == "true"
    logger.info(f"Starting AstraPrep AI Backend on port {port} (debug={debug})")
    app.run(debug=debug, port=port, host="0.0.0.0", use_reloader=False)
