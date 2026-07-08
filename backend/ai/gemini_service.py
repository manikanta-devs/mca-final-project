import os
import time
import logging
import json
import re
import requests
from typing import Optional
from ai.local_llm import LocalLLM

logger = logging.getLogger(__name__)


class BaseAIProvider:
    """Base class for all AI providers in the fallback chain"""

    def __init__(self, provider_id: str, api_key: str):
        self.provider_id = provider_id
        self.api_key = api_key

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        raise NotImplementedError("Subclasses must implement generate_content")


class LocalProvider(BaseAIProvider):
    """Local LLM Provider (offline mode)"""

    def __init__(self):
        super().__init__("local", "")
        self.local_llm = LocalLLM()

    def is_available(self) -> bool:
        return bool(self.local_llm and self.local_llm.is_available())

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        try:
            return self.local_llm.generate_content(prompt)
        except Exception as e:
            logger.error(f"Local LLM provider failed: {e}")
            return None


class HFProvider(BaseAIProvider):
    """Hugging Face Inference API Provider"""

    MODEL_URL = (
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1"
    )

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            response = requests.post(
                self.MODEL_URL,
                headers=headers,
                json={"inputs": prompt},
                timeout=5,
            )
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    generated_text = result[0].get("generated_text", "")
                    if generated_text.startswith(prompt):
                        generated_text = generated_text[len(prompt) :].strip()
                    return generated_text
            elif response.status_code == 429:
                logger.warning(f"HF provider {self.provider_id} rate limited (429)")
            else:
                logger.error(
                    f"HF API error {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"HF API call failed for {self.provider_id}: {e}")
        return None


class GeminiProvider(BaseAIProvider):
    """Google Gemini API Provider (Direct HTTP REST implementation to bypass SDK gRPC issues)"""

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        # Try multiple model fallbacks in case of quota or model limitations
        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash"]
        last_err = None
        
        for model_name in models_to_try:
            try:
                logger.info(f"GeminiProvider ({self.provider_id}) trying HTTP REST for model: {model_name}")
                url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=6)
                if response.status_code == 200:
                    data = response.json()
                    if "candidates" in data and len(data["candidates"]) > 0:
                        candidate = data["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            parts = candidate["content"]["parts"]
                            if len(parts) > 0 and "text" in parts[0]:
                                return parts[0]["text"].strip()
                    logger.warning(f"HTTP REST response 200 but failed to parse content: {response.text[:200]}")
                elif response.status_code == 429:
                    err_msg = response.text
                    logger.warning(f"GeminiProvider ({self.provider_id}) hit rate limit/quota for {model_name}. Response: {err_msg[:200]}")
                    last_err = Exception(f"HTTP 429: {err_msg}")
                else:
                    err_text = response.text
                    logger.warning(f"Model {model_name} failed with status {response.status_code}: {err_text[:200]}")
                    last_err = Exception(f"HTTP {response.status_code}: {err_text}")
            except Exception as ex:
                logger.warning(f"Model {model_name} failed on HTTP REST provider {self.provider_id}: {ex}")
                last_err = ex
                
        if last_err:
            logger.error(f"Gemini API HTTP REST failed for all models on {self.provider_id}: {last_err}")
        return None


class GroqProvider(BaseAIProvider):
    """Groq API Provider (OpenAI Compatible)"""

    API_URL = "https://api.groq.com/openai/v1/chat/completions"
    # llama-3.3-70b-versatile has much higher TPM limits than llama-3.1-8b-instant
    # 8b-instant has 6000 TPM on free tier — hits limit on long eval prompts
    MODEL_NAME = "llama-3.3-70b-versatile"

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=5,
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            elif response.status_code == 429:
                logger.warning(f"Groq provider {self.provider_id} rate limited (429)")
            elif response.status_code == 413:
                # Token limit exceeded for this model — flag as size error, not rate error
                logger.warning(f"Groq provider {self.provider_id} token limit exceeded (413) — prompt too large, skipping")
                raise ValueError("PROMPT_TOO_LARGE")
            else:
                logger.error(
                    f"Groq API error {response.status_code}: {response.text[:200]}"
                )
        except ValueError:
            raise  # Re-raise PROMPT_TOO_LARGE so caller can skip cooldown
        except Exception as e:
            logger.error(f"Groq API call failed for {self.provider_id}: {e}")
        return None


class OpenRouterProvider(BaseAIProvider):
    """OpenRouter API Provider (OpenAI Compatible)"""

    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    MODEL_NAME = "google/gemma-4-31b-it:free"

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-interview-system.local",
            "X-Title": "AI Interview System",
        }
        payload = {
            "model": self.MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=8,  # Fail fast — if OpenRouter doesn't respond in 8s, skip it
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            elif response.status_code == 429:
                logger.warning(
                    f"OpenRouter provider {self.provider_id} rate limited (429)"
                )
            else:
                logger.error(
                    f"OpenRouter API error {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"OpenRouter API call failed for {self.provider_id}: {e}")
        return None


class MistralProvider(BaseAIProvider):
    """Mistral API Provider (OpenAI Compatible)"""

    API_URL = "https://api.mistral.ai/v1/chat/completions"
    MODEL_NAME = "open-mistral-7b"

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=6,  # Mistral free tier needs time but fail-fast at 6s
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            elif response.status_code == 429:
                logger.warning(f"Mistral provider {self.provider_id} rate limited (429)")
            else:
                logger.error(
                    f"Mistral API error {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"Mistral API call failed for {self.provider_id}: {e}")
        return None


class DeepSeekProvider(BaseAIProvider):
    """DeepSeek API Provider (OpenAI Compatible)"""

    API_URL = "https://api.deepseek.com/chat/completions"
    MODEL_NAME = "deepseek-chat"

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=10,
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            elif response.status_code == 429:
                logger.warning(f"DeepSeek provider {self.provider_id} rate limited (429)")
            else:
                logger.error(
                    f"DeepSeek API error {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"DeepSeek API call failed for {self.provider_id}: {e}")
        return None


class GeminiService:
    """Unified AI service wrapper implementing key rotation and multi-provider fallbacks"""

    MODEL_NAME = "multi-provider-fallback"
    MAX_RETRIES = 3
    RETRY_DELAY = 2

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(GeminiService, cls).__new__(cls, *args, **kwargs)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "initialized", False):
            return
        self.providers = []
        self.cooldowns = {}
        self._initialize_providers()
        self.initialized = True

    def _initialize_providers(self):
        # 1. Local LLM Provider if enabled in config
        try:
            try:
                from backend.config import get_config
            except ImportError:
                from config import get_config

            config = get_config()
            if config.LOCAL_LLM_ENABLED:
                self.providers.append(LocalProvider())
                logger.info("✓ Local LLM Provider added to fallback chain")
        except Exception as e:
            logger.warning(f"Could not load LOCAL_LLM_ENABLED config: {e}")

        # 2. Check and alternate keys (index 1 to 10)
        # Order: Gemini first, DeepSeek next, then Groq, OpenRouter, Mistral, HF last
        provider_types = [
            ("gemini", GeminiProvider, ["GEMINI_API_KEY", "GEMINI_API_KEY_1"]),
            ("deepseek", DeepSeekProvider, ["DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY_1"]),
            ("groq", GroqProvider, ["GROQ_API_KEY", "GROQ_API_KEY_1"]),
            ("openrouter", OpenRouterProvider, ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY_1"]),
            ("mistral", MistralProvider, ["MISTRAL_API_KEY", "MISTRAL_API_KEY_1"]),
            ("hf", HFProvider, ["HUGGINGFACE_API_KEY", "HUGGINGFACE_API_KEY_1"]),
        ]

        added_keys = set()

        # Add index 1 keys (treating primary unnumbered variable names as index 1)
        for prov_name, prov_class, env_vars in provider_types:
            key_val = None
            for var in env_vars:
                val = os.getenv(var, "").strip()
                if val:
                    key_val = val
                    break
            if key_val and key_val not in added_keys:
                self.providers.append(prov_class(f"{prov_name}_1", key_val))
                added_keys.add(key_val)
                logger.info(f"✓ Provider {prov_name}_1 added to fallback chain")

        # Add index 2 to 10 keys
        for i in range(2, 11):
            for prov_name, prov_class, _ in provider_types:
                var_name = f"{prov_name.upper()}_API_KEY_{i}"
                if prov_name == "hf":
                    var_name = f"HUGGINGFACE_API_KEY_{i}"
                val = os.getenv(var_name, "").strip()
                if val and val not in added_keys:
                    self.providers.append(prov_class(f"{prov_name}_{i}", val))
                    added_keys.add(val)
                    logger.info(f"✓ Provider {prov_name}_{i} added to fallback chain")

    def is_available(self) -> bool:
        """Check if any AI provider is configured and available"""
        return any(p.is_available() for p in self.providers)

    def provider_status(self) -> dict:
        """Return a UI-friendly provider status without exposing keys."""
        available_providers = [p for p in self.providers if p.is_available()]

        # Filter out those on cooldown
        now = time.time()
        healthy_providers = [
            p for p in available_providers if now >= self.cooldowns.get(p.provider_id, 0)
        ]

        active_provider = "No provider available"
        mode = "offline-fallback"

        if healthy_providers:
            active_p = healthy_providers[0]
            active_provider = f"{active_p.provider_id.upper()} (Active)"
            if isinstance(active_p, LocalProvider):
                mode = "local"
            elif isinstance(active_p, HFProvider):
                mode = "free-api"
            else:
                mode = "cloud-api"
        elif available_providers:
            # All available are on cooldown
            active_p = available_providers[0]
            active_provider = f"{active_p.provider_id.upper()} (All on Cooldown)"
            mode = "cooling-down"

        return {
            "active_provider": active_provider,
            "mode": mode,
            "local_available": any(
                isinstance(p, LocalProvider) and p.is_available() for p in self.providers
            ),
            "huggingface_configured": any(
                isinstance(p, HFProvider) and p.is_available() for p in self.providers
            ),
            "gemini_configured": any(
                isinstance(p, GeminiProvider) and p.is_available() for p in self.providers
            ),
            "fallback_available": len(available_providers) > 1,
            "cost_note": f"Fallback chain active with {len(available_providers)} configured providers.",
        }

    def generate_content(self, prompt: str, temperature: float = 0.7, max_tokens: int = 1024) -> Optional[str]:
        """Generate content - tries providers in order, skipping cooldowns"""
        available_providers = [p for p in self.providers if p.is_available()]
        if not available_providers:
            logger.warning("No AI provider available, returning None")
            return None

        # Filter out cooled down providers
        now = time.time()
        active_providers = [
            p for p in available_providers if now >= self.cooldowns.get(p.provider_id, 0)
        ]

        # If all providers are on cooldown, return None immediately — use fallback data
        # DO NOT retry them — they are failing and will waste time
        if not active_providers:
            logger.warning("All AI providers are on cooldown. Returning None immediately for fast fallback.")
            return None

        # Max attempts to make: try each active provider once
        max_attempts = len(active_providers)
        consecutive_failures = 0

        for attempt in range(max_attempts):
            provider = active_providers[attempt]
            try:
                logger.info(f"Attempting content generation using provider: {provider.provider_id}")
                start_time = time.time()
                result = provider.generate_content(prompt, temperature=temperature, max_tokens=max_tokens)

                if result:
                    elapsed = round(time.time() - start_time, 2)
                    logger.info(f"✓ Provider {provider.provider_id} succeeded in {elapsed}s")
                    return result

                # If result is empty, log it and trigger cooldown
                logger.warning(
                    f"Provider {provider.provider_id} returned empty result. Triggering cooldown."
                )
                self.cooldowns[provider.provider_id] = time.time() + 300
                consecutive_failures += 1

            except ValueError as ve:
                err_msg = str(ve).lower()
                cooldown_dur = 300 if any(k in err_msg for k in ["429", "quota", "limit", "timeout", "dns", "nameresolutionerror"]) else 15
                if str(ve) == "PROMPT_TOO_LARGE":
                    logger.warning(f"Provider {provider.provider_id} skipped (prompt too large) — no cooldown")
                else:
                    logger.error(f"Provider {provider.provider_id} failed with ValueError: {ve}. Triggering cooldown for {cooldown_dur}s.")
                    self.cooldowns[provider.provider_id] = time.time() + cooldown_dur
                    consecutive_failures += 1
            except Exception as e:
                err_msg = str(e).lower()
                cooldown_dur = 300 if any(k in err_msg for k in ["429", "quota", "limit", "timeout", "dns", "nameresolutionerror"]) else 15
                logger.error(
                    f"Provider {provider.provider_id} failed with error: {e}. Triggering cooldown for {cooldown_dur}s."
                )
                self.cooldowns[provider.provider_id] = time.time() + cooldown_dur
                consecutive_failures += 1

            if consecutive_failures >= 2:
                logger.warning("Multiple consecutive provider failures. Aborting chain to fail fast.")
                # Temporarily put other untried providers on cooldown so next requests fail fast too
                for p in active_providers[attempt + 1:]:
                    self.cooldowns[p.provider_id] = time.time() + 180
                break

        logger.error("All available AI providers in the chain failed to generate content.")
        return None

    def generate_json(self, prompt: str) -> Optional[dict]:
        """Generate JSON response from fallback provider with multi-strategy parsing"""
        json_prompt = f"""{prompt}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation.
Just the raw JSON object or array."""

        response = self.generate_content(json_prompt, temperature=0.3, max_tokens=1536)
        if not response:
            return None

        # Strategy 1: Try parsing raw response directly
        try:
            return json.loads(response.strip())
        except json.JSONDecodeError:
            pass

        # Strategy 2: Strip markdown code fences
        cleaned = response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first line (```json or ```) and last line (```)
            if len(lines) >= 3:
                cleaned = "\n".join(lines[1:-1])
            else:
                cleaned = "\n".join(lines[1:])
        cleaned = cleaned.strip("`").strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Strategy 3: Regex extract JSON object or array (DOTALL to capture multi-line JSON)
        json_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        logger.error(
            f"All JSON parse strategies failed. Response preview: {response[:300]}"
        )
        return None
