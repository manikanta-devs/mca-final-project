import os
import time
import logging
import json
import re
import requests
from typing import Optional

logger = logging.getLogger(__name__)


class HuggingFaceAPI:
    """Hugging Face Inference API wrapper - preferred over Gemini"""
    
    MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1"
    MAX_RETRIES = 3
    RETRY_DELAY = 2
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def is_available(self) -> bool:
        """Quick connectivity check"""
        try:
            response = requests.head(self.MODEL_URL, headers=self.headers, timeout=5)
            return response.status_code in [200, 403, 429]  # 403/429 = rate limited but working
        except:
            return False
    
    def generate_content(self, prompt: str) -> Optional[str]:
        """Generate text using Hugging Face API"""
        for attempt in range(self.MAX_RETRIES):
            try:
                response = requests.post(
                    self.MODEL_URL,
                    headers=self.headers,
                    json={"inputs": prompt},
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 0:
                        generated_text = result[0].get("generated_text", "")
                        # Remove the prompt from the response (HF includes it)
                        if generated_text.startswith(prompt):
                            generated_text = generated_text[len(prompt):].strip()
                        logger.info(f"HF response in attempt {attempt + 1}")
                        return generated_text
                elif response.status_code == 429:  # Rate limited
                    logger.warning(f"HF rate limited, retrying... (attempt {attempt + 1})")
                    time.sleep(self.RETRY_DELAY * (attempt + 1))
                else:
                    logger.error(f"HF API error {response.status_code}: {response.text[:200]}")
            except Exception as e:
                logger.error(f"HF API attempt {attempt + 1}/{self.MAX_RETRIES} failed: {e}")
            
            if attempt < self.MAX_RETRIES - 1:
                time.sleep(self.RETRY_DELAY * (attempt + 1))
        
        return None


class GeminiService:
    """Wrapper around Google Gemini AI API with retry logic and robust JSON parsing"""

    MODEL_NAME = "gemini-2.0-flash"
    MAX_RETRIES = 3
    RETRY_DELAY = 2

    def __init__(self):
        self.hf_api = None
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.client = None
        self._initialize_hf()
        self._initialize()

    def _initialize_hf(self):
        """Initialize Hugging Face API if key is available"""
        hf_key = os.getenv('HUGGINGFACE_API_KEY')
        if hf_key:
            self.hf_api = HuggingFaceAPI(hf_key)
            if self.hf_api.is_available():
                logger.info("✓ Hugging Face API initialized (PRIMARY)")
            else:
                logger.warning("Hugging Face API key set but connectivity check failed")
        else:
            logger.info("HUGGINGFACE_API_KEY not set. Get free key at: https://huggingface.co/settings/tokens")

    def _initialize(self):
        """Initialize Gemini client as fallback"""
        if not self.api_key:
            if not self.hf_api:
                logger.warning("No API keys set. AI features will use fallback mode.")
                logger.info("Recommended: Get Hugging Face key at https://huggingface.co/settings/tokens")
                logger.info("Fallback: Get Gemini key at https://aistudio.google.com/app/apikey")
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel(self.MODEL_NAME)
            logger.info(f"✓ Gemini AI initialized with model: {self.MODEL_NAME} (FALLBACK)")
        except ImportError:
            logger.error("google-generativeai package not installed. Run: pip install google-generativeai")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")

    def is_available(self) -> bool:
        """Check if any AI API is available"""
        # Prefer HF if available, fallback to Gemini
        if self.hf_api is not None:
            return True  # HF is preferred
        return self.client is not None and self.api_key is not None

    def generate_content(self, prompt: str, temperature: float = 0.7) -> Optional[str]:
        """Generate content - tries HF first, then Gemini, then fails gracefully"""
        if not self.is_available():
            logger.warning("No API available, returning None")
            return None

        # Try Hugging Face first
        if self.hf_api is not None:
            result = self.hf_api.generate_content(prompt)
            if result:
                return result
            logger.warning("Hugging Face failed, trying Gemini...")
        
        # Fallback to Gemini
        if self.client is None:
            return None
            
        for attempt in range(self.MAX_RETRIES):
            try:
                start_time = time.time()
                import google.generativeai as genai
                generation_config = genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=4096,
                )
                response = self.client.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                elapsed = round(time.time() - start_time, 2)
                logger.info(f"Gemini response in {elapsed}s (attempt {attempt + 1})")
                return response.text.strip()

            except Exception as e:
                logger.error(f"Gemini API attempt {attempt + 1}/{self.MAX_RETRIES} failed: {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY * (attempt + 1))
                else:
                    logger.error("All Gemini API attempts failed")
                    return None

    def generate_json(self, prompt: str) -> Optional[dict]:
        """Generate JSON response from Gemini with multi-strategy parsing"""
        json_prompt = f"""{prompt}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation.
Just the raw JSON object or array."""

        response = self.generate_content(json_prompt, temperature=0.3)
        if not response:
            return None

        # Strategy 1: Try parsing raw response directly
        try:
            return json.loads(response.strip())
        except json.JSONDecodeError:
            pass

        # Strategy 2: Strip markdown code fences
        cleaned = response.strip()
        if cleaned.startswith('```'):
            lines = cleaned.split('\n')
            # Remove first line (```json or ```) and last line (```)
            if len(lines) >= 3:
                cleaned = '\n'.join(lines[1:-1])
            else:
                cleaned = '\n'.join(lines[1:])
        cleaned = cleaned.strip('`').strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Strategy 3: Regex extract JSON object or array
        json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        logger.error(f"All JSON parse strategies failed. Response preview: {response[:300]}")
        return None
