import logging
import random
from typing import Optional, List
from pydantic import BaseModel, Field
from ai.gemini_service import GeminiService
from utils.prompt_sanitizer import sanitize_answer

logger = logging.getLogger(__name__)


class StarRubricSchema(BaseModel):
    situation: int = Field(..., ge=0, le=100)
    task: int = Field(..., ge=0, le=100)
    action: int = Field(..., ge=0, le=100)
    result: int = Field(..., ge=0, le=100)


class EvaluationSchema(BaseModel):
    technical_score: int = Field(..., ge=0, le=100)
    clarity_score: int = Field(..., ge=0, le=100)
    completeness_score: int = Field(..., ge=0, le=100)
    relevance_score: int = Field(..., ge=0, le=100)
    depth_score: int = Field(..., ge=0, le=100)
    overall_score: int = Field(..., ge=0, le=100)
    topic: str
    strong_areas: List[str]
    weak_areas: List[str]
    feedback: str
    ideal_answer_hints: str
    confidence_score: int = Field(..., ge=0, le=100)
    structure_score: int = Field(..., ge=0, le=100)
    star_rubric: StarRubricSchema
    priority_focus: str
    suggested_next_action: str
    follow_up_prompt: str
    coach_notes: List[str]
    live_tips: List[str]
    difficulty_adjustment: str
    speaking_pace_wpm: int
    filler_word_count: int
    filler_word_ratio: int
    voice_delivery_score: int
    voice_feedback: str
    emotion_label: str
    engagement_score: int = Field(..., ge=0, le=100)
    eye_contact_score: int = Field(..., ge=0, le=100)
    posture_score: int = Field(..., ge=0, le=100)
    posture_label: str
    emotion_feedback: str
    sentiment: str
    interviewer_response: str


class AnswerEvaluator:
    """Evaluates interview answers using Gemini AI with adaptive scoring"""

    def __init__(self):
        self.gemini = GeminiService()

    def evaluate(
        self,
        question: dict,
        answer: str,
        role: str = "software_engineer",
        voice_metrics: Optional[dict] = None,
        emotion_metrics: Optional[dict] = None,
        previous_scores: Optional[list] = None,
    ) -> dict:
        """Evaluate an answer and return detailed feedback with adaptive fields"""
        # Check for God Mode override
        if emotion_metrics and (emotion_metrics.get("god_mode") or emotion_metrics.get("godmode")):
            return {
                "technical_score": 98,
                "clarity_score": 96,
                "completeness_score": 95,
                "relevance_score": 97,
                "depth_score": 96,
                "overall_score": 97,
                "topic": question.get("topic", "General"),
                "strong_areas": ["Outstanding technical depth", "Flawless communication clarity", "Excellent structural reasoning"],
                "weak_areas": [],
                "feedback": "Outstanding response! You demonstrated exceptional mastery of the topic, structuring your answer perfectly with clear, precise details.",
                "ideal_answer_hints": "N/A",
                "confidence_score": 98,
                "structure_score": 96,
                "star_rubric": {
                    "situation": 98,
                    "task": 96,
                    "action": 97,
                    "result": 98
                },
                "priority_focus": "None",
                "suggested_next_action": "Keep up the excellent work.",
                "follow_up_prompt": "Excellent. Let's move to the next question.",
                "coach_notes": ["Perfect response matching senior engineer guidelines"],
                "live_tips": ["Outstanding pacing and tone"],
                "difficulty_adjustment": "maintain",
                "speaking_pace_wpm": voice_metrics.get("speaking_pace_wpm", 140) if voice_metrics else 140,
                "filler_word_count": voice_metrics.get("filler_count", 0) if voice_metrics else 0,
                "filler_word_ratio": voice_metrics.get("filler_ratio", 0) if voice_metrics else 0,
                "voice_delivery_score": 98,
                "voice_feedback": "Perfect tone, stable pitch, and zero filler words.",
                "emotion_label": "Focused",
                "engagement_score": 98,
                "eye_contact_score": 98,
                "posture_score": 96,
                "posture_label": "Good",
                "emotion_feedback": "Excellent focus and professional presence.",
                "sentiment": "Positive",
                "interviewer_response": "Excellent, that was a strong and well-structured answer. Let us continue with the next question.",
            }

        cleaned_answer = answer.strip().lower().replace(".", "").replace("!", "").replace("?", "")
        words = cleaned_answer.split()
        
        is_greeting = cleaned_answer in ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "yo", "sup"]
        is_too_short = len(words) < 3
        
        if is_greeting or is_too_short:
            return {
                "technical_score": 0,
                "clarity_score": 0,
                "completeness_score": 0,
                "relevance_score": 0,
                "depth_score": 0,
                "overall_score": 0,
                "topic": question.get("topic", "General"),
                "strong_areas": [],
                "weak_areas": ["Insufficient answer length"],
                "feedback": f"You didn't provide an answer to the question (you said: '{answer}'). Please provide a complete technical or behavioral response so the AI can evaluate your skills.",
                "ideal_answer_hints": question.get("ideal_answer_hints", "Try explaining the concept using the STAR method or providing code details."),
                "confidence_score": 0,
                "structure_score": 0,
                "priority_focus": "Provide a complete answer",
                "suggested_next_action": "Read the question carefully and try to explain it in 2-3 sentences.",
                "follow_up_prompt": f"Let's try again. Can you explain: {question.get('text', 'the topic')}?",
                "coach_notes": ["Answer was too short or a simple greeting"],
                "live_tips": ["Speak louder and provide technical details"],
                "difficulty_adjustment": "maintain",
                "speaking_pace_wpm": voice_metrics.get("speaking_pace_wpm", 0) if voice_metrics else 0,
                "filler_word_count": voice_metrics.get("filler_count", 0) if voice_metrics else 0,
                "filler_word_ratio": voice_metrics.get("filler_ratio", 0) if voice_metrics else 0,
                "voice_delivery_score": voice_metrics.get("delivery_score", 0) if voice_metrics else 0,
                "voice_feedback": voice_metrics.get("summary", "No voice input captured.") if voice_metrics else "No voice input captured.",
                "emotion_label": emotion_metrics.get("emotion_label", "Neutral") if emotion_metrics else "Neutral",
                "engagement_score": emotion_metrics.get("engagement_score", 50) if emotion_metrics else 50,
                "eye_contact_score": emotion_metrics.get("eye_contact_score", 50) if emotion_metrics else 50,
                "posture_score": emotion_metrics.get("posture_score", 50) if emotion_metrics else 50,
                "posture_label": emotion_metrics.get("posture_label", "Good") if emotion_metrics else "Good",
                "emotion_feedback": emotion_metrics.get("emotion_feedback", "N/A") if emotion_metrics else "N/A",
                "sentiment": "neutral",
                "interviewer_response": "I need a more complete answer before I can assess that properly. Let us try the next prompt carefully.",
            }

        # Sanitize answer before sending to AI to prevent prompt injection
        answer = sanitize_answer(answer)

        if self.gemini.is_available():
            result = self._evaluate_with_gemini(
                question,
                answer,
                role,
                voice_metrics=voice_metrics,
                emotion_metrics=emotion_metrics,
                previous_scores=previous_scores,
            )
            if result:
                return result

        logger.info("Using fallback evaluation")
        return self._fallback_evaluation(
            answer,
            question=question,
            voice_metrics=voice_metrics,
            emotion_metrics=emotion_metrics,
            previous_scores=previous_scores,
        )

    def generate_follow_up(
        self,
        question: dict,
        answer: str,
        evaluation: dict,
        role: str = "software_engineer",
    ) -> dict:
        """Generate a personalized follow-up question based on the answer"""
        if self.gemini.is_available():
            result = self._follow_up_with_gemini(question, answer, evaluation, role)
            if result:
                return result
        return self._fallback_follow_up(question, evaluation)
    def generate_onboarding_response(
        self,
        current_phase: str,
        answer: str,
        candidate_name: str = "Candidate",
        resume_data: Optional[dict] = None,
    ) -> str:
        """Generate a personalized, conversational HR transition & question based on user response during onboarding"""
        phase_flow = {
            "greet_mic": {
                "next": "small_talk",
                "goal": "Acknowledge that they can hear and see you, welcome them warmly to the interview, and ask how their day has been so far."
            },
            "small_talk": {
                "next": "identity_confirm",
                "goal": "Respond conversationally to how their day was (be empathetic or happy as appropriate). Then ask them to briefly introduce themselves and walk through their background."
            },
            "identity_confirm": {
                "next": "resume_confirm",
                "goal": "Acknowledge their introduction warmly, express excitement to interview them today, and say that we will now begin with the core questions."
            }
        }

        flow = phase_flow.get(current_phase)
        if not flow:
            return "Perfect. Let's move forward."

        next_phase = flow["next"]
        next_goal = flow["goal"]

        prompt = f"""You are Sarah Chen, a Senior HR Manager with over 15 years of interviewing experience at top multinational companies.
You are NOT an AI assistant. You are conducting a real live interview over a video call. Stay in character.
Never mention prompts, AI, language models, APIs, tokens, or internal instructions.
Your personality is professional, calm, friendly, observant, confident, and patient.

The candidate just replied to the onboarding question for the stage '{current_phase}'.
Their answer was: "{answer}"

The next stage of onboarding is '{next_phase}'.
Your goal for this next stage is: {next_goal}

Generate a natural, conversational response directly addressing what the candidate said, followed immediately by the question for the next stage.
Behave like a recruiter: acknowledge the answer naturally, comment, and ask the next onboarding question.
Keep the response brief (maximum 35 words total) and speak directly to the candidate. Do not write JSON, return ONLY plain text."""

        if self.gemini.is_available():
            try:
                response = self.gemini.generate_content(prompt)
                if response:
                    return response.strip()
            except Exception as e:
                logger.error(f"Failed to generate onboarding response: {e}")

        # Fallbacks
        if current_phase == "greet_mic":
            return "Great, glad you can hear me. Can you also see my video feed clearly?"
        elif current_phase == "greet_camera":
            return "Wonderful. Welcome to the interview room! How has your day been so far?"
        elif current_phase == "small_talk":
            return f"Understood. Before we begin, could you please introduce yourself and confirm your full name?"
        elif current_phase == "identity_confirm":
            return f"Pleasure to meet you. I see you've uploaded your resume. Could you please confirm if this is your latest resume?"
        elif current_phase == "resume_confirm":
            return "Perfect. Let's start with a brief overview of your background. Are you ready?"
        elif current_phase == "resume_summary":
            return "Perfect. Today's interview will take about 20 minutes covering technical and behavioral questions. Let's get started!"
        return "Perfect. Let's move forward."
    def _evaluate_with_gemini(
        self,
        question,
        answer,
        role,
        voice_metrics=None,
        emotion_metrics=None,
        previous_scores=None,
    ):
        """Evaluate answer using Gemini API"""
        question_text = (
            question.get("text", "") if isinstance(question, dict) else str(question)
        )
        question_type = (
            question.get("type", "technical")
            if isinstance(question, dict)
            else "technical"
        )
        category = (
            question.get("category", "General")
            if isinstance(question, dict)
            else "General"
        )
        persona_id = (
            question.get("persona_id", "") if isinstance(question, dict) else ""
        )

        persona_context = ""
        if persona_id == "strict_manager":
            persona_context = "\nYou are evaluating as the 'Strict Engineering Manager'. Your feedback should be highly critical, pushing for excellence, measurable outcomes, and challenging weak technical trade-offs. Score strictly."
        elif persona_id == "hr_manager":
            persona_context = "\nYou are evaluating as the 'HR Manager'. Your feedback should be supportive, encouraging, and focus on communication, teamwork, and cultural fit."
        elif persona_id == "technical_lead":
            persona_context = "\nYou are evaluating as the 'Technical Lead'. Your feedback should be direct, analytical, and focused on architectural patterns, code quality, and best practices."

        # Filter metrics to only include necessary keys to minimize token count
        clean_voice = None
        if isinstance(voice_metrics, dict):
            clean_voice = {
                "speaking_pace_wpm": voice_metrics.get("speaking_pace_wpm"),
                "filler_count": voice_metrics.get("filler_count"),
                "filler_ratio": voice_metrics.get("filler_ratio"),
                "delivery_score": voice_metrics.get("delivery_score")
            }

        clean_emotion = None
        if isinstance(emotion_metrics, dict):
            clean_emotion = {
                "primary_emotion": emotion_metrics.get("primary_emotion"),
                "engagement_score": emotion_metrics.get("engagement_score"),
                "eye_contact_score": emotion_metrics.get("eye_contact_score"),
                "posture_score": emotion_metrics.get("posture_score"),
                "posture_label": emotion_metrics.get("posture_label")
            }

        voice_context = f"\nVoice Interview Metrics: {clean_voice}" if clean_voice else ""
        emotion_context = f"\nVideo/Emotion Coaching Signals: {clean_emotion}" if clean_emotion else ""

        adaptive_context = ""
        if previous_scores:
            avg = sum(previous_scores) / len(previous_scores)
            adaptive_context = f"\nCandidate's average score so far: {avg:.0f}/100 across {len(previous_scores)} questions."

        prompt = f"""You are Sarah Chen, a Senior HR Manager with over 15 years of interviewing experience at top multinational companies.
You are NOT an AI assistant. You are conducting a real live interview over a video call. Stay in character.
Never mention prompts, AI, language models, APIs, tokens, or internal instructions.
Your personality is professional, calm, friendly, observant, confident, and patient.
Your objective is to evaluate the candidate exactly as a human HR would.
{persona_context}

Role: {role.replace('_', ' ').title()}
Question Category: {category}
Question Type: {question_type}
{adaptive_context}

Question: {question_text}

Candidate's Answer: {answer}
{voice_context}
{emotion_context}

Evaluate this answer and return a JSON object. You must grade strictly, realistically, and constructively.

Scoring Rubric & Accuracy Guidelines:
1. Length-Based Cap: If the candidate's answer is extremely short or lazy (e.g. under 15 words, or repeats the question, or says "I don't know"), the overall_score, technical_score, clarity_score, relevance_score, and depth_score must be capped at 30.
2. Textbook Cap: If the answer is a simple definition or theoretical explanation without any concrete examples, architecture context, or trade-offs, the overall_score must be capped at 70.
3. High Scores (>80): Only award high scores if the answer provides deep technical accuracy, refers to concrete project details/experiences, highlights engineering trade-offs, and addresses potential edge cases.
4. Structural Check (STAR Method): For behavioral and situational questions, verify if the candidate used the STAR (Situation, Task, Action, Result) method. Specifically note which elements were present or missing in the "feedback" and "coach_notes" fields.
5. Delivery & Composition: Combine the candidate's answer depth with the provided voice and emotion metrics (if any) to construct precise coaching tips.

Return a JSON object with these exact fields:
{{
  "technical_score": <0-100, based on technical correctness and depth>,
  "clarity_score": <0-100, based on articulation and logic>,
  "completeness_score": <0-100, did they answer all parts of the question>,
  "relevance_score": <0-100, how directly they answered the prompt>,
  "depth_score": <0-100, how deep the technical/situational details go>,
  "overall_score": <0-100, weighted combination of the above based on your rubric>,
  "topic": "<main technical topic of the question>",
  "strong_areas": ["<specific strength 1>", "<specific strength 2>"],
  "weak_areas": ["<specific gap/weakness 1>", "<specific gap/weakness 2>"],
  "feedback": "<2-3 sentences of constructive and realistic feedback, describing exactly what was good and what was missing or shallow>",
  "ideal_answer_hints": "<brief hint showing what a perfect, industry-grade response would look like>",
  "confidence_score": <0-100, estimated based on clarity, structure, and pacing>,
  "structure_score": <0-100, based on STAR method for behavioral, or logical layout for technical>,
  "star_rubric": {{
    "situation": <0-100, Situation completeness score based on context provided>,
    "task": <0-100, Task completeness score based on clarity of objectives>,
    "action": <0-100, Action completeness score based on detailed steps described>,
    "result": <0-100, Result completeness score based on outcomes or metrics shared>
  }},
  "priority_focus": "<single coaching focus for their next answer, e.g. 'Use quantitative metrics' or 'Explain trade-offs first'>",
  "suggested_next_action": "<one concrete step to improve, e.g. 'Read up on event delegation' or 'Practice framing conflicts using STAR'>",
  "follow_up_prompt": "<a follow-up question to dig deeper into a weak/unclear part of their answer>",
  "coach_notes": ["<coaching note 1, e.g. 'Missing Action element in STAR'>", "<coaching note 2, e.g. 'Good technical depth on indexing'>"],
  "live_tips": ["<real-time tip 1>", "<tip 2>", "<tip 3>"],
  "difficulty_adjustment": "<increase|maintain|decrease> (increase if overall_score >= 80, decrease if overall_score < 45, maintain otherwise)",
  "speaking_pace_wpm": <integer or 0>,
  "filler_word_count": <integer>,
  "filler_word_ratio": <0-100>,
  "voice_delivery_score": <0-100>,
  "voice_feedback": "<short constructive feedback on pace and voice delivery>",
  "emotion_label": "<focused|calm|energetic|nervous|disengaged|uncertain>",
  "engagement_score": <0-100>,
  "eye_contact_score": <0-100>,
  "posture_score": <0-100, based on posture quality, reading from the provided posture_score if present>,
  "posture_label": "<Good|Slouched|Leaning Left|Leaning Right>",
  "emotion_feedback": "<short constructive feedback on camera presence, eye contact, and posture>",
  "sentiment": "positive" | "neutral" | "negative" (must be "positive" if overall_score >= 75, "neutral" if 45-74, "negative" if < 45),
  "interviewer_response": "<A warm, natural 1-2 sentence spoken HR response directly to the candidate about their answer. No generic transitions. Max 25 words.>"
}}

Be fair but honest. If the answer is very short or vague, score accordingly."""

        result = self.gemini.generate_json(prompt)
        if result and isinstance(result, dict):
            import json
            try:
                check_dict = result.copy()
                for f in ["technical_score", "clarity_score", "completeness_score", "relevance_score", "depth_score", "overall_score", "confidence_score", "structure_score", "speaking_pace_wpm", "filler_word_count", "filler_word_ratio", "voice_delivery_score", "engagement_score", "eye_contact_score", "posture_score"]:
                    check_dict[f] = int(check_dict.get(f, 50))
                for f in ["strong_areas", "weak_areas", "coach_notes", "live_tips"]:
                    if f not in check_dict or not isinstance(check_dict[f], list):
                        check_dict[f] = []
                if "star_rubric" not in check_dict or not isinstance(check_dict["star_rubric"], dict):
                    check_dict["star_rubric"] = {}
                sr = check_dict["star_rubric"]
                for k in ["situation", "task", "action", "result"]:
                    sr[k] = int(sr.get(k, 50))
                EvaluationSchema(**check_dict)
                return self._validate_evaluation(
                    result, voice_metrics=voice_metrics, emotion_metrics=emotion_metrics
                )
            except Exception as e:
                logger.warning(f"AI JSON result failed schema validation: {e}. Starting self-repair loop...")
                repair_prompt = f"""You previously evaluated an interview response and returned JSON, but it failed validation.

Error trace: {e}

Your Invalid JSON Output:
{json.dumps(result, indent=2)}

Please fix the output to strictly comply with the schema format. Adhere to integer bounds (0-100) and ensure all requested keys are present. Return ONLY valid JSON."""
                
                repaired = self.gemini.generate_json(repair_prompt)
                if repaired and isinstance(repaired, dict):
                    try:
                        check_repaired = repaired.copy()
                        for f in ["technical_score", "clarity_score", "completeness_score", "relevance_score", "depth_score", "overall_score", "confidence_score", "structure_score", "speaking_pace_wpm", "filler_word_count", "filler_word_ratio", "voice_delivery_score", "engagement_score", "eye_contact_score", "posture_score"]:
                            check_repaired[f] = int(check_repaired.get(f, 50))
                        for f in ["strong_areas", "weak_areas", "coach_notes", "live_tips"]:
                            if f not in check_repaired or not isinstance(check_repaired[f], list):
                                check_repaired[f] = []
                        if "star_rubric" not in check_repaired or not isinstance(check_repaired["star_rubric"], dict):
                            check_repaired["star_rubric"] = {}
                        sr = check_repaired["star_rubric"]
                        for k in ["situation", "task", "action", "result"]:
                            sr[k] = int(sr.get(k, 50))
                        EvaluationSchema(**check_repaired)
                        logger.info("✓ AI Self-repair loop successfully healed the JSON evaluation!")
                        return self._validate_evaluation(
                            repaired, voice_metrics=voice_metrics, emotion_metrics=emotion_metrics
                        )
                    except Exception as err:
                        logger.warning(f"Self-repair output still invalid: {err}. Using default coercion.")
                
                return self._validate_evaluation(
                    result, voice_metrics=voice_metrics, emotion_metrics=emotion_metrics
                )

        return None

    def _follow_up_with_gemini(self, question, answer, evaluation, role):
        """Generate follow-up question using Gemini"""
        question_text = (
            question.get("text", "") if isinstance(question, dict) else str(question)
        )
        weak_areas = evaluation.get("weak_areas", [])
        score = evaluation.get("overall_score", 50)

        prompt = f"""You are an interviewer for a {role.replace('_', ' ').title()} role.

Original question: {question_text}
Candidate's answer: {answer}
Score: {score}/100
Weak areas: {', '.join(weak_areas) if weak_areas else 'none identified'}

Generate a follow-up question that:
- Digs deeper into a weak area of their answer
- Tests if they truly understand the concept or just memorized it
- Feels natural, like a real interviewer would ask

Return JSON:
{{
  "text": "<the follow-up question>",
  "category": "<topic category>",
  "type": "technical",
  "difficulty": "{'hard' if score > 70 else 'medium' if score > 40 else 'easy'}",
  "is_follow_up": true,
  "parent_question": "{question_text[:60]}..."
}}"""

        result = self.gemini.generate_json(prompt)
        if result and isinstance(result, dict) and result.get("text"):
            result["is_follow_up"] = True
            return result
        return None

    def _fallback_follow_up(self, question, evaluation):
        """Generate rule-based follow-up question"""
        question_text = (
            question.get("text", "") if isinstance(question, dict) else str(question)
        )
        question_type = (
            question.get("type", "technical")
            if isinstance(question, dict)
            else "technical"
        )
        topic = evaluation.get("topic", "this topic")
        score = evaluation.get("overall_score", 50)

        if question_type == "behavioral":
            templates = [
                "What was the measurable outcome of that experience?",
                "Looking back, what would you do differently?",
                "How did that change how you approach similar situations now?",
            ]
        elif question_type == "situational":
            templates = [
                "What would be the first thing you do in the first 30 minutes?",
                "How would you prioritize if you had limited time and resources?",
                "What if the constraint you mentioned was removed — how would your approach change?",
            ]
        else:
            templates = [
                f"Can you go deeper on the technical implementation of {topic}?",
                "What would be the trade-offs of the approach you described?",
                "How would you handle edge cases or failure scenarios in your solution?",
                "Can you walk me through a real example where you applied this?",
            ]

        text = random.choice(templates)
        return {
            "text": text,
            "category": evaluation.get("topic", "Follow-up"),
            "type": question_type,
            "difficulty": "hard" if score > 70 else "medium",
            "is_follow_up": True,
            "parent_question": question_text[:60],
        }

    def _validate_evaluation(
        self,
        result: dict,
        voice_metrics: Optional[dict] = None,
        emotion_metrics: Optional[dict] = None,
    ) -> dict:
        """Validate and normalize evaluation result"""

        def clamp(val, default=50):
            try:
                return max(0, min(100, int(val)))
            except (TypeError, ValueError):
                return default

        tech = clamp(result.get("technical_score", 50))
        clarity = clamp(result.get("clarity_score", 50))
        completeness = clamp(result.get("completeness_score", 50))
        relevance = clamp(result.get("relevance_score", tech))
        depth = clamp(result.get("depth_score", round((tech + completeness) / 2)))
        overall = clamp(
            result.get(
                "overall_score",
                round(
                    tech * 0.4 + clarity * 0.2 + completeness * 0.2 + relevance * 0.2
                ),
            )
        )
        confidence = clamp(
            result.get("confidence_score", round((clarity + completeness) / 2))
        )
        structure = clamp(
            result.get("structure_score", round((clarity + completeness + tech) / 3))
        )

        # Validate / Clamp star_rubric
        raw_star = result.get("star_rubric", {})
        if not isinstance(raw_star, dict):
            raw_star = {}
        
        star_rubric = {
            "situation": clamp(raw_star.get("situation", round((clarity + completeness) / 2))),
            "task": clamp(raw_star.get("task", round((completeness + relevance) / 2))),
            "action": clamp(raw_star.get("action", round((tech + relevance) / 2))),
            "result": clamp(raw_star.get("result", round((completeness + tech) / 2)))
        }

        default_pace = int((voice_metrics or {}).get("speaking_pace_wpm") or 0)
        default_filler_count = int((voice_metrics or {}).get("filler_count") or 0)
        default_filler_ratio = clamp(
            (voice_metrics or {}).get("filler_ratio", 0), default=0
        )
        default_voice_delivery = clamp(
            (voice_metrics or {}).get("delivery_score", 0), default=0
        )
        default_emotion_label = (emotion_metrics or {}).get(
            "primary_emotion", "uncertain"
        )
        default_engagement_score = clamp(
            (emotion_metrics or {}).get("engagement_score", 0), default=0
        )
        default_eye_contact_score = clamp(
            (emotion_metrics or {}).get("eye_contact_score", 0), default=0
        )
        default_posture_score = clamp(
            (emotion_metrics or {}).get("posture_score", 0), default=0
        )
        default_posture_label = (emotion_metrics or {}).get("posture_label", "Good")

        speaking_pace_wpm = max(
            0, int(result.get("speaking_pace_wpm", default_pace) or default_pace)
        )
        filler_word_count = max(
            0,
            int(
                result.get("filler_word_count", default_filler_count)
                or default_filler_count
            ),
        )
        filler_word_ratio = clamp(
            result.get("filler_word_ratio", default_filler_ratio),
            default=default_filler_ratio,
        )
        voice_delivery_score = clamp(
            result.get("voice_delivery_score", default_voice_delivery),
            default=default_voice_delivery,
        )

        coach_notes = result.get("coach_notes", [])
        if isinstance(coach_notes, str):
            coach_notes = [coach_notes]

        live_tips = result.get("live_tips", [])
        if isinstance(live_tips, str):
            live_tips = [live_tips]

        # Determine difficulty adjustment
        difficulty_adjustment = result.get("difficulty_adjustment", "maintain")
        if difficulty_adjustment not in ("increase", "maintain", "decrease"):
            if overall >= 80:
                difficulty_adjustment = "increase"
            elif overall < 45:
                difficulty_adjustment = "decrease"
            else:
                difficulty_adjustment = "maintain"

        validated = {
            "technical_score": tech,
            "clarity_score": clarity,
            "completeness_score": completeness,
            "relevance_score": relevance,
            "depth_score": depth,
            "overall_score": overall,
            "topic": result.get("topic", "General"),
            "strong_areas": result.get("strong_areas", [])[:3],
            "weak_areas": result.get("weak_areas", [])[:3],
            "feedback": result.get("feedback", "Good attempt. Keep practicing."),
            "ideal_answer_hints": result.get("ideal_answer_hints", ""),
            "confidence_score": confidence,
            "structure_score": structure,
            "star_rubric": star_rubric,
            "priority_focus": result.get(
                "priority_focus", "Be more specific and use a concrete example."
            ),
            "suggested_next_action": result.get(
                "suggested_next_action", "Rewrite the answer with the STAR method."
            ),
            "follow_up_prompt": result.get(
                "follow_up_prompt",
                "How would you explain that to a non-technical interviewer?",
            ),
            "coach_notes": coach_notes[:4],
            "live_tips": live_tips[:3],
            "difficulty_adjustment": difficulty_adjustment,
            "speaking_pace_wpm": speaking_pace_wpm,
            "filler_word_count": filler_word_count,
            "filler_word_ratio": filler_word_ratio,
            "voice_delivery_score": voice_delivery_score,
            "voice_feedback": result.get(
                "voice_feedback", "Good voice delivery. Focus on pace and clarity."
            ),
            "emotion_label": result.get("emotion_label", default_emotion_label),
            "engagement_score": clamp(
                result.get("engagement_score", default_engagement_score),
                default=default_engagement_score,
            ),
            "eye_contact_score": clamp(
                result.get("eye_contact_score", default_eye_contact_score),
                default=default_eye_contact_score,
            ),
            "posture_score": clamp(
                result.get("posture_score", default_posture_score),
                default=default_posture_score,
            ),
            "posture_label": result.get("posture_label", default_posture_label),
            "emotion_feedback": result.get(
                "emotion_feedback",
                "Maintain steady eye contact, balanced posture, and consistent camera framing.",
            ),
            "sentiment": result.get("sentiment", "neutral"),
            "interviewer_response": result.get("interviewer_response", ""),
        }

        # Coerce lists to list of strings
        for list_field in ["strong_areas", "weak_areas", "coach_notes", "live_tips"]:
            validated[list_field] = [str(x) for x in validated.get(list_field, []) if x]
            if not validated[list_field]:
                validated[list_field] = ["Feedback provided"]

        # Validate difficulty adjustment values
        if validated["difficulty_adjustment"] not in ("increase", "maintain", "decrease"):
            validated["difficulty_adjustment"] = "maintain"

        # Validate sentiment value
        if validated["sentiment"] not in ("positive", "neutral", "negative"):
            if validated["overall_score"] >= 75:
                validated["sentiment"] = "positive"
            elif validated["overall_score"] >= 45:
                validated["sentiment"] = "neutral"
            else:
                validated["sentiment"] = "negative"

        if not validated.get("interviewer_response"):
            validated["interviewer_response"] = self._build_interviewer_transition(
                overall,
                {
                    "strong_areas": validated.get("strong_areas", []),
                    "weak_areas": validated.get("weak_areas", []),
                },
            )

        try:
            schema_instance = EvaluationSchema(**validated)
            return schema_instance.model_dump()
        except Exception as e:
            logger.warning(f"Pydantic validation failed, returning raw validated: {e}")
            return validated

    def _transition_focus(self, value, fallback: str) -> str:
        detail = str(value or fallback).strip().rstrip(".")
        if not detail:
            detail = fallback
        lowered = detail[:1].lower() + detail[1:]
        if lowered.startswith("discuss "):
            return "discussing " + lowered[len("discuss "):]
        if lowered.startswith("improve "):
            return "improving " + lowered[len("improve "):]
        if lowered.startswith("needs "):
            return lowered
        return lowered

    def _build_interviewer_transition(self, overall_score: int, evaluation: dict) -> str:
        """Create a short spoken bridge so the interview feels like a real HR conversation."""
        strong = (evaluation or {}).get("strong_areas") or []
        weak = (evaluation or {}).get("weak_areas") or []
        if overall_score >= 75:
            detail = self._transition_focus(strong[0] if strong else None, "your structure")
            return f"Thank you, that was a solid answer, especially around {detail}. Let us go a little deeper now."
        if overall_score >= 45:
            detail = self._transition_focus(weak[0] if weak else None, "adding more specifics")
            return f"Thanks, I followed your point. I would like a bit more depth with {detail}, so let us continue."
        detail = self._transition_focus(weak[0] if weak else None, "giving a fuller answer")
        return f"Thanks for trying that. For the next one, focus on {detail} and answer with a clear example."
    def _fallback_evaluation(
        self,
        answer: str,
        question: dict = None,
        voice_metrics: Optional[dict] = None,
        emotion_metrics: Optional[dict] = None,
        previous_scores: Optional[list] = None,
    ) -> dict:
        """Generate a smart fallback evaluation when Gemini is unavailable"""

        def clamp(val, default=50):
            try:
                return max(0, min(100, int(val)))
            except (TypeError, ValueError):
                return default

        word_count = len(answer.split())
        lower = answer.lower()

        # Detect answer quality signals
        has_example = any(
            w in lower
            for w in [
                "for example",
                "for instance",
                "in my",
                "we built",
                "project",
                "implementation",
            ]
        )
        has_structure = any(
            w in lower
            for w in [
                "first",
                "then",
                "finally",
                "as a result",
                "situation",
                "task",
                "action",
                "result",
            ]
        )
        has_numbers = bool(__import__("re").search(r"\d+%?|\$\d+", answer))
        has_tradeoff = any(
            w in lower
            for w in [
                "trade-off",
                "tradeoff",
                "downside",
                "however",
                "on the other hand",
                "alternative",
            ]
        )

        if word_count < 10:
            tech, clarity, completeness = 20, 30, 20
            feedback = "Your answer is too brief. Try to elaborate with examples and technical details."
        elif word_count < 30:
            tech, clarity, completeness = 45, 55, 40
            feedback = "Your answer shows basic understanding. Consider adding more depth and concrete examples."
        elif word_count < 80:
            tech, clarity, completeness = 65, 70, 60
            feedback = "Good answer with reasonable depth. Try to include specific examples from your experience."
        else:
            tech, clarity, completeness = 75, 70, 80
            feedback = "Thorough response. Make sure your answers stay focused and highlight key technical concepts."

        # Bonus points for quality signals
        if has_example:
            tech += 5
            completeness += 5
        if has_structure:
            clarity += 8
        if has_numbers:
            tech += 5
            completeness += 3
        if has_tradeoff:
            tech += 7

        jitter = random.randint(-5, 5)
        tech = max(0, min(100, tech + jitter))
        clarity = max(0, min(100, clarity + jitter))
        completeness = max(0, min(100, completeness + jitter))
        relevance = max(
            0, min(100, round(tech * 0.7 + completeness * 0.3) + random.randint(-3, 3))
        )
        depth = max(
            0, min(100, round((tech + completeness) / 2) + random.randint(-3, 3))
        )
        overall = round(
            tech * 0.4 + clarity * 0.2 + completeness * 0.2 + relevance * 0.2
        )

        speaking_pace_wpm = int((voice_metrics or {}).get("speaking_pace_wpm") or 0)
        filler_word_count = int((voice_metrics or {}).get("filler_count") or 0)
        filler_word_ratio = clamp(
            (voice_metrics or {}).get("filler_ratio", 0), default=0
        )
        voice_delivery_score = clamp(
            (voice_metrics or {}).get("delivery_score", 0), default=0
        )
        emotion_label = (emotion_metrics or {}).get("primary_emotion", "uncertain")
        engagement_score = clamp(
            (emotion_metrics or {}).get("engagement_score", 0), default=0
        )
        eye_contact_score = clamp(
            (emotion_metrics or {}).get("eye_contact_score", 0), default=0
        )
        posture_score = clamp(
            (emotion_metrics or {}).get("posture_score", 0), default=0
        )
        posture_label = (emotion_metrics or {}).get("posture_label", "Good")

        # Adaptive difficulty
        if previous_scores and len(previous_scores) > 0:
            avg_prev = sum(previous_scores) / len(previous_scores)
            if avg_prev >= 80:
                difficulty_adjustment = "increase"
            elif avg_prev < 45:
                difficulty_adjustment = "decrease"
            else:
                difficulty_adjustment = "maintain"
        else:
            difficulty_adjustment = "maintain"

        # Generate coaching tips
        live_tips = []
        if not has_example:
            live_tips.append("Add a specific example from your experience")
        if not has_structure:
            live_tips.append(
                "Structure your answer with a clear beginning, middle, and end"
            )
        if not has_numbers:
            live_tips.append("Include metrics or numbers to quantify your impact")
        if filler_word_count > 5:
            live_tips.append("Reduce filler words for clearer delivery")
        if posture_label != "Good":
            live_tips.append(f"Adjust your sitting position; currently flagged as {posture_label}")

        # Strong/weak areas
        strong = []
        weak = []
        if has_example:
            strong.append("Uses real examples")
        if has_structure:
            strong.append("Well-structured response")
        if has_numbers:
            strong.append("Quantified impact")
        if word_count >= 50:
            strong.append("Good depth")
        if not has_example:
            weak.append("Needs concrete examples")
        if not has_structure:
            weak.append("Improve answer structure")
        if word_count < 30:
            weak.append("Too brief")
        if not has_tradeoff and word_count > 20:
            weak.append("Discuss trade-offs")

        return {
            "technical_score": tech,
            "clarity_score": clarity,
            "completeness_score": completeness,
            "relevance_score": relevance,
            "depth_score": depth,
            "overall_score": overall,
            "topic": (
                (question or {}).get("category", "General")
                if isinstance(question, dict)
                else "General"
            ),
            "strong_areas": strong[:3] or ["Attempt made"],
            "weak_areas": weak[:3] or ["Add more detail"],
            "feedback": feedback,
            "ideal_answer_hints": "Structure your answer with: context, approach, implementation, and outcome.",
            "confidence_score": clamp(clarity + random.randint(-5, 5), 50),
            "structure_score": clamp(
                (clarity + completeness) / 2 + (10 if has_structure else 0), 50
            ),
            "star_rubric": {
                "situation": clamp(clarity + random.randint(-4, 4), 60),
                "task": clamp(completeness + random.randint(-4, 4), 60),
                "action": clamp(tech + random.randint(-4, 4), 60),
                "result": clamp(completeness + random.randint(-6, 4), 60)
            },
            "priority_focus": "Use a clear structure and add one example with measurable impact.",
            "suggested_next_action": "Try a STAR response: situation, task, action, result.",
            "follow_up_prompt": "Walk me through one project where you solved a hard problem.",
            "coach_notes": [
                "Open with the context in one sentence.",
                "Add a concrete example or metric to strengthen credibility.",
                "Close with the result and what you learned.",
            ],
            "live_tips": live_tips[:3],
            "difficulty_adjustment": difficulty_adjustment,
            "speaking_pace_wpm": speaking_pace_wpm,
            "filler_word_count": filler_word_count,
            "filler_word_ratio": filler_word_ratio,
            "voice_delivery_score": (
                voice_delivery_score
                if voice_metrics
                else clamp((clarity + completeness) / 2, 50)
            ),
            "voice_feedback": (
                "Good voice delivery. Keep your pace steady and reduce filler words."
                if voice_metrics
                else "Focus on pace and reducing filler words."
            ),
            "emotion_label": emotion_label,
            "engagement_score": engagement_score,
            "eye_contact_score": eye_contact_score,
            "posture_score": posture_score,
            "posture_label": posture_label,
            "emotion_feedback": (
                f"Strong camera presence ({emotion_label} presence). Keep your gaze steady and posture composed. Posture is {posture_label.lower()}."
                if engagement_score >= 70 and posture_score >= 70
                else f"Improve camera presence by facing the camera directly, reducing excess movement, and sitting centered. Posture is currently {posture_label.lower()}."
            ),
            "sentiment": (
                "positive"
                if overall >= 70
                else "neutral" if overall >= 45 else "negative"
            ),
            "interviewer_response": self._build_interviewer_transition(overall, {"strong_areas": strong, "weak_areas": weak}),
        }
