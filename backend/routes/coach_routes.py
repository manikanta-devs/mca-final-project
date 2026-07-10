import logging
import copy
import json
from flask import Blueprint, request, jsonify, current_app
from utils.auth_utils import token_required
from ai.gemini_service import GeminiService
from services.analytics_service import AnalyticsService
from ai.roadmap_defaults import PREBUILT_ROADMAPS, DEFAULT_ROADMAP
from pydantic import ValidationError
from validators import CoachAskRequest, RoadmapRequest

logger = logging.getLogger(__name__)

coach_bp = Blueprint("coach", __name__)
gemini_service = GeminiService()
analytics_service = AnalyticsService()


def clean_llm_json(raw_text: str) -> str:
    """Preprocess raw LLM block outputs to yield clean JSON content."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1:
        return text[first_brace:last_brace+1]
    return text


def normalize_roadmap(parsed_json: dict) -> dict:
    """Safeguard structural consistency of roadmap object schemas."""
    default_roadmap = DEFAULT_ROADMAP
    if not parsed_json or not isinstance(parsed_json, dict):
        return default_roadmap
    normalized = {}
    for key, default_val in default_roadmap.items():
        found_key = None
        for k in parsed_json.keys():
            if k.lower() == key.lower():
                found_key = k
                break
        if found_key:
            normalized[key] = parsed_json[found_key]
        else:
            normalized[key] = default_val

    # Ensure list consistency
    for list_key in ["strengths", "pipeline"]:
        if not isinstance(normalized.get(list_key), list):
            normalized[list_key] = default_roadmap[list_key]

    # Validate phases list
    if not isinstance(normalized.get("phases"), list) or len(normalized["phases"]) < 1:
        normalized["phases"] = default_roadmap["phases"]
    else:
        for phase in normalized["phases"]:
            if not isinstance(phase, dict):
                normalized["phases"] = default_roadmap["phases"]
                break
            for pk, pv in default_roadmap["phases"][0].items():
                if pk not in phase:
                    phase[pk] = pv
            # Nested resource validations
            if not isinstance(phase.get("resources"), list):
                phase["resources"] = default_roadmap["phases"][0]["resources"]
            else:
                for res in phase["resources"]:
                    if not isinstance(res, dict):
                        phase["resources"] = default_roadmap["phases"][0]["resources"]
                        break
                    if "name" not in res:
                        res["name"] = "Learning resource"
                    if "type" not in res:
                        res["type"] = "Documentation"
                    if "url" not in res:
                        res["url"] = "https://techdevguide.withgoogle.com/"
    if not isinstance(normalized.get("progress_metrics"), dict):
        normalized["progress_metrics"] = default_roadmap["progress_metrics"]
    else:
        pm = normalized["progress_metrics"]
        for pk, pv in default_roadmap["progress_metrics"].items():
            if pk not in pm:
                pm[pk] = pv
    return normalized


@coach_bp.route("/coach/ask", methods=["POST"])
@token_required
def coach_ask():
    """Ask the AI Career Mentor a question"""
    try:
        data = request.get_json() or {}
        
        # Pydantic validation
        try:
            CoachAskRequest(**data)
        except ValidationError as val_err:
            return jsonify({"error": "Validation failed", "message": val_err.errors()}), 400

        question = data.get("question", "").strip()
        if not question:
            return jsonify({"error": "Question is required"}), 400

        prompt = f"""You are a 24/7 senior tech and career mentor. Provide a structured, helpful explanation for the query: "{question}"
        IMPORTANT: Explain the topic in extremely simple, friendly, and easy-to-understand language.
        Be extremely brief, concise, and structured. Keep the definition to 1-2 sentences and the analogy to 2 sentences max. Keep all text concise to avoid scroll bloat.
        Format your response strictly as a JSON object with the following keys:
        - definition: A very simple, friendly 1-2 sentence definition of the term or question context.
        - analogy: A creative, extremely easy-to-understand real-world analogy.
        - example: A technical example (like code/JSON snippet) OR a structural blueprint/formula if it is a career/HR question.
        - model_answer: A premium mock answer the candidate can speak out loud in an interview (make it sound highly human, natural, and conversational).
        - follow_ups: A list of 3 expected follow-up questions they'll ask next.
        
        CRITICAL RULES:
        1. All values for definition, analogy, example, and model_answer MUST be plain, flat strings. Do NOT wrap them in nested objects, dicts, or lists of objects (e.g. do NOT use {{"text": "...", "description": "..."}}).
        2. The value for follow_ups MUST be a list of plain strings, NOT a list of objects.
        3. Do not include comments, descriptions, or explanation fields inside the JSON keys.
        4. If the query is an HR or self-introduction question, do NOT talk about database or code patterns in definition/analogy. Give a clear explanation of how to answer the question, a movie-trailer style analogy, a formula template, and a premium mock script.
        Ensure the output is valid JSON and nothing else."""

        raw_response = gemini_service.generate_content(prompt, max_tokens=600)
        if not raw_response:
            # Dynamic fallback when AI is unavailable
            q_lower = question.lower()
            if any(k in q_lower for k in ["introduction", "about yourself", "intro"]):
                parsed = {
                    "definition": "A self-introduction is a 90-second professional story that establishes your background, core technical capabilities, and goals.",
                    "analogy": "Think of it like a movie trailer—it highlights the most exciting, relevant parts of your journey to make the recruiter want to hear more.",
                    "example": "Formula: Hook (Name & MCA background) -> Core Tech Stack -> Key Project (STAR format) -> Close (Career Goals fit).",
                    "model_answer": "My name is [Name]. I am graduating with an MCA degree, focusing on React and Python/Flask development. Recently, I built an AI interview simulator that evaluates answers using dynamic LLM API fallbacks. Building this taught me a lot about REST API latency, SQLite integration, and front-end styling. I am eager to apply this hands-on coding mindset as a junior developer at your firm.",
                    "follow_ups": ["How long should my self-introduction be?", "Should I mention my non-technical hobbies?", "How do I explain gaps in my education?"]
                }
            elif any(k in q_lower for k in ["hire you", "why hire"]):
                parsed = {
                    "definition": "Why Should We Hire You is an interview question where you align your key projects and learning drive directly to the team's vacancy checklist.",
                    "analogy": "Think of it like puzzle pieces—you are explaining how your coding skills and background perfectly slide into the team's empty developer slot.",
                    "example": "Formula: Their tech stack requirements + Your matching project outcomes = High-value hire.",
                    "model_answer": "You should hire me because I have hands-on experience building full-stack applications with your exact stack, React and Flask. Beyond the languages, I have a proven track record of solving technical challenges independently, like implementing API rate handling in my latest project.",
                    "follow_ups": ["How do I research a company before the interview?", "What if I do not match 100% of the job requirements?", "How do I show passion and enthusiasm?"]
                }
            else:
                parsed = {
                    "definition": f"Mentor explanation: '{question}' is a core technical concept relating to software development and system architecture.",
                    "analogy": "Think of it like a well-organized filing cabinet where everything is labeled and easy to retrieve.",
                    "example": "Basic design pattern or implementation code demonstrating structure.",
                    "model_answer": f"To explain '{question}' in an interview, I would discuss the primary design rationale, benefits, and how we handle trade-offs in production.",
                    "follow_ups": ["What are the core benefits of this approach?", "How does this scale?", "What are the common pitfalls?"]
                }
        else:
            # Clean and parse JSON
            parsed = None
            cleaned = clean_llm_json(raw_response)

            try:
                parsed = json.loads(cleaned)
            except Exception as e:
                logger.error(f"Failed to parse mentor response: {e}. Raw: {raw_response}")
                parsed = {
                    "definition": "Could not parse structured definition.",
                    "analogy": "Could not parse structured analogy.",
                    "example": "Could not parse structured example.",
                    "model_answer": raw_response,
                    "follow_ups": ["What are the core benefits of this approach?", "How does this scale?", "What are the common pitfalls?"]
                }

        return jsonify({"success": True, "data": parsed}), 200
    except Exception as e:
        logger.error(f"Coach ask error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@coach_bp.route("/coach/generate-roadmap", methods=["POST"])
@token_required
def coach_roadmap():
    """Generate a personalized study roadmap"""
    try:
        data = request.get_json() or {}

        # Pydantic validation
        try:
            RoadmapRequest(**data)
        except ValidationError as val_err:
            return jsonify({"error": "Validation failed", "message": val_err.errors()}), 400

        custom_topic = data.get("custom_topic", "").strip()

        # Check if they have sessions to identify weak areas
        sessions = analytics_service.get_all_sessions(username=request.username)
        weak_areas = []
        if sessions:
            weak_res = analytics_service.get_weak_areas(username=request.username)
            if weak_res and isinstance(weak_res, list):
                weak_areas = weak_res

        topic_context = custom_topic if custom_topic else "General Software Engineering"
        topic_lower = topic_context.lower()

        # Cache check for instant response path
        matched_key = None
        for key in PREBUILT_ROADMAPS.keys():
            if key in topic_lower:
                matched_key = key
                break
        
        # Fallback to default dbms if empty/default request
        if not custom_topic:
            matched_key = "dbms"

        if matched_key:
            parsed = copy.deepcopy(PREBUILT_ROADMAPS[matched_key])
            if sessions:
                last_sess = sessions[0]
                if last_sess.get("role"):
                    parsed["target_role"] = last_sess["role"].replace("_", " ").title()
            return jsonify({"success": True, "roadmap": parsed}), 200

        prompt = f"""You are a personalized study guide planner and tech mentor.
        Generate a comprehensive, premium AI Study Roadmap for the following topic: "{topic_context}".
        
        The response MUST be a single valid JSON object containing exactly the following keys:
        1. "target_role": A realistic role name (e.g. "Frontend Engineer", "Full Stack Developer", "Software Engineer").
        2. "target_company": A top tech company name (e.g. "Google", "Microsoft", "Amazon", "Netflix").
        3. "readiness_score": An integer (e.g. 72).
        4. "est_days": An integer representing study time (e.g. 18).
        5. "difficulty": e.g. "Intermediate" or "Advanced".
        6. "summary": A brief, highly professional AI assessment message.
        7. "strengths": A list of 3-4 skills the user is likely strong in (flat strings).
        8. "weaknesses": A list of 3-4 object entities, each with:
           - "name": e.g. "SQL" or "DBMS" or "System Design"
           - "mastery": e.g. "45%" or "60%"
           - "priority": "High" or "Medium" or "Low"
           - "est_improvement": e.g. "+15%" or "+20%"
        9. "phases": A list of exactly 4 study phase objects, each with:
           - "phase_num": e.g. 1, 2, 3, 4
           - "title": e.g. "DBMS Fundamentals" or "Advanced SQL Queries"
           - "status": "Completed" or "Current" or "Locked"
           - "progress": e.g. 100 or 68 or 0
           - "why_matters": "Why this topic is vital for interviews."
           - "est_study_time": e.g. "6 Hours" or "10 Hours"
           - "difficulty": "Easy" or "Medium" or "Hard"
           - "learning_outcome": "What the user will be able to do after studying."
           - "importance": "High" or "Medium" or "Critical"
           - "resources": A list of objects representing free learning platforms (YouTube, GeeksforGeeks, MDN, Microsoft Learn, roadmap.sh). Each resource must have:
             - "name": e.g. "YouTube Tutorials" or "GeeksforGeeks DBMS Guide"
             - "type": "Video" or "Documentation" or "Quiz" or "Practice"
             - "url": A valid domain URL (never use placeholder links).
        10. "pipeline": A list of exactly 5 step names showing the practice pipeline (e.g. ["Learn Concept", "Watch Video", "Practice Problems", "Take Quiz", "Mock Interview"]).
        11. "progress_metrics": A JSON object with the following flat keys:
           - "topics_completed": e.g. "4/12 Topics"
           - "est_readiness": "82%"
           - "days_remaining": "14 Days"
           - "current_streak": "5 Days"
           - "completion_pct": 66
        
        Ensure all output is strictly valid JSON and nothing else."""

        raw_response = gemini_service.generate_content(prompt, max_tokens=1536)
        if not raw_response:
            parsed = copy.deepcopy(DEFAULT_ROADMAP)
            parsed["target_role"] = topic_context.title()
        else:
            # Clean and parse JSON
            parsed = None
            cleaned = clean_llm_json(raw_response)

            try:
                parsed = json.loads(cleaned)
                parsed = normalize_roadmap(parsed)
            except Exception as e:
                logger.error(f"Failed to parse premium roadmap response: {e}. Raw: {raw_response}")
                parsed = copy.deepcopy(DEFAULT_ROADMAP)

        return jsonify({"success": True, "roadmap": parsed}), 200
    except Exception as e:
        logger.error(f"Coach roadmap error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@coach_bp.route("/coach/critique-speech", methods=["POST"])
@token_required
def coach_critique():
    """Critique candidate spoken speech sandbox style"""
    try:
        data = request.get_json() or {}
        prompt_text = data.get("prompt", "").strip()
        transcript = data.get("transcript", "").strip()
        wpm = data.get("wpm", 0)
        fillers = data.get("fillers", 0)

        if not transcript:
            return jsonify({"error": "Speech transcript is required"}), 400

        prompt = f"""You are a senior speaking and communication coach.
        Review the candidate's spoken response to the prompt: "{prompt_text}".
        Spoken Transcript: "{transcript}"
        Pacing rate: {wpm} WPM.
        Filler word count: {fillers}.

        Format your critique strictly as a JSON object with the following keys:
        - score: A number from 40 to 100 indicating performance.
        - headline: A short encouraging feedback title (e.g., 'Excellent Pacing, Needs Structure').
        - pacing_critique: Specific advice on their pacing rate (too fast, too slow, or ideal).
        - fillers_critique: Review of their filler word usage with ways to replace them with silent pauses.
        - structural_critique: Did they structure the answer logically? For project/behavioral prompts, check if they used STAR elements.
        - keywords_used: List of technical keywords detected in their speech.
        - tips: List of 3 actionable, bulleted tips for their next practice.
        Ensure the output is valid JSON and nothing else."""

        raw_response = gemini_service.generate_content(prompt, max_tokens=512)
        if not raw_response:
            # Dynamic fallback when AI is unavailable
            parsed = {
                "score": 75 if wpm >= 90 and wpm <= 160 else 60,
                "headline": "Good effort - pacing is clear" if wpm >= 90 and wpm <= 160 else "Pacing needs adjustment",
                "pacing_critique": f"Your pacing of {wpm} WPM is {'ideal' if wpm >= 90 and wpm <= 160 else 'a bit slow' if wpm < 90 else 'a bit fast'}.",
                "fillers_critique": f"Filler word count: {fillers}. Focus on pausing in complete silence rather than saying filler words.",
                "structural_critique": "Try to structure your answer using the STAR method (Situation, Task, Action, Result).",
                "keywords_used": [],
                "tips": ["Record another attempt", "Focus on technical naming", "Pace yourself deliberately"]
            }
        else:
            # Clean and parse JSON
            parsed = None
            cleaned = clean_llm_json(raw_response)

            try:
                parsed = json.loads(cleaned)
            except Exception as e:
                logger.error(f"Failed to parse critique response: {e}. Raw: {raw_response}")
                parsed = {
                    "score": 75,
                    "headline": "Solid effort - keep practicing",
                    "pacing_critique": f"Your pacing of {wpm} WPM is within bounds, but could be cleaner.",
                    "fillers_critique": f"Filler word count: {fillers}. Focus on pausing in complete silence.",
                    "structural_critique": "Try to structure your answer using the STAR method.",
                    "keywords_used": [],
                    "tips": ["Record another attempt", "Focus on technical naming", "Pace yourself deliberately"]
                }

        return jsonify({"success": True, "critique": parsed}), 200
    except Exception as e:
        logger.error(f"Coach critique error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500
