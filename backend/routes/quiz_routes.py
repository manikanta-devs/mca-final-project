from flask import Blueprint, request, jsonify
import logging

from services.quiz_service import QuizService
from utils.auth_utils import token_required, verify_ownership

logger = logging.getLogger(__name__)
quiz_bp = Blueprint("quiz", __name__)
quiz_service = QuizService()


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@quiz_bp.route("/quiz/topics", methods=["GET"])
@token_required
def get_topics():
    try:
        return jsonify({"success": True, "topics": quiz_service.get_topics()}), 200
    except Exception as exc:
        logger.error(f"Quiz topics error: {exc}")
        return jsonify({"error": str(exc)}), 500


@quiz_bp.route("/quiz/start", methods=["POST"])
@token_required
def start_quiz():
    try:
        data = request.get_json() or {}
        topic = data.get("topic", "python")
        difficulty = data.get("difficulty", "medium")
        num_questions = min(max(safe_int(data.get("num_questions", 5), 5), 3), 10)
        candidate_name = data.get("candidate_name", "Candidate")
        quiz_type = data.get("quiz_type", "technical")
        skills = data.get("skills", [])
        session = quiz_service.start_quiz(
            topic=topic,
            difficulty=difficulty,
            num_questions=num_questions,
            candidate_name=candidate_name,
            quiz_type=quiz_type,
            company=company,
            username=request.username,
            skills=skills,
        )
        return jsonify({"success": True, **session}), 200
    except Exception as exc:
        logger.error(f"Start quiz error: {exc}")
        return jsonify({"error": str(exc)}), 500


@quiz_bp.route("/quiz/answer", methods=["POST"])
@token_required
def submit_quiz_answer():
    try:
        data = request.get_json() or {}
        session_id = data.get("session_id")
        question_index = safe_int(data.get("question_index", 0), 0)
        selected_index = safe_int(data.get("selected_index", -1), -1)
        if not session_id:
            return jsonify({"error": "Session ID required"}), 400
        session = quiz_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error
        result = quiz_service.submit_answer(session_id, question_index, selected_index)
        return jsonify({"success": True, **result}), 200
    except Exception as exc:
        logger.error(f"Submit quiz answer error: {exc}")
        return jsonify({"error": str(exc)}), 500


@quiz_bp.route("/quiz/complete", methods=["POST"])
@token_required
def complete_quiz():
    try:
        data = request.get_json() or {}
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"error": "Session ID required"}), 400
        session = quiz_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error
        results = quiz_service.complete_quiz(session_id)
        return jsonify({"success": True, "results": results}), 200
    except Exception as exc:
        logger.error(f"Complete quiz error: {exc}")
        return jsonify({"error": str(exc)}), 500


@quiz_bp.route("/quiz/sessions", methods=["GET"])
@token_required
def get_sessions():
    try:
        return jsonify({"success": True, "sessions": quiz_service.get_sessions(username=request.username)}), 200
    except Exception as exc:
        logger.error(f"Quiz sessions error: {exc}")
        return jsonify({"error": str(exc)}), 500


@quiz_bp.route("/quiz/session/<session_id>", methods=["GET"])
@token_required
def get_session(session_id):
    try:
        session = quiz_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error
        return jsonify({"success": True, "session": session}), 200
    except Exception as exc:
        logger.error(f"Quiz session error: {exc}")
        return jsonify({"error": str(exc)}), 500
