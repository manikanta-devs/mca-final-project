"""Tests for configuration module."""

import os
import sys


def setup_path():
    """Setup sys.path for imports."""
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if root not in sys.path:
        sys.path.insert(0, root)
    backend_path = os.path.join(root, "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)


def test_config_development(monkeypatch):
    """Test development configuration."""
    setup_path()
    monkeypatch.delenv("RATE_LIMIT_ENABLED", raising=False)
    
    import sys
    import importlib
    if "backend.config" in sys.modules:
        importlib.reload(sys.modules["backend.config"])

    from backend.config import DevelopmentConfig

    config = DevelopmentConfig()
    assert config.DEBUG is True
    assert config.TESTING is False
    assert config.FLASK_ENV == "development"
    assert config.RATE_LIMIT_ENABLED is False


def test_config_production(monkeypatch):
    """Test production configuration."""
    setup_path()
    monkeypatch.delenv("ADMIN_DISABLE_RATE_LIMIT", raising=False)
    
    import sys
    import importlib
    if "backend.config" in sys.modules:
        importlib.reload(sys.modules["backend.config"])

    from backend.config import ProductionConfig

    config = ProductionConfig()
    assert config.DEBUG is False
    assert config.TESTING is False
    assert config.FLASK_ENV == "production"


def test_config_testing():
    """Test testing configuration."""
    setup_path()
    from backend.config import TestingConfig

    config = TestingConfig()
    assert config.DEBUG is True
    assert config.TESTING is True
    assert config.RATE_LIMIT_ENABLED is False


def test_config_defaults():
    """Test configuration defaults."""
    setup_path()
    from backend.config import Config

    config = Config()
    assert config.MAX_CONTENT_LENGTH == 16 * 1024 * 1024
    assert config.UPLOAD_FOLDER == "uploads"
    assert "pdf" in config.ALLOWED_EXTENSIONS
    assert config.RATE_LIMIT_DEFAULT == "200 per day"


def test_get_config_development():
    """Test get_config function returns correct config."""
    setup_path()
    from backend.config import get_config

    os.environ["FLASK_ENV"] = "development"
    config = get_config()
    assert config.DEBUG is True


def test_get_config_production():
    """Test get_config function for production."""
    setup_path()
    from backend.config import get_config

    os.environ["FLASK_ENV"] = "production"
    config = get_config()
    assert config.DEBUG is False
