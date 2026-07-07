import os
import sys
import requests
import json

# Setup path for imports
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root not in sys.path:
    sys.path.insert(0, root)
backend_path = os.path.join(root, "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import dotenv
dotenv.load_dotenv(os.path.join(backend_path, ".env"))

def test_gemini():
    print("----------------------------------------")
    print("Testing GEMINI_API_KEY ...")
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("  [SKIP] GEMINI_API_KEY is not configured.")
        return False
    
    models_to_try = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash"]
    last_err = None
    
    for model_name in models_to_try:
        try:
            import google.generativeai as genai
            genai.configure(api_key=key)
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                "Say hello in one word",
                generation_config=genai.types.GenerationConfig(max_output_tokens=10),
                request_options={"timeout": 8}
            )
            
            try:
                text = response.text.strip()
                print(f"  [SUCCESS] Gemini returned: '{text}' (using model {model_name})")
                return True
            except ValueError as val_err:
                if "Quick accessor" in str(val_err) or "finish_reason" in str(val_err) or "Part" in str(val_err):
                    print(f"  [SUCCESS] Gemini API key is valid (using model {model_name}), but output was blocked by safety filters.")
                    return True
                raise val_err
            except Exception as e:
                if hasattr(response, "candidates") and len(response.candidates) > 0:
                    cand = response.candidates[0]
                    if hasattr(cand, "finish_reason") and (cand.finish_reason == 2 or cand.finish_reason == "SAFETY"):
                        print(f"  [SUCCESS] Gemini API key is valid (using model {model_name}), but response was blocked by safety filters.")
                        return True
                raise e
        except Exception as e:
            print(f"  [INFO] Gemini model {model_name} failed: {e}")
            last_err = e
            
    print(f"  [FAILED] Gemini error: {last_err}")
    return False

def test_huggingface():
    print("----------------------------------------")
    print("Testing HUGGINGFACE_API_KEY ...")
    key = os.getenv("HUGGINGFACE_API_KEY")
    if not key:
        print("  [SKIP] HUGGINGFACE_API_KEY is not configured.")
        return False
    url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1"
    headers = {"Authorization": f"Bearer {key}"}
    try:
        response = requests.post(url, headers=headers, json={"inputs": "Say hello in one word"}, timeout=10)
        if response.status_code == 200:
            print(f"  [SUCCESS] Hugging Face returned: {response.json()[:100]}")
            return True
        else:
            print(f"  [FAILED] Hugging Face returned status code {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  [INFO] Hugging Face inference domain error: {e}")
        print("  Attempting fallback token check via huggingface.co API...")
        try:
            whoami_url = "https://huggingface.co/api/whoami-v2"
            res = requests.get(whoami_url, headers=headers, timeout=10)
            if res.status_code == 200:
                user_info = res.json()
                print(f"  [SUCCESS] Hugging Face API key is valid (verified via whoami endpoint as user: {user_info.get('name')}), though api-inference.huggingface.co is blocked/unresolved.")
                return True
            else:
                print(f"  [FAILED] Hugging Face whoami check returned status {res.status_code}: {res.text[:200]}")
                return False
        except Exception as ex:
            print(f"  [FAILED] Hugging Face fallback check also failed: {ex}")
            return False

def test_groq():
    print("----------------------------------------")
    print("Testing GROQ_API_KEY ...")
    key = os.getenv("GROQ_API_KEY")
    if not key:
        print("  [SKIP] GROQ_API_KEY is not configured.")
        return False
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": "Say hello in one word"}],
        "temperature": 0.7
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"].strip()
            print(f"  [SUCCESS] Groq returned: '{content}'")
            return True
        else:
            print(f"  [FAILED] Groq returned status code {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  [FAILED] Groq error: {e}")
        return False

def test_openrouter():
    print("----------------------------------------")
    print("Testing OPENROUTER_API_KEY ...")
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        print("  [SKIP] OPENROUTER_API_KEY is not configured.")
        return False
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-interview-system.local",
        "X-Title": "AI Interview System"
    }
    payload = {
        "model": "google/gemma-4-31b-it:free",
        "messages": [{"role": "user", "content": "Say hello in one word"}],
        "temperature": 0.7
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"].strip()
            print(f"  [SUCCESS] OpenRouter returned: '{content}'")
            return True
        else:
            print(f"  [FAILED] OpenRouter returned status code {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  [FAILED] OpenRouter error: {e}")
        return False

def test_mistral():
    print("----------------------------------------")
    print("Testing MISTRAL_API_KEY ...")
    key = os.getenv("MISTRAL_API_KEY")
    if not key:
        print("  [SKIP] MISTRAL_API_KEY is not configured.")
        return False
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "open-mistral-7b",
        "messages": [{"role": "user", "content": "Say hello in one word"}],
        "temperature": 0.7
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"].strip()
            print(f"  [SUCCESS] Mistral returned: '{content}'")
            return True
        else:
            print(f"  [FAILED] Mistral returned status code {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  [FAILED] Mistral error: {e}")
        return False

if __name__ == "__main__":
    print("=== STARTING KEY VALIDATION RUN ===")
    test_gemini()
    test_huggingface()
    test_groq()
    test_openrouter()
    test_mistral()
    print("=== KEY VALIDATION COMPLETE ===")
