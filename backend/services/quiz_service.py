import json
import logging
import os
import random
import uuid
from datetime import datetime
from typing import Dict, List
from config import get_config
from ai.gemini_service import GeminiService
from services.quiz_bank import QUIZ_BANK

logger = logging.getLogger(__name__)

config = get_config()
DATA_FILE = config.QUIZZES_FILE


class QuizService:
    """Manages quiz sessions for interview practice."""

    def __init__(self):
        self._sessions: Dict[str, dict] = {}
        self.gemini = GeminiService()
        self._load_from_disk()

    def _load_from_disk(self):
        try:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, "r") as handle:
                    self._sessions = json.load(handle)
            else:
                self._sessions = {}
        except Exception as exc:
            logger.error(f"Failed to load quiz data: {exc}")
            self._sessions = {}

    def _save_to_disk(self):
        try:
            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, "w") as handle:
                json.dump(self._sessions, handle, indent=2, default=str)
        except Exception as exc:
            logger.error(f"Failed to save quiz data: {exc}")

    def get_topics(self) -> List[str]:
        return sorted(QUIZ_BANK.keys())

    def build_questions(
        self,
        topic: str,
        difficulty: str,
        num_questions: int,
        quiz_type: str = "technical",
        company: str = "General"
    ) -> List[dict]:
        if self.gemini.is_available():
            prompt = ""
            if quiz_type == "aptitude":
                prompt = f"""You are a professional quiz maker and technical interviewer. Generate a JSON list of exactly {num_questions} multiple choice questions for an Aptitude & Reasoning test.
                
                Topic: {topic.title()}
                Difficulty Level: {difficulty}
                Company Pattern: {company}
                
                Aptitude domains should cover Quantitative Aptitude, Logical Reasoning, or Verbal Ability.
                
                The output must be a JSON array. Each object in the array must contain:
                1. "question": "<the question text>"
                2. "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"]
                3. "correct_index": <0, 1, 2, or 3 - the index of the correct option>
                4. "explanation": "<a detailed explanation of the steps to solve the question>"
                5. "option_feedback": ["<feedback for option 1>", "<feedback for option 2>", "<feedback for option 3>", "<feedback for option 4>"]
                6. "short_trick": "<A very short, elegant math trick or reasoning shortcut to solve this question in under 30 seconds>"
                
                Return ONLY the raw JSON array."""
            elif quiz_type == "debugging":
                prompt = f"""You are a professional software engineer and interviewer. Generate a JSON list of exactly {num_questions} debugging and code-fixing questions.
                
                Topic: {topic.title()} (e.g. Python, SQL, React, APIs, Runtime Errors, logical errors)
                Difficulty Level: {difficulty}
                
                The questions should present a broken code block, syntax error, logical bug, or failing API response (500 status code, etc.) and ask how to fix it.
                
                The output must be a JSON array. Each object in the array must contain:
                1. "question": "<a description of the bug, including a formatted markdown code snippet showing the broken code>"
                2. "options": ["<fix option 1>", "<fix option 2>", "<fix option 3>", "<fix option 4>"]
                3. "correct_index": <0, 1, 2, or 3 - the index of the correct fix option>
                4. "explanation": "<a detailed explanation of the bug, why it occurred, and how the correct fix resolves it>"
                5. "option_feedback": ["<feedback for option 1>", "<feedback for option 2>", "<feedback for option 3>", "<feedback for option 4>"]
                
                Return ONLY the raw JSON array."""
            elif quiz_type == "company":
                prompt = f"""You are a senior hiring manager and tech interviewer at {company}. Generate a JSON list of exactly {num_questions} multiple choice questions simulating the actual hiring assessment of {company}.
                
                Company: {company}
                Difficulty Level: {difficulty}
                
                The questions should be a realistic blend of coding (Python/SQL), CS fundamentals (OOP/DBMS), debugging, and behavioral/leadership scenarios that matches {company}'s actual interview pattern (e.g. leadership principles for Amazon, algorithms for Google, quantitative/verbal aptitude for TCS/Infosys).
                
                The output must be a JSON array. Each object in the array must contain:
                1. "question": "<the question text, including code snippets or scenarios where appropriate>"
                2. "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"]
                3. "correct_index": <0, 1, 2, or 3 - the index of the correct option>
                4. "explanation": "<a detailed explanation of the solution or expected behavioral alignment>"
                5. "option_feedback": ["<feedback for option 1>", "<feedback for option 2>", "<feedback for option 3>", "<feedback for option 4>"]
                
                Return ONLY the raw JSON array."""
            else:
                prompt = f"""You are a professional quiz maker and technical interviewer. Generate a JSON list of exactly {num_questions} multiple choice questions for a Technical Mastery test.
                
                Topic: {topic.title()} (e.g. Python, SQL, DBMS, OS, Networks, OOP, System Design, REST APIs, Git, Cloud Basics)
                Difficulty Level: {difficulty}
                Company context (optional): {company}
                
                Questions should test core concepts, output prediction, code snippets, or system design trade-offs.
                
                The output must be a JSON array. Each object in the array must contain:
                1. "question": "<the question text, incorporating code snippets or technical diagrams where appropriate>"
                2. "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"]
                3. "correct_index": <0, 1, 2, or 3 - the index of the correct option>
                4. "explanation": "<a detailed technical explanation of why the correct option is right>"
                5. "option_feedback": ["<feedback for option 1>", "<feedback for option 2>", "<feedback for option 3>", "<feedback for option 4>"]
                
                Return ONLY the raw JSON array."""

            try:
                res = self.gemini.generate_json(prompt)
                if isinstance(res, list) and len(res) > 0:
                    questions = []
                    for index, item in enumerate(res[:num_questions]):
                        correct_index = int(item.get("correct_index", 0))
                        if correct_index < 0 or correct_index > 3:
                            correct_index = 0
                        options = item.get("options", ["Option 1", "Option 2", "Option 3", "Option 4"])
                        if len(options) < 4:
                            options = (options + ["Option 1", "Option 2", "Option 3", "Option 4"])[:4]

                        option_feedback = item.get("option_feedback", [])
                        if len(option_feedback) < 4:
                            option_feedback = (option_feedback + [
                                "Incorrect option.",
                                "Incorrect option.",
                                "Incorrect option.",
                                "Incorrect option."
                            ])[:4]
                        option_feedback[correct_index] = item.get("explanation", "Correct!")

                        questions.append({
                            "id": f"q-{index + 1}",
                            "question": item.get("question", "Question?"),
                            "options": options,
                            "correct_index": correct_index,
                            "explanation": item.get("explanation", "No explanation provided."),
                            "option_feedback": option_feedback,
                            "topic": topic,
                            "difficulty": difficulty,
                            "short_trick": item.get("short_trick", None)
                        })
                    return questions
            except Exception as e:
                logger.error(f"Failed to generate quiz questions with Gemini: {e}. Falling back to static bank.")

        topic_bank = QUIZ_BANK.get(topic.lower(), QUIZ_BANK["python"])
        question_pool = topic_bank.get(difficulty.lower(), topic_bank["medium"])
        randomized_pool = question_pool[:]
        random.shuffle(randomized_pool)
        questions = []
        for index in range(num_questions):
            template = randomized_pool[index % len(randomized_pool)]
            questions.append(
                {
                    "id": f"q-{index + 1}",
                    "question": template["question"],
                    "options": template["options"],
                    "correct_index": template["correct_index"],
                    "explanation": template["explanation"],
                    "option_feedback": template.get("option_feedback", []),
                    "topic": topic,
                    "difficulty": difficulty,
                    "short_trick": None
                }
            )
        return questions

    def start_quiz(
        self,
        topic: str,
        difficulty: str,
        num_questions: int,
        candidate_name: str = "Candidate",
        quiz_type: str = "technical",
        company: str = "General",
        username: str = "Candidate",
    ) -> dict:
        self._load_from_disk()
        session_id = str(uuid.uuid4())
        questions = self.build_questions(topic, difficulty, num_questions, quiz_type, company)
        session = {
            "id": session_id,
            "username": username or "Candidate",
            "candidate_name": candidate_name,
            "quiz_type": quiz_type,
            "topic": topic,
            "difficulty": difficulty,
            "company": company,
            "questions": questions,
            "responses": [],
            "status": "active",
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "results": None,
        }
        self._sessions[session_id] = session
        self._save_to_disk()
        return {
            "session_id": session_id,
            "questions": questions,
            "total_questions": len(questions),
            "topic": topic,
            "difficulty": difficulty,
            "quiz_type": quiz_type,
            "company": company
        }

    def get_session(self, session_id: str) -> dict:
        self._load_from_disk()
        return self._sessions.get(session_id)

    def submit_answer(
        self, session_id: str, question_index: int, selected_index: int
    ) -> dict:
        self._load_from_disk()
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError("Quiz session not found")
        if question_index < 0 or question_index >= len(session["questions"]):
            raise ValueError("Question index out of range")

        question = session["questions"][question_index]
        is_correct = int(selected_index) == int(question["correct_index"])
        score = 1 if is_correct else 0
        selected_option = (
            question["options"][selected_index]
            if 0 <= selected_index < len(question["options"])
            else None
        )
        correct_option = (
            question["options"][question["correct_index"]]
            if 0 <= question["correct_index"] < len(question["options"])
            else None
        )
        option_feedback = question.get("option_feedback", [])
        selected_reason = (
            option_feedback[selected_index]
            if 0 <= selected_index < len(option_feedback)
            else None
        )
        correct_reason = (
            option_feedback[question["correct_index"]]
            if 0 <= question["correct_index"] < len(option_feedback)
            else None
        )
        response = {
            "question_index": question_index,
            "question": question,
            "selected_index": selected_index,
            "is_correct": is_correct,
            "score": score,
            "feedback": question["explanation"],
            "selected_option": selected_option,
            "correct_option": correct_option,
            "selected_reason": selected_reason,
            "correct_reason": correct_reason,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if len(session["responses"]) <= question_index:
            session["responses"].append(response)
        else:
            session["responses"][question_index] = response
        self._save_to_disk()

        return {
            "success": True,
            "is_correct": is_correct,
            "correct_index": question["correct_index"],
            "selected_index": selected_index,
            "selected_option": selected_option,
            "correct_option": correct_option,
            "explanation": question["explanation"],
            "selected_reason": selected_reason,
            "correct_reason": correct_reason,
            "next_index": question_index + 1,
            "is_complete": question_index + 1 >= len(session["questions"]),
        }

    def complete_quiz(self, session_id: str) -> dict:
        self._load_from_disk()
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError("Quiz session not found")

        responses = session.get("responses", [])
        total_questions = len(session.get("questions", []))
        correct_answers = sum(1 for response in responses if response.get("is_correct"))
        score = (
            round((correct_answers / total_questions) * 100, 1)
            if total_questions
            else 0
        )
        accuracy = score

        weak_topics = []
        if score < 60:
            weak_topics.append(session.get("topic", "general"))

        results = {
            "session_id": session_id,
            "candidate_name": session.get("candidate_name", "Candidate"),
            "topic": session.get("topic", "general"),
            "difficulty": session.get("difficulty", "medium"),
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "score": score,
            "accuracy": accuracy,
            "weak_topics": weak_topics,
            "responses": responses,
            "completed_at": datetime.utcnow().isoformat(),
        }

        session["status"] = "completed"
        session["completed_at"] = results["completed_at"]
        session["results"] = results
        self._save_to_disk()
        return results

    def get_sessions(self, username: str = None) -> List[dict]:
        self._load_from_disk()
        sessions = list(self._sessions.values())
        if username:
            sessions = [s for s in sessions if s.get("username") == username]
        sessions.sort(key=lambda item: item.get("started_at", ""), reverse=True)
        return [
            {
                "id": session["id"],
                "candidate_name": session.get("candidate_name", "Candidate"),
                "topic": session.get("topic", "general"),
                "difficulty": session.get("difficulty", "medium"),
                "status": session.get("status", "active"),
                "score": (
                    session.get("results", {}).get("score")
                    if session.get("results")
                    else None
                ),
                "started_at": session.get("started_at"),
                "completed_at": session.get("completed_at"),
            }
            for session in sessions
        ]
