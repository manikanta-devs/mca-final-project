# backend/routes/video_interview.py

import json
import logging
import re
from flask import Blueprint, request, jsonify
from routes.interview_routes import token_required
from utils.limiter import limiter
from ai.gemini_service import GeminiService
from services.video_interview_prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, FALLBACK_QUESTIONS

logger = logging.getLogger(__name__)
video_interview_bp = Blueprint("video_interview", __name__)
# Module-level singleton — GeminiService uses __new__ singleton pattern
# Do NOT instantiate inside request handlers (wasteful + log spam)
_gemini = GeminiService()

@video_interview_bp.route("/video-interview/next-question", methods=["POST"])
@token_required
@limiter.limit("15 per minute")
def next_question():
    """Generates the next interview question using Gemini based on resume & Q&A history."""
    # Retrieve current username from request context (set by token_required)
    username = getattr(request, "username", "anonymous")
    
    data = request.get_json() or {}
    resume_text = data.get("resume_text", "").strip()
    qa_history = data.get("qa_history", [])
    
    # 1. Fallback check: if resume text is completely missing, use a placeholder or read from DB
    if not resume_text:
        # Try to use a placeholder or fallback
        resume_text = "No resume uploaded. Candidate is interested in General Software Engineering role."

    # 2. Get the current question index to determine fallback index
    current_index = len(qa_history)
    
    # 3. Format Q&A history for the prompt
    formatted_history = []
    for i, qa in enumerate(qa_history):
        formatted_history.append({
            "step": i + 1,
            "question": qa.get("question", ""),
            "answer": qa.get("answer", "")
        })
    qa_history_json = json.dumps(formatted_history, indent=2)
    
    # 4. Compile prompt
    user_prompt = USER_PROMPT_TEMPLATE.format(
        resume_text=resume_text,
        qa_history_json=qa_history_json
    )
    
    # Combine system context and user prompt
    full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
    
    # 5. Call Gemini Service
    raw_response = None
    
    try:
        raw_response = _gemini.generate_content(full_prompt, temperature=0.7, max_tokens=300)
    except Exception as e:
        logger.error(f"Gemini call failed in video_interview/next-question: {e}")
        
    # 6. Parse and clean JSON response
    parsed_question = None
    if raw_response:
        # Clean JSON markdown wrappings if present
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
            cleaned = re.sub(r"\n```$", "", cleaned)
        cleaned = cleaned.strip()
        
        try:
            parsed_question = json.loads(cleaned)
            # Basic validation of keys
            if "question" not in parsed_question:
                parsed_question = None
        except Exception as parse_err:
            logger.warning(f"Failed to parse video interview JSON. Raw: {raw_response}. Error: {parse_err}")
            
    # 7. Fallback to hardcoded list if Gemini failed or returned invalid format
    if not parsed_question:
        logger.info("Using hardcoded fallback question bank for video interview.")
        fallback_idx = current_index % len(FALLBACK_QUESTIONS)
        parsed_question = dict(FALLBACK_QUESTIONS[fallback_idx])  # copy to avoid mutation
        parsed_question["source"] = "fallback"
        return jsonify(parsed_question), 200

    parsed_question["source"] = "ai"
    return jsonify(parsed_question), 200
