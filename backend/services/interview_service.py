import logging
from datetime import datetime
from services import database as db

logger = logging.getLogger(__name__)


class InterviewService:
    """Manages interview sessions with SQLite persistence."""

    def save_session(self, session_id, session_data):
        """Update and save an existing session (public API)."""
        session_data["id"] = session_id
        db.save_session(session_data)
        return True

    def create_session(
        self,
        session_id,
        questions,
        resume_data,
        role,
        candidate_name,
        interview_format="voice",
        difficulty="medium",
        panel_mode=False,
        username=None,
    ):
        """Create a new interview session."""
        session = {
            "id": session_id,
            "username": username or "Candidate",
            "candidate_name": candidate_name,
            "role": role,
            "interview_format": interview_format,
            "difficulty": difficulty,
            "panel_mode": panel_mode,
            "questions": questions,
            "answers": [],
            "resume_data": resume_data,
            "status": "active",
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "results": None,
        }
        db.save_session(session)
        return session

    def get_session(self, session_id):
        """Retrieve a session by ID."""
        return db.get_session(session_id)

    def add_answer(self, session_id, answer_data):
        """Add an answer to a session."""
        session = db.get_session(session_id)
        if not session:
            return False
        answer_data["timestamp"] = datetime.utcnow().isoformat()
        session["answers"].append(answer_data)
        db.save_session(session)
        return True

    def complete_session(self, session_id):
        """Complete an interview and compute aggregate results."""
        session = db.get_session(session_id)
        if not session:
            raise ValueError("Session not found")

        answers = session.get("answers", [])
        if not answers:
            raise ValueError("No answers submitted")

        # Aggregate scores
        tech_scores = []
        clarity_scores = []
        completeness_scores = []
        relevance_scores = []
        depth_scores = []
        voice_delivery_scores = []
        speaking_paces = []
        filler_word_counts = []
        filler_word_ratios = []
        tremor_scores = []
        engagement_scores = []
        eye_contact_scores = []
        posture_scores = []
        emotion_labels = []
        weak_areas = []
        strong_areas = []
        difficulty_history = []
        topic_scores = {}

        for ans in answers:
            ev = ans.get("evaluation", {})
            if ev.get("technical_score") is not None:
                tech_scores.append(ev["technical_score"])
            if ev.get("clarity_score") is not None:
                clarity_scores.append(ev["clarity_score"])
            if ev.get("completeness_score") is not None:
                completeness_scores.append(ev["completeness_score"])
            if ev.get("relevance_score") is not None:
                relevance_scores.append(ev["relevance_score"])
            if ev.get("depth_score") is not None:
                depth_scores.append(ev["depth_score"])
            if ev.get("voice_delivery_score") is not None:
                voice_delivery_scores.append(ev["voice_delivery_score"])
            if ev.get("speaking_pace_wpm") is not None:
                speaking_paces.append(ev["speaking_pace_wpm"])
            if ev.get("filler_word_count") is not None:
                filler_word_counts.append(ev["filler_word_count"])
            if ev.get("filler_word_ratio") is not None:
                filler_word_ratios.append(ev["filler_word_ratio"])
            if ev.get("engagement_score") is not None:
                engagement_scores.append(ev["engagement_score"])
            if ev.get("eye_contact_score") is not None:
                eye_contact_scores.append(ev["eye_contact_score"])
            if ev.get("posture_score") is not None:
                posture_scores.append(ev["posture_score"])
            voice_met = ans.get("voice_metrics", {}) or {}
            if isinstance(voice_met, dict) and voice_met.get("tremor_score") is not None:
                tremor_scores.append(voice_met["tremor_score"])
            if ev.get("emotion_label"):
                emotion_labels.append(ev["emotion_label"])
            if ev.get("weak_areas"):
                weak_areas.extend(ev["weak_areas"])
            if ev.get("strong_areas"):
                strong_areas.extend(ev["strong_areas"])
            if ev.get("difficulty_adjustment"):
                difficulty_history.append(ev["difficulty_adjustment"])

            topic = ev.get("topic") or ans.get("question", {}).get(
                "category", "General"
            )
            if topic not in topic_scores:
                topic_scores[topic] = []
            if ev.get("overall_score") is not None:
                topic_scores[topic].append(ev["overall_score"])

        def safe_avg(lst):
            return round(sum(lst) / len(lst), 1) if lst else 0

        avg_tech = safe_avg(tech_scores)
        avg_clarity = safe_avg(clarity_scores)
        avg_completeness = safe_avg(completeness_scores)
        avg_relevance = safe_avg(relevance_scores)
        avg_depth = safe_avg(depth_scores)
        avg_voice_delivery = safe_avg(voice_delivery_scores)
        avg_pace = safe_avg(speaking_paces)
        avg_filler_ratio = safe_avg(filler_word_ratios)
        total_fillers = sum(filler_word_counts) if filler_word_counts else 0
        avg_engagement = safe_avg(engagement_scores)
        avg_eye_contact = safe_avg(eye_contact_scores)
        avg_posture = safe_avg(posture_scores)
        avg_tremor = safe_avg(tremor_scores)
        primary_emotion = (
            max(set(emotion_labels), key=emotion_labels.count)
            if emotion_labels
            else "uncertain"
        )

        overall = round(
            (
                avg_tech * 0.4
                + avg_clarity * 0.2
                + avg_completeness * 0.2
                + avg_relevance * 0.2
            ),
            1,
        )

        grade_map = [(90, "A+"), (80, "A"), (70, "B+"), (60, "B"), (50, "C+"), (0, "C")]
        grade = next(g for threshold, g in grade_map if overall >= threshold)

        skill_gaps = []
        for topic, scores in topic_scores.items():
            avg = round(sum(scores) / len(scores), 1)
            recommendation = (
                "Strong"
                if avg >= 70
                else "Review needed" if avg >= 50 else "Study required"
            )
            skill_gaps.append(
                {
                    "topic": topic,
                    "score": avg,
                    "count": len(scores),
                    "recommendation": recommendation,
                }
            )
        skill_gaps.sort(key=lambda x: x["score"])

        results = {
            "session_id": session_id,
            "candidate_name": session["candidate_name"],
            "role": session["role"],
            "total_questions": len(session["questions"]),
            "answered_questions": len(answers),
            "scores": {
                "overall": overall,
                "technical": avg_tech,
                "clarity": avg_clarity,
                "completeness": avg_completeness,
                "relevance": avg_relevance,
                "depth": avg_depth,
            },
            "voice": {
                "delivery": avg_voice_delivery,
                "speaking_pace_wpm": avg_pace,
                "filler_word_ratio": avg_filler_ratio,
                "filler_word_count": total_fillers,
                "tremor_score": avg_tremor,
            },
            "video": {
                "primary_emotion": primary_emotion,
                "engagement_score": avg_engagement,
                "eye_contact_score": avg_eye_contact,
                "posture_score": avg_posture,
            },
            "grade": grade,
            "interview_format": session.get("interview_format", "voice"),
            "weak_areas": list(set(weak_areas))[:5],
            "strong_areas": list(set(strong_areas))[:5],
            "skill_gaps": skill_gaps,
            "difficulty_history": difficulty_history,
            "answers": answers,
            "started_at": session["started_at"],
            "completed_at": datetime.utcnow().isoformat(),
            "duration_minutes": self._calc_duration(session["started_at"]),
        }

        # Compute Recruiter Metrics (AI Final Hiring Report)
        recruiter_confidence = min(100.0, max(40.0, (avg_voice_delivery + avg_engagement) / 2.0)) if (avg_voice_delivery and avg_engagement) else 92.0
        recruiter_problem_solving = min(100.0, max(40.0, (avg_relevance + avg_depth) / 2.0)) if (avg_relevance and avg_depth) else 87.0
        recruiter_behavior = min(100.0, max(40.0, (avg_posture + avg_eye_contact) / 2.0)) if (avg_posture and avg_eye_contact) else 95.0
        recruiter_professionalism = min(100.0, max(40.0, overall * 1.05))
        
        has_resume = bool(session.get("resume_data") and session["resume_data"].get("skills"))
        recruiter_resume_match = 93.0 if has_resume else 72.0

        verdict = "Recommended" if overall >= 72 else "Borderline" if overall >= 60 else "Not Recommended"
        hiring_rec = "Strong Hire" if overall >= 83 else "Hire" if overall >= 70 else "Borderline" if overall >= 60 else "Reject"

        study_plan_weeks = ["DBMS", "SQL", "REST APIs", "System Design"]
        if weak_areas:
            top_w = weak_areas[0].lower()
            if "dsa" in top_w or "algorithm" in top_w:
                study_plan_weeks = ["DSA Fundamentals", "Array & String Drills", "Graph Traversal", "Dynamic Programming"]
            elif "oop" in top_w or "object" in top_w:
                study_plan_weeks = ["OOP Basics", "Inheritance & Polymorphism", "Design Patterns", "Refactoring Clean Code"]
            elif "os" in top_w or "network" in top_w or "cn" in top_w:
                study_plan_weeks = ["OS & Kernel Basics", "TCP/IP Networking", "HTTP Protocol & APIs", "System Architecture"]
            elif "system design" in top_w or "scale" in top_w:
                study_plan_weeks = ["Microservices", "Load Balancing & Caching", "NoSQL Scaling", "High Availability Design"]

        # Compute Hiring Probability
        hiring_prob = min(100.0, max(10.0, overall * 0.95 + (avg_tech * 0.05 if avg_tech else 0)))

        # Compute Company Readiness Scores
        company_readiness = {
            "Google": min(100.0, max(10.0, round(overall * 0.85 + avg_tech * 0.1, 1))),
            "Amazon": min(100.0, max(10.0, round(overall * 0.88 + recruiter_problem_solving * 0.08, 1))),
            "Meta": min(100.0, max(10.0, round(overall * 0.87 + avg_tech * 0.09, 1))),
            "TCS": min(100.0, max(10.0, round(overall * 1.05, 1))),
            "Infosys": min(100.0, max(10.0, round(overall * 1.04, 1))),
            "Accenture": min(100.0, max(10.0, round(overall * 1.02, 1))),
        }

        results["recruiter_report"] = {
            "verdict": verdict,
            "hiring_recommendation": hiring_rec,
            "hiring_probability": round(hiring_prob, 1),
            "company_readiness": company_readiness,
            "metrics": {
                "confidence": round(recruiter_confidence, 1),
                "technical_knowledge": round(avg_tech, 1),
                "communication": round(avg_clarity, 1),
                "problem_solving": round(recruiter_problem_solving, 1),
                "behavior": round(recruiter_behavior, 1),
                "professionalism": round(recruiter_professionalism, 1),
                "resume_match": round(recruiter_resume_match, 1),
            },
            "study_plan": study_plan_weeks
        }

        session["status"] = "completed"
        session["completed_at"] = results["completed_at"]
        session["results"] = results
        db.save_session(session)
        return results

    def _calc_duration(self, start_iso: str) -> int:
        """Calculate interview duration in minutes."""
        try:
            start = datetime.fromisoformat(start_iso)
            diff = datetime.utcnow() - start
            return max(1, int(diff.total_seconds() / 60))
        except Exception:
            return 0

    def get_all_sessions(self, username=None):
        """Get all sessions (summary only)."""
        sessions = db.get_all_sessions(username)
        summaries = []
        for s in sessions:
            summaries.append(
                {
                    "id": s["id"],
                    "candidate_name": s.get("candidate_name", "Unknown"),
                    "role": s.get("role", "N/A"),
                    "interview_format": s.get("interview_format", "voice"),
                    "status": s.get("status", "unknown"),
                    "started_at": s.get("started_at"),
                    "completed_at": s.get("completed_at"),
                    "overall_score": (
                        s.get("results", {}).get("scores", {}).get("overall")
                        if s.get("results")
                        else None
                    ),
                }
            )
        return sorted(summaries, key=lambda x: x.get("started_at", ""), reverse=True)

    def delete_session(self, session_id):
        """Delete a session."""
        db.delete_session(session_id)
