"""Application configuration module."""

import os


class Config:
    """Base configuration."""

    # Flask
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-prod")

    # File handling
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = "uploads"
    ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

    # API
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174").split(",")

    # Rate limiting
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    RATE_LIMIT_DEFAULT = "200 per day"
    RATE_LIMIT_HOURLY = "50 per hour"

    # AI Services
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    LOCAL_LLM_ENABLED = os.getenv("LOCAL_LLM_ENABLED", "false").lower() == "true"

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    SLOW_REQUEST_THRESHOLD_MS = 2000  # Log requests taking longer than 2s

    # Data persistence
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_FOLDER = os.path.join(BASE_DIR, "data")
    SESSIONS_FILE = os.path.join(DATA_FOLDER, "sessions.json")
    DATABASE_FILE = os.path.join(DATA_FOLDER, "interviews.db")
    QUIZZES_FILE = os.path.join(DATA_FOLDER, "quizzes.json")
    DATABASE_URL = os.getenv("DATABASE_URL", "")


class DevelopmentConfig(Config):
    """Development configuration."""

    FLASK_ENV = "development"
    DEBUG = True
    TESTING = False
    RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"


class ProductionConfig(Config):
    """Production configuration."""

    FLASK_ENV = "production"
    DEBUG = False
    TESTING = False
    # Hardcode RATE_LIMIT_ENABLED to True in production unless explicitly disabled by admin escape hatch
    RATE_LIMIT_ENABLED = os.getenv("ADMIN_DISABLE_RATE_LIMIT", "false").lower() != "true"
    # Enforce secure cookies in production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


class TestingConfig(Config):
    """Testing configuration."""

    FLASK_ENV = "testing"
    DEBUG = True
    TESTING = True
    RATE_LIMIT_ENABLED = False
    UPLOAD_FOLDER = "tests/uploads"


def get_config() -> Config:
    """Get configuration based on environment."""
    env = os.getenv("FLASK_ENV", "development")

    if env == "production":
        return ProductionConfig()
    elif env == "testing":
        return TestingConfig()
    else:
        return DevelopmentConfig()
