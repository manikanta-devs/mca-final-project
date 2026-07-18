from flask import Blueprint, request, jsonify, current_app
import logging
import os

from services.analytics_service import AnalyticsService
from utils.auth_utils import token_required, verify_ownership
from ai.gemini_service import GeminiService

logger = logging.getLogger(__name__)
analytics_bp = Blueprint("analytics", __name__)
analytics_service = AnalyticsService()
gemini_service = GeminiService()



def developer_tools_enabled() -> bool:
    """Require an explicit opt-in for destructive/demo-only endpoints."""
    return os.getenv("ENABLE_DEVELOPER_TOOLS", "false").lower() == "true"


@analytics_bp.route("/analytics/summary", methods=["GET"])
@token_required
def get_summary():
    """Get overall performance summary"""
    try:
        summary = analytics_service.get_summary(username=request.username)
        return jsonify({"success": True, "summary": summary}), 200
    except Exception as e:
        logger.error(f"Analytics summary error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/sessions", methods=["GET"])
@token_required
def get_sessions():
    """Get all completed sessions with scores"""
    try:
        try:
            limit = int(request.args.get("limit", 20))
            if limit < 1 or limit > 100:
                limit = 20
        except (ValueError, TypeError):
            limit = 20
        sessions = analytics_service.get_all_sessions(limit=limit, username=request.username)
        return jsonify({"success": True, "sessions": sessions}), 200
    except Exception as e:
        logger.error(f"Analytics sessions error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/session/<session_id>", methods=["GET"])
@token_required
def get_session(session_id):
    """Get detailed analytics for a specific session"""
    try:
        session = analytics_service.get_session_details(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error
        return jsonify({"success": True, "session": session}), 200
    except Exception as e:
        logger.error(f"Analytics session error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500



@analytics_bp.route("/analytics/dashboard-insights", methods=["GET"])
@token_required
def dashboard_insights():
    """Get real dashboard insights derived from completed sessions."""
    try:
        insights = analytics_service.get_dashboard_insights(username=request.username)
        return jsonify({"success": True, "insights": insights}), 200
    except Exception as e:
        logger.error(f"Dashboard insights error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500

@analytics_bp.route("/analytics/performance-trend", methods=["GET"])
@token_required
def performance_trend():
    """Get performance trend over time"""
    try:
        trend = analytics_service.get_performance_trend(username=request.username)
        return jsonify({"success": True, "trend": trend}), 200
    except Exception as e:
        logger.error(f"Performance trend error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/weak-areas", methods=["GET"])
@token_required
def weak_areas():
    """Get identified weak areas across all sessions"""
    try:
        areas = analytics_service.get_weak_areas(username=request.username)
        return jsonify({"success": True, "weak_areas": areas}), 200
    except Exception as e:
        logger.error(f"Weak areas error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/skill-breakdown", methods=["GET"])
@token_required
def skill_breakdown():
    """Get skill-wise performance breakdown"""
    try:
        breakdown = analytics_service.get_skill_breakdown(username=request.username)
        return jsonify({"success": True, "breakdown": breakdown}), 200
    except Exception as e:
        logger.error(f"Skill breakdown error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/study-plan", methods=["GET"])
@token_required
def study_plan():
    """Get a personalized weekly practice plan."""
    try:
        plan = analytics_service.get_study_plan(username=request.username)
        return jsonify({"success": True, "study_plan": plan}), 200
    except Exception as e:
        logger.error(f"Study plan error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/communication-coach", methods=["GET"])
@token_required
def communication_coach():
    """Get a communication-first coaching plan."""
    try:
        coach = analytics_service.get_communication_coach(username=request.username)
        return jsonify({"success": True, "communication_coach": coach}), 200
    except Exception as e:
        logger.error(f"Communication coach error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/analytics/clear", methods=["DELETE"])
@token_required
def clear_analytics():
    """Clear all analytics data"""
    if not developer_tools_enabled():
        return jsonify({"error": "Developer tools are disabled"}), 403
    try:
        analytics_service.clear_all(username=request.username)
        return jsonify({"success": True, "message": "All analytics data cleared"}), 200
    except Exception as e:
        logger.error(f"Clear analytics error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@analytics_bp.route("/developer/mock-session", methods=["POST"])
@token_required
def mock_session():
    """Inject a pre-computed completed mock session for demos."""
    if not developer_tools_enabled():
        return jsonify({"error": "Developer tools are disabled"}), 403
    try:
        import uuid
        from datetime import datetime, timezone
        from services import database as db
        
        data = request.get_json() or {}
        session_type = data.get("type", "perfect")
        session_id = f"mock_{session_type}_{uuid.uuid4().hex[:8]}"
        
        if session_type == "perfect":
            overall_score = 98
            tech_score = 98
            clarity = 97
            completeness = 98
            pacing = 125
            fillers = 1
            emotion = "focused"
            posture = 96
            posture_label = "Good"
            eye_contact = 97
            grade = "A+"
            strong_areas = ["System Design Trade-offs", "React Hooks Optimization", "Asynchronous JavaScript"]
            weak_areas = ["Rambling slightly under pressure"]
            q_text = "How would you design a highly scalable caching strategy using Redis?"
            ans_text = "I would place a Redis cache layer in front of our main SQLite/SQL database to handle the top 20% most active read traffic. I'd configure a Cache-Aside pattern where the server checks Redis first. If it's a cache miss, we read from the database, write back to Redis, and return. To ensure memory is optimized, I'd apply an LRU eviction policy and set a 1-hour TTL on keys."
            eval_feedback = "Your description of the Cache-Aside pattern, LRU eviction, and TTL limits was technically outstanding and direct."
        else:
            overall_score = 55
            tech_score = 50
            clarity = 55
            completeness = 60
            pacing = 205
            fillers = 12
            emotion = "disengaged"
            posture = 38
            posture_label = "Slouched"
            eye_contact = 25
            grade = "C"
            strong_areas = ["Understands database replication concepts"]
            weak_areas = ["Pacing rate too high (rushing)", "Poor eye contact (not looking at lens)", "Slouched body posture"]
            q_text = "Describe a memory leak you spent a long time debugging in production."
            ans_text = "Um, like, basically we had this, uh, really bad server crash on Fridays, and so, um, I like, went into the code and basically, like, restarted it every week. And so, um, actually, we didn't really, uh, fix it, but basically it kept running, like, after restarting."
            eval_feedback = "Your answer was extremely short, utilized high amounts of filler words, and lacked any description of debugging tools, profiling heap dumps, or root-cause resolutions. Pacing was rushed."

        # Questions
        questions = [{
            "id": 1,
            "text": q_text,
            "category": "Architecture & Debugging",
            "difficulty": "medium",
            "type": "technical"
        }]

        # Evaluation & Voice / Video sub-metrics
        evaluation = {
            "overall_score": overall_score,
            "technical_score": tech_score,
            "clarity_score": clarity,
            "completeness_score": completeness,
            "relevance_score": overall_score,
            "depth_score": tech_score,
            "feedback": eval_feedback,
            "strong_points": strong_areas,
            "improvements": ["Use complete silence instead of um/like" if session_type == "weak" else "Keep doing what you are doing"],
            "topic": "Architecture & Debugging",
            "star_rubric": {
                "situation": 95 if session_type == "perfect" else 50,
                "task": 98 if session_type == "perfect" else 55,
                "action": 96 if session_type == "perfect" else 45,
                "result": 98 if session_type == "perfect" else 35
            }
        }

        # Answers
        answers = [{
            "question_index": 0,
            "question": questions[0],
            "answer": ans_text,
            "voice_metrics": {
                "speaking_rate_wpm": pacing,
                "filler_word_count": fillers,
                "filler_word_ratio": round((fillers / 40) * 100, 1) if session_type == "weak" else 1.2,
                "tremor_score": 18 if session_type == "weak" else 5,
                "voice_delivery_score": tech_score - 10 if session_type == "weak" else tech_score
            },
            "emotion_metrics": {
                "eye_contact_score": eye_contact,
                "posture_score": posture,
                "posture_label": posture_label,
                "primary_emotion": emotion,
                "emotion_label": emotion.capitalize(),
                "confidence": eye_contact
            },
            "evaluation": evaluation,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]

        results = {
            "candidate_name": "Demo Presenter",
            "role": "software_engineer",
            "interview_format": "video",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "duration_minutes": 1,
            "grade": grade,
            "scores": {
                "overall": overall_score,
                "technical": tech_score,
                "clarity": clarity,
                "completeness": completeness
            },
            "voice": {
                "delivery": tech_score - 10 if session_type == "weak" else tech_score,
                "speaking_pace_wpm": pacing,
                "filler_word_count": fillers,
                "filler_word_ratio": round((fillers / 40) * 100, 1) if session_type == "weak" else 1.2,
                "tremor_score": 18 if session_type == "weak" else 5
            },
            "video": {
                "engagement_score": overall_score,
                "eye_contact_score": eye_contact,
                "posture_score": posture,
                "posture_label": posture_label,
                "primary_emotion": emotion,
                "emotion_label": emotion.capitalize()
            },
            "strong_areas": strong_areas,
            "weak_areas": weak_areas,
            "answers": answers
        }

        session = {
            "id": session_id,
            "candidate_name": "Demo Presenter",
            "role": "software_engineer",
            "interview_format": "video",
            "difficulty": "medium",
            "panel_mode": False,
            "status": "completed",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "resume_data": {},
            "questions": questions,
            "answers": answers,
            "results": results
        }

        db.save_session(session)
        return jsonify({"success": True, "session_id": session_id, "results": results}), 200
    except Exception as e:
        logger.error(f"Developer mock session generation error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500
