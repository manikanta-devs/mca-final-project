from flask import Blueprint, request, jsonify
import logging
import uuid

from services.interview_service import InterviewService
from ai.question_generator import QuestionGenerator
from ai.answer_evaluator import AnswerEvaluator
from utils.auth_utils import token_required

logger = logging.getLogger(__name__)
interview_bp = Blueprint("interview", __name__)
interview_service = InterviewService()
question_generator = QuestionGenerator()
answer_evaluator = AnswerEvaluator()


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@interview_bp.route("/interview/generate-questions", methods=["POST"])
@token_required
def generate_questions():
    """Generate interview questions from resume data or role"""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        resume_data = data.get("resume_data", {})
        role = data.get("role", "software_engineer")
        difficulty = data.get("difficulty", "medium")
        num_questions = min(safe_int(data.get("num_questions", 8), 8), 10)

        panel_mode = data.get("panel_mode", False)
        company = data.get("company", "General")
        company_context = data.get("company_context", "")

        skills = (
            resume_data.get("skills", {}).get("all", [])
            if isinstance(resume_data, dict)
            else []
        )
        logger.info(
            f"Generating questions: role={role}, difficulty={difficulty}, skills={skills[:10]}, has_resume={'yes' if skills else 'no'}, panel_mode={panel_mode}, company={company}"
        )

        questions = question_generator.generate(
            resume_data=resume_data,
            role=role,
            difficulty=difficulty,
            num_questions=num_questions,
            panel_mode=panel_mode,
            company=company,
            company_context=company_context,
        )

        return (
            jsonify({"success": True, "questions": questions, "total": len(questions)}),
            200,
        )

    except Exception as e:
        logger.error(f"Question generation error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/start", methods=["POST"])
@token_required
def start_interview():
    """Start a new interview session"""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        session_id = str(uuid.uuid4())
        questions = data.get("questions", [])
        resume_data = data.get("resume_data", {})
        role = data.get("role", "software_engineer")
        candidate_name = data.get("candidate_name", "Candidate")
        interview_format = data.get("interview_format", "voice")
        difficulty = data.get("difficulty", "medium")
        panel_mode = data.get("panel_mode", False)

        if not questions:
            return jsonify({"error": "No questions provided"}), 400

        session = interview_service.create_session(
            session_id=session_id,
            questions=questions,
            resume_data=resume_data,
            role=role,
            candidate_name=candidate_name,
            interview_format=interview_format,
            difficulty=difficulty,
            panel_mode=panel_mode,
            username=request.username,
        )
        session["interviewer_persona"] = data.get("interviewer_persona", "sarah")
        interview_service.save_session(session_id, session)

        first_question = questions[0] if questions else None

        return (
            jsonify(
                {
                    "success": True,
                    "session_id": session_id,
                    "current_question": first_question,
                    "question_index": 0,
                    "total_questions": len(questions),
                    "candidate_name": candidate_name,
                    "interview_format": interview_format,
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Start interview error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/answer", methods=["POST"])
@token_required
def submit_answer():
    """Submit an answer and get evaluation + next question"""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        session_id = data.get("session_id")
        answer = data.get("answer", "").strip()
        question_index = safe_int(data.get("question_index", 0), 0)
        voice_metrics = data.get("voice_metrics", {}) or {}
        emotion_metrics = data.get("emotion_metrics", {}) or {}

        if not session_id:
            return jsonify({"error": "Session ID required"}), 400

        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found or expired"}), 404

        if not answer:
            return jsonify({"error": "Answer cannot be empty"}), 400

        if question_index < 0 or question_index >= len(session["questions"]):
            return jsonify({"error": "Question index out of range"}), 400

        # Interviewer name & gender setup
        persona = session.get("interviewer_persona", "sarah")
        interviewer_name = "Marcus Rodriguez" if persona == "marcus" else "Sarah Chen"

        # Determine current question (blueprint question vs active follow-up question)
        active_follow_up = session.get("active_follow_up_text")
        if active_follow_up:
            current_question = {
                "text": active_follow_up,
                "category": "Follow-Up",
                "type": "technical",
                "difficulty": session.get("difficulty", "medium"),
            }
        else:
            current_question = session["questions"][question_index]

        # Initialize and update chat history for live context memory
        chat_history = session.setdefault("chat_history", [])
        chat_history.append({"role": "interviewer", "text": current_question["text"]})
        chat_history.append({"role": "candidate", "text": answer})

        # Collect previous scores for adaptive difficulty
        previous_scores = []
        for ans in session.get("answers", []):
            ev = ans.get("evaluation", {})
            if ev.get("overall_score"):
                previous_scores.append(ev["overall_score"])

        # Evaluate the answer with live context memory
        evaluation = answer_evaluator.evaluate(
            question=current_question,
            answer=answer,
            role=session.get("role", "software_engineer"),
            voice_metrics=voice_metrics,
            emotion_metrics=emotion_metrics,
            previous_scores=previous_scores,
            chat_history=chat_history,
            resume_data=session.get("resume_data", {}),
            interviewer_name=interviewer_name,
        )

        # Store the answer + evaluation
        new_answer = {
            "question_index": question_index,
            "question": current_question,
            "answer": answer,
            "voice_metrics": voice_metrics,
            "emotion_metrics": emotion_metrics,
            "evaluation": evaluation,
        }
        interview_service.add_answer(session_id, new_answer)
        session.setdefault("answers", []).append(new_answer)

        # Determine next question using the follow-up engine
        follow_up_prompt = evaluation.get("follow_up_prompt", "").strip()
        follow_up_count = session.get("follow_up_count", 0)

        # Check if we should ask a dynamic follow-up question (cap at 2 per blueprint stage)
        is_greeting_or_short = evaluation.get("overall_score", 0) == 0
        if follow_up_prompt and follow_up_prompt.lower() != "none" and follow_up_count < 2 and not is_greeting_or_short:
            session["active_follow_up_text"] = follow_up_prompt
            session["follow_up_count"] = follow_up_count + 1
            
            next_question = {
                "id": current_question.get("id", question_index + 1),
                "text": follow_up_prompt,
                "category": current_question.get("category", "Follow-Up"),
                "type": current_question.get("type", "technical"),
                "difficulty": current_question.get("difficulty", "medium"),
            }
            next_index = question_index
            is_complete = False
        else:
            # Advance to the next blueprint question
            session["active_follow_up_text"] = None
            session["follow_up_count"] = 0
            
            next_index = question_index + 1
            total = len(session["questions"])
            is_complete = next_index >= total

            next_question = None
            if not is_complete:
                next_question = session["questions"][next_index]

        # Save session updates back to DB
        interview_service.save_session(session_id, session)

        total_blueprint = len(session["questions"])
        progress_index = min(next_index, total_blueprint)

        return (
            jsonify(
                {
                    "success": True,
                    "evaluation": evaluation,
                    "next_question": next_question,
                    "next_index": next_index,
                    "is_complete": is_complete,
                    "progress": round((progress_index / total_blueprint) * 100),
                    "difficulty_adjustment": evaluation.get(
                        "difficulty_adjustment", "maintain"
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Submit answer error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/onboarding-response", methods=["POST"])
@token_required
def generate_onboarding_response():
    """Generate a personalized conversational response during onboarding"""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        session_id = data.get("session_id")
        current_phase = data.get("current_phase")
        answer = data.get("answer", "").strip()

        if not session_id or not current_phase:
            return jsonify({"error": "Session ID and current_phase required"}), 400

        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404

        persona = session.get("interviewer_persona", "sarah")
        interviewer_name = "Marcus Rodriguez" if persona == "marcus" else "Sarah Chen"

        # Fetch first question from blueprint for transition
        first_question = session["questions"][0]["text"] if session.get("questions") else None

        response_text = answer_evaluator.generate_onboarding_response(
            current_phase=current_phase,
            answer=answer,
            candidate_name=session.get("candidate_name"),
            resume_data=session.get("resume_data"),
            first_question=first_question,
            interviewer_name=interviewer_name,
        )

        # Store onboarding prompts/responses in chat history for seamless memory context
        chat_history = session.setdefault("chat_history", [])
        
        onboarding_questions = {
            "greet_mic": f"Hello, good morning. My name is {interviewer_name}. I'll be conducting today's interview. Before we begin, can you hear and see me clearly?",
            "small_talk": "Glad the connection is working. How has your day been so far?",
            "identity_confirm": "Before we begin, could you please introduce yourself and walk me through your background?",
        }
        
        asked_q = onboarding_questions.get(current_phase, "Hello.")
        chat_history.append({"role": "interviewer", "text": asked_q})
        chat_history.append({"role": "candidate", "text": answer})

        interview_service.save_session(session_id, session)

        return jsonify({
            "success": True,
            "response": response_text
        }), 200

    except Exception as e:
        logger.error(f"Onboarding response error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/follow-up", methods=["POST"])
@token_required
def generate_follow_up():
    """Generate a personalized follow-up question based on the answer"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        session_id = data.get("session_id")
        question = data.get("question", {})
        answer = data.get("answer", "")
        evaluation = data.get("evaluation", {})

        if not session_id:
            return jsonify({"error": "Session ID required"}), 400

        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        if session.get("username") and session.get("username") != request.username:
            return jsonify({"error": "Forbidden"}), 403

        follow_up = answer_evaluator.generate_follow_up(
            question=question,
            answer=answer,
            evaluation=evaluation,
            role=session.get("role", "software_engineer"),
        )

        return jsonify({"success": True, "follow_up_question": follow_up}), 200

    except Exception as e:
        logger.error(f"Follow-up generation error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/complete", methods=["POST"])
@token_required
def complete_interview():
    """Complete the interview and get full results"""
    try:
        data = request.get_json(silent=True) or {}
        session_id = data.get("session_id")

        if not session_id:
            return jsonify({"error": "Session ID required"}), 400

        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        if session.get("username") and session.get("username") != request.username:
            return jsonify({"error": "Forbidden"}), 403

        try:
            results = interview_service.complete_session(session_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        return jsonify({"success": True, "results": results}), 200

    except Exception as e:
        logger.error(f"Complete interview error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/sessions", methods=["GET"])
@token_required
def get_sessions():
    """Get all interview sessions"""
    try:
        sessions = interview_service.get_all_sessions(username=request.username)
        return jsonify({"success": True, "sessions": sessions}), 200
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/session/<session_id>", methods=["GET"])
@token_required
def get_session(session_id):
    """Get a specific interview session"""
    try:
        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        if session.get("username") and session.get("username") != request.username:
            return jsonify({"error": "Forbidden"}), 403
        return jsonify({"success": True, "session": session}), 200
    except Exception as e:
        logger.error(f"Get session error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/session/<session_id>", methods=["DELETE"])
@token_required
def delete_session(session_id):
    """Delete an interview session"""
    try:
        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        if session.get("username") and session.get("username") != request.username:
            return jsonify({"error": "Forbidden"}), 403
        interview_service.delete_session(session_id)
        return jsonify({"success": True, "message": "Session deleted"}), 200
    except Exception as e:
        logger.error(f"Delete session error: {e}")
        return jsonify({"error": str(e)}), 500
