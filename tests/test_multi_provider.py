import os
import sys
import time
from unittest.mock import MagicMock, patch
import pytest

# Setup path for imports
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root not in sys.path:
    sys.path.insert(0, root)
backend_path = os.path.join(root, "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.ai.gemini_service import (
    GeminiService,
    GeminiProvider,
    HFProvider,
    GroqProvider,
    OpenRouterProvider,
    MistralProvider,
    LocalProvider
)

@pytest.fixture
def clean_env():
    """Temporarily clear standard provider API keys from environment and restore it completely afterward."""
    # Reset the singleton instance of GeminiService to force re-initialization
    GeminiService._instance = None
    
    old_environ = dict(os.environ)
    prefixes = [
        "GEMINI_API_KEY", "HUGGINGFACE_API_KEY", "GROQ_API_KEY",
        "OPENROUTER_API_KEY", "MISTRAL_API_KEY", "DEEPSEEK_API_KEY",
        "LOCAL_LLM_"
    ]
    for key in list(os.environ.keys()):
        matched = False
        for prefix in prefixes:
            if key == prefix or key.startswith(prefix + "_"):
                matched = True
                break
        if key == "LOCAL_LLM_ENABLED":
            matched = True
        if matched:
            del os.environ[key]
    yield
    os.environ.clear()
    os.environ.update(old_environ)
    # Reset singleton again after test to clean up
    GeminiService._instance = None

def test_initialize_providers_order(clean_env):
    """Test that providers are loaded in the correct alternating order."""
    os.environ["GEMINI_API_KEY"] = "gemini_key_a"
    os.environ["HUGGINGFACE_API_KEY"] = "hf_key_a"
    os.environ["GROQ_API_KEY"] = "groq_key_a"
    os.environ["OPENROUTER_API_KEY"] = "or_key_a"
    os.environ["MISTRAL_API_KEY"] = "mistral_key_a"
    
    os.environ["GEMINI_API_KEY_2"] = "gemini_key_b"
    os.environ["HUGGINGFACE_API_KEY_2"] = "hf_key_b"
    
    service = GeminiService()
    
    provider_ids = [p.provider_id for p in service.providers]
    # Gemini first, then Groq, OpenRouter, Mistral, HF, Gemini_2, HF_2
    assert provider_ids == ["gemini_1", "groq_1", "openrouter_1", "mistral_1", "hf_1", "gemini_2", "hf_2"]
    
    assert service.providers[0].api_key == "gemini_key_a"
    assert service.providers[1].api_key == "groq_key_a"
    assert service.providers[2].api_key == "or_key_a"
    assert service.providers[3].api_key == "mistral_key_a"
    assert service.providers[4].api_key == "hf_key_a"
    assert service.providers[5].api_key == "gemini_key_b"
    assert service.providers[6].api_key == "hf_key_b"

@patch('requests.post')
def test_generate_content_fallback_on_failure(mock_post, clean_env):
    """Test that a failure in the first provider cascades to the next provider."""
    # Configure Groq and Mistral
    os.environ["GROQ_API_KEY"] = "groq_secret"
    os.environ["MISTRAL_API_KEY"] = "mistral_secret"
    
    service = GeminiService()
    # Providers should be: groq_1, mistral_1
    assert [p.provider_id for p in service.providers] == ["groq_1", "mistral_1"]
    
    # Mock first provider (Groq) to fail with an exception or return None
    # Mock second provider (Mistral) to succeed
    mock_response_fail = MagicMock()
    mock_response_fail.status_code = 500
    
    mock_response_success = MagicMock()
    mock_response_success.status_code = 200
    mock_response_success.json.return_value = {
        "choices": [{"message": {"content": "Hello from Mistral!"}}]
    }
    
    mock_post.side_effect = [mock_response_fail, mock_response_success]
    
    res = service.generate_content("Hello")
    assert res == "Hello from Mistral!"
    
    # Check that groq_1 is now on cooldown
    assert "groq_1" in service.cooldowns
    assert service.cooldowns["groq_1"] > time.time()

@patch('requests.post')
def test_cooldown_skips_provider(mock_post, clean_env):
    """Test that cooled down providers are skipped, but tried if all are on cooldown."""
    os.environ["GROQ_API_KEY"] = "groq_secret"
    os.environ["MISTRAL_API_KEY"] = "mistral_secret"
    
    service = GeminiService()
    
    # Mock a healthy response for Mistral
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Mistral response"}}]
    }
    mock_post.return_value = mock_resp
    
    # Set Groq on cooldown manually
    service.cooldowns["groq_1"] = time.time() + 60
    
    # Call generate_content
    res = service.generate_content("Hi")
    assert res == "Mistral response"
    
    # Since Groq was on cooldown, mock_post should only be called once (for Mistral)
    assert mock_post.call_count == 1
    
    # Reset mock and put Mistral on cooldown as well
    mock_post.reset_mock()
    service.cooldowns["mistral_1"] = time.time() + 60
    
    # If all are on cooldown, it should return None immediately for fast fallback
    res = service.generate_content("Hi")
    assert res is None
    assert mock_post.call_count == 0
