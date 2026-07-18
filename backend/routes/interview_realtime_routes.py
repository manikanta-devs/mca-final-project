# backend/routes/interview_realtime_routes.py

import os
import subprocess
import tempfile
import time
import logging
import hashlib
from functools import wraps
from flask import Blueprint, request, jsonify, send_file
from utils.auth_utils import token_required

logger = logging.getLogger(__name__)
realtime_bp = Blueprint("interview_realtime", __name__)

FILLER_WORDS = {"um", "uh", "like", "you know", "sort of", "kind of", "basically"}

# Thread-safe in-memory cache for Piper TTS fallback
import threading
_tts_cache = {}
_tts_cache_lock = threading.Lock()  # real lock — not a fake boolean

def simple_ttl_cache(seconds=60):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            payload = request.get_json(silent=True) or {}
            text = (payload.get("text") or "").strip()
            if not text:
                return f(*args, **kwargs)
            
            now = time.time()
            if text in _tts_cache:
                cached_res, expiry = _tts_cache[text]
                if now < expiry and os.path.exists(cached_res):
                    logger.info(f"Serving cached TTS fallback audio for text: {text[:30]}...")
                    return send_file(cached_res, mimetype="audio/wav")
            
            # Call underlying handler
            res = f(*args, **kwargs)
            return res
        return decorated
    return decorator

# Lazily imported faster-whisper model
_whisper_model = None

def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Initializing faster-whisper base.en model on CPU...")
            # Use CPU & int8 for low footprint local CPU execution
            _whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8")
        except Exception as exc:
            logger.warning(f"Unable to initialize faster-whisper: {exc}")
            raise RuntimeError(f"faster-whisper unavailable: {exc}") from exc
    return _whisper_model


@realtime_bp.route("/interview/transcribe", methods=["POST"])
@token_required
def transcribe_chunk():
    """
    Accepts a rolling audio chunk (webm/opus), transcribes it, and returns WPM and filler word metrics.
    If faster-whisper is not installed/loaded, returns whisper_available: false for client-side fallback.
    """
    audio_file = request.files.get("audio")
    session_id = request.form.get("session_id")

    # Validate and safely convert duration_seconds early
    try:
        duration_seconds = float(request.form.get("duration_seconds", 0) or 0)
    except (ValueError, TypeError):
        duration_seconds = 0.0

    if not audio_file or not session_id:
        return jsonify({"error": "audio file and session_id are required"}), 400

    try:
        model = _get_whisper_model()
    except Exception as e:
        logger.warning(f"Whisper fallback triggered: {e}")
        return jsonify({
            "whisper_available": False,
            "transcript": None,
            "wpm": None,
            "filler_count": None,
            "filler_words": [],
            "filler_per_min": None
        }), 200

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        segments, _info = model.transcribe(tmp_path, beam_size=1)
        words = []
        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text.strip())
            words.extend(segment.text.strip().lower().split())

        transcript = " ".join(transcript_parts).strip()
        wpm = round((len(words) / duration_seconds) * 60, 1) if duration_seconds > 0 else 0.0

        found_fillers = [w.strip(".,!?") for w in words if w.strip(".,!?") in FILLER_WORDS]
        filler_per_min = (
            round((len(found_fillers) / duration_seconds) * 60, 2)
            if duration_seconds > 0 else 0.0
        )

        logger.info(f"[Realtime STT] Session {session_id} - WPM: {wpm}, Fillers: {len(found_fillers)}")

        return jsonify({
            "whisper_available": True,
            "transcript": transcript,
            "wpm": wpm,
            "filler_count": len(found_fillers),
            "filler_words": found_fillers,
            "filler_per_min": filler_per_min,
        }), 200
    except Exception as e:
        logger.error(f"Transcribe failure: {e}")
        return jsonify({"error": f"Transcription error: {str(e)}"}), 500
    finally:
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except Exception:
            pass


@realtime_bp.route("/interview/tts-fallback", methods=["POST"])
@token_required
@simple_ttl_cache(seconds=60)
def tts_fallback():
    """
    Offline TTS via Piper when the primary Gemini/paid API key is missing or limited.
    Expects { text: string }. Returns a .wav file.
    """
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 2000:
        return jsonify({"error": "text too long for fallback TTS"}), 400

    piper_bin = os.environ.get("PIPER_BIN", "piper")
    voice_model = os.environ.get("PIPER_VOICE", "en_US-lessac-medium.onnx")

    # Store TTS output in a persistent data directory, not OS temp (which may be cleaned by OS)
    tts_dir = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "data", "tts_cache"
    ))
    os.makedirs(tts_dir, exist_ok=True)
    out_path = os.path.join(tts_dir, f"piper_{int(time.time() * 1000)}.wav")

    try:
        proc = subprocess.run(
            [piper_bin, "--model", voice_model, "--output_file", out_path],
            input=text.encode("utf-8"),
            capture_output=True,
            timeout=15,
        )
        if proc.returncode != 0 or not os.path.exists(out_path):
            return jsonify({
                "error": "Piper TTS failed to generate audio",
                "detail": proc.stderr.decode("utf-8", errors="ignore")[:500],
            }), 502

        # Cache successful output path under a real threading lock
        with _tts_cache_lock:
            _tts_cache[text] = (out_path, time.time() + 60)

        logger.info(f"[Realtime TTS] Offline Piper TTS generated sound for: '{text[:40]}...'")
        return send_file(out_path, mimetype="audio/wav")
    except FileNotFoundError:
        logger.warning("Piper binary not found on local path. Triggering browser local speech synthesis fallback.")
        return jsonify({"error": "Piper TTS not installed on server"}), 503
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Piper TTS timed out"}), 504


@realtime_bp.route("/interview/lip-sync/status", methods=["POST"])
@token_required
def lip_sync_status():
    """
    Returns the deterministic URL for a generated Wav2Lip clip when it exists.
    Generation is intentionally a separate offline/background step so the live
    interview can always fall back to reusable talking clips plus TTS.
    """
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    persona = (payload.get("persona") or "sarah").strip().lower()

    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 2000:
        return jsonify({"error": "text too long for lip-sync lookup"}), 400

    safe_persona = "marcus" if persona == "marcus" else "sarah"
    digest = hashlib.sha256(f"{safe_persona}:{text}".encode("utf-8")).hexdigest()[:20]
    filename = f"{safe_persona}_{digest}.mp4"

    default_dir = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "frontend",
            "public",
            "interviewers",
            "generated_lipsync",
        )
    )
    output_dir = os.path.abspath(os.environ.get("LIPSYNC_OUTPUT_DIR", default_dir))
    os.makedirs(output_dir, exist_ok=True)

    clip_path = os.path.join(output_dir, filename)
    public_base = os.environ.get("LIPSYNC_PUBLIC_BASE", "/interviewers/generated_lipsync").rstrip("/")

    return jsonify({
        "ready": os.path.exists(clip_path),
        "persona": safe_persona,
        "clip_id": digest,
        "filename": filename,
        "video_url": f"{public_base}/{filename}",
        # output_path intentionally omitted — do not leak server filesystem paths to clients
    }), 200