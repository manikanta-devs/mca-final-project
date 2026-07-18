from flask import Blueprint, request, jsonify
import logging
import uuid

from services.interview_service import InterviewService
from ai.question_generator import QuestionGenerator
from ai.answer_evaluator import AnswerEvaluator
from ai.interview_coach import InterviewCoach
from utils.auth_utils import token_required, verify_ownership
from utils.limiter import limiter

logger = logging.getLogger(__name__)
interview_bp = Blueprint("interview", __name__)
interview_service = InterviewService()
question_generator = QuestionGenerator()
answer_evaluator = AnswerEvaluator()
interview_coach = InterviewCoach()


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@interview_bp.route("/interview/generate-questions", methods=["POST"])
@token_required
@limiter.limit("15 per minute")
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
        interviewer_persona = data.get("interviewer_persona", "sarah")

        skills = (
            resume_data.get("skills", {}).get("all", [])
            if isinstance(resume_data, dict)
            else []
        )
        logger.info(
            f"Generating questions: role={role}, difficulty={difficulty}, skills={skills[:10]}, interviewer_persona={interviewer_persona}, has_resume={'yes' if skills else 'no'}, panel_mode={panel_mode}, company={company}"
        )

        questions = question_generator.generate(
            resume_data=resume_data,
            role=role,
            difficulty=difficulty,
            num_questions=num_questions,
            panel_mode=panel_mode,
            company=company,
            company_context=company_context,
            interviewer_persona=interviewer_persona,
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
@limiter.limit("15 per minute")
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

        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error

        if not answer:
            return jsonify({"error": "Answer cannot be empty"}), 400

        if question_index < 0:
            return jsonify({"error": "Question index out of range"}), 400

        # Dynamically extend session["questions"] in video mode to prevent out-of-range
        if session.get("interview_format") == "video" and question_index >= len(session["questions"]):
            while len(session["questions"]) <= question_index:
                session["questions"].append({
                    "id": len(session["questions"]) + 1,
                    "text": "Could you tell me more about your background and experience?",
                    "type": "behavioral",
                    "category": "Gemini Dynamic",
                    "points": 10,
                    "persona_id": "hr_manager"
                })

        if question_index >= len(session["questions"]):
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
        elif session.get("interview_format") == "video":
            video_scripted_questions = {
                0: "Could you please introduce yourself and walk me through your background?",
                1: "I have your resume here. Could you please walk me through your key experience and projects?",
                2: "Could you tell me about the most interesting project you've worked on, and the technologies you used?",
                3: "Can you tell me about the biggest technical challenge you faced while building it, and how you resolved it?",
                4: "What motivates you to apply to our company, and what do you hope to achieve here?"
            }
            if question_index in video_scripted_questions:
                current_question = {
                    "text": video_scripted_questions[question_index],
                    "category": "Scripted Onboarding",
                    "type": "behavioral" if question_index in [0, 4] else "technical",
                    "difficulty": session.get("difficulty", "medium"),
                }
            else:
                current_question = session["questions"][question_index]
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
@limiter.limit("15 per minute")
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

        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error

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
@limiter.limit("15 per minute")
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
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error

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
        gaze_stats = data.get("gaze_stats")

        if not session_id:
            return jsonify({"error": "Session ID required"}), 400

        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error

        try:
            results = interview_service.complete_session(session_id)
            if gaze_stats:
                results["video"] = {
                    "primary_emotion": "Focused",
                    "engagement_score": gaze_stats.get("presencePct") if gaze_stats.get("presencePct") is not None else 100,
                    "eye_contact_score": gaze_stats.get("eyeContactPct") if gaze_stats.get("eyeContactPct") is not None else 100,
                    "posture_score": max(0, 100 - min(100, gaze_stats.get("awayCount", 0) * 5)),
                }
                # Overwrite overall presence score in results radar breakdown
                session["results"] = results
                interview_service.save_session(session_id, session)
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
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error
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
        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error
        interview_service.delete_session(session_id)
        return jsonify({"success": True, "message": "Session deleted"}), 200
    except Exception as e:
        logger.error(f"Delete session error: {e}")
        return jsonify({"error": str(e)}), 500


@interview_bp.route("/interview/coach", methods=["POST"])
@token_required
def get_coaching():
    """Get AI coaching feedback for a candidate's answer"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body required"}), 400

        question = data.get("question", {})
        answer_text = data.get("answer", "")
        session_id = data.get("session_id")
        evaluation_scores = data.get("evaluation_scores", {})

        if not answer_text or not question:
            return jsonify({"error": "Question and answer are required"}), 400

        # Get session context if available
        resume_summary = ""
        role = "software_engineer"
        company = "General"
        experience_level = "entry"

        if session_id:
            session = interview_service.get_session(session_id)
            if session:
                ownership_error = verify_ownership(session, request)
                if ownership_error:
                    return ownership_error
                role = session.get("role", role)
                resume_data = session.get("resume_data", {})
                if resume_data:
                    resume_summary = resume_data.get("summary", "")
                    experience_level = resume_data.get("experience_level", "entry")
                    company = session.get("company", "General") or "General"

        question_text = question.get("text", question) if isinstance(question, dict) else str(question)

        coaching = interview_coach.get_coaching(
            question=question_text,
            answer=answer_text,
            role=role,
            resume_summary=resume_summary,
            company=company,
            experience_level=experience_level,
            evaluation_scores=evaluation_scores
        )

        return jsonify({"success": True, "coaching": coaching}), 200

    except Exception as e:
        logger.error(f"Coaching endpoint error: {e}")
        return jsonify({"error": "Coaching generation failed", "details": str(e)}), 500


# ─── Live Analysis & Next-Question Pre-fetch ──────────────────────────────────
@interview_bp.route("/interview/analyze-live", methods=["POST"])
@token_required
@limiter.limit("20 per minute")
def analyze_live():
    """
    Called during every HR processing pause (hr_taking_notes + hr_looking_at_screen).
    Sends candidate's transcript to Gemini and returns the next adaptive question,
    pre-fetched and ready before the HR finishes the processing clips.

    Request body:
        session_id          str  — active interview session
        stage               str  — e.g. "self_intro", "project", "challenge"
        transcript          str  — candidate's spoken answer text
        question_text       str  — the question that was just asked
        conversation_history list — all previous Q+A pairs

    Response:
        { success: true, next_question: { text, type, category, difficulty } }
    """
    try:
        data = request.get_json(silent=True) or {}
        session_id           = data.get("session_id", "")
        transcript           = data.get("transcript", "").strip()
        question_text        = data.get("question_text", "").strip()
        stage                = data.get("stage", "gemini")
        conversation_history = data.get("conversation_history", [])

        if not session_id or not transcript:
            return jsonify({"success": False, "error": "session_id and transcript required"}), 400

        session = interview_service.get_session(session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found"}), 404

        ownership_error = verify_ownership(session, request)
        if ownership_error:
            return ownership_error

        # Map video stage names to actual scripted questions if question_text is empty
        if not question_text and stage:
            video_scripted_questions_by_stage = {
                "candidate_intro": "Could you please introduce yourself and walk me through your background?",
                "candidate_resume": "I have your resume here. Could you please walk me through your key experience and projects?",
                "candidate_project": "Could you tell me about the most interesting project you've worked on, and the technologies you used?",
                "candidate_challenge": "Can you tell me about the biggest technical challenge you faced while building it, and how you resolved it?",
                "candidate_motivation": "What motivates you to apply to our company, and what do you hope to achieve here?"
            }
            question_text = video_scripted_questions_by_stage.get(stage, "")

        # Determine the index for this answer based on the stage sequence
        stage_indices = {
            "candidate_intro": 0,
            "candidate_resume": 1,
            "candidate_project": 2,
            "candidate_challenge": 3,
            "candidate_motivation": 4,
        }
        ans_idx = stage_indices.get(stage)
        if ans_idx is None:
            scripted_count = 5
            gemini_history = [h for h in conversation_history if h.get("stage") == "candidate_gemini_answer"]
            ans_idx = scripted_count + len(gemini_history)

        current_question = {
            "text": question_text or "Could you tell me about your background?",
            "category": "Scripted Onboarding" if ans_idx < 5 else "Gemini Dynamic",
            "type": "behavioral" if ans_idx in [0, 4] else "technical",
            "difficulty": session.get("difficulty", "medium"),
        }

        # Upsert answer in session["answers"] to avoid duplicates / race conditions
        answers = session.setdefault("answers", [])
        existing_ans = None
        for ans in answers:
            if ans.get("question_index") == ans_idx:
                existing_ans = ans
                break

        if existing_ans:
            existing_ans["answer"] = transcript
            existing_ans["question"] = current_question
        else:
            new_answer = {
                "question_index": ans_idx,
                "question": current_question,
                "answer": transcript,
                "voice_metrics": data.get("voice_metrics", {}) or {},  # pass through from request
                "emotion_metrics": data.get("emotion_metrics", {}) or {},
                "evaluation": {},
            }
            answers.append(new_answer)
            interview_service.add_answer(session_id, new_answer)

        # Sync chat history for live context memory
        chat_history = session.setdefault("chat_history", [])
        if not chat_history or chat_history[-1].get("text") != transcript:
            chat_history.append({"role": "interviewer", "text": question_text or "Could you tell me about your background?"})
            chat_history.append({"role": "candidate", "text": transcript})

        previous_scores = []
        for prior in answers:
            if prior.get("question_index") == ans_idx:
                continue
            score = (prior.get("evaluation") or {}).get("overall_score")
            if score is not None:
                previous_scores.append(score)

        evaluation = answer_evaluator.evaluate(
            question=current_question,
            answer=transcript,
            role=session.get("role", "software_engineer"),
            voice_metrics=data.get("voice_metrics", {}) or {},
            emotion_metrics=data.get("emotion_metrics", {}) or {},
            previous_scores=previous_scores,
            chat_history=chat_history,
            resume_data=session.get("resume_data", {}),
            interviewer_name="Marcus Rodriguez" if session.get("interviewer_persona") == "marcus" else "Sarah Chen",
        )

        if existing_ans:
            existing_ans["evaluation"] = evaluation
        else:
            answers[-1]["evaluation"] = evaluation

        session["background_interviewer"] = {
            "stage": stage,
            "question_index": ans_idx,
            "response": evaluation.get("interviewer_response", "Thanks, I have noted that. Let us continue."),
            "feedback": evaluation.get("feedback", "Answer analyzed."),
            "priority_focus": evaluation.get("priority_focus", "Add one concrete example."),
            "suggested_next_action": evaluation.get("suggested_next_action", "Structure the next answer clearly."),
            "overall_score": evaluation.get("overall_score", 0),
            "confidence_score": evaluation.get("confidence_score", 0),
            "strong_areas": evaluation.get("strong_areas", []),
            "weak_areas": evaluation.get("weak_areas", []),
            "live_tips": evaluation.get("live_tips", []),
        }

        interview_service.save_session(session_id, session)

        current_index = len(conversation_history)
        difficulty    = session.get("difficulty", "medium")
        company       = session.get("company", "General") or "General"

        next_q = question_generator.generate_next_adaptive_question(
            session=session,
            current_question_index=current_index,
            last_question_text=question_text or "Could you tell me about your background?",
            last_answer_text=transcript,
            difficulty=difficulty,
            company=company,
        )

        if not next_q or not next_q.get("text"):
            return jsonify({"success": False, "error": "Could not generate next question"}), 500

        logger.info(
            f"[analyze-live] stage={stage} session={session_id[:8]} "
            f"generated: {next_q.get('text', '')[:80]}"
        )
        return jsonify({"success": True, "next_question": next_q, "background_interviewer": session.get("background_interviewer")}), 200

    except Exception as e:
        logger.error(f"analyze-live error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
