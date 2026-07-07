"""Input validation schemas using pydantic."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class ResumeUploadRequest(BaseModel):
    """Resume upload validation."""

    job_role: str = Field(
        default="Software Engineer", min_length=1, max_length=100, description="Target job role"
    )
    experience_level: Optional[str] = Field(
        default="mid", description="Experience level"
    )
    job_description: Optional[str] = Field(
        default="", max_length=5000, description="Target job description"
    )

    @field_validator("job_role")
    @classmethod
    def validate_job_role(cls, v):
        """Validate job role."""
        if not v.strip():
            raise ValueError("Job role cannot be empty")
        return v.strip()


class CoachAskRequest(BaseModel):
    """Coach career mentor ask validation."""

    question: str = Field(..., min_length=1, max_length=1000)


class RoadmapRequest(BaseModel):
    """Personalized roadmap generation validation."""

    custom_topic: Optional[str] = Field(default="", max_length=200)


class InterviewRequest(BaseModel):
    """Interview start validation."""

    job_role: str = Field(..., min_length=1, max_length=100)
    num_questions: int = Field(default=5, ge=1, le=10)
    duration_minutes: int = Field(default=30, ge=5, le=120)
    interview_type: str = Field(default="text", pattern="^(text|voice|video)$")


class QuestionRequest(BaseModel):
    """AI question generation validation."""

    job_role: str = Field(..., min_length=1, max_length=100)
    num_questions: int = Field(default=3, ge=1, le=10)
    skill_focus: Optional[List[str]] = Field(default=None, max_length=5)


class AnswerEvaluationRequest(BaseModel):
    """Answer evaluation validation."""

    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1, max_length=2000)
    job_role: str = Field(..., min_length=1, max_length=100)


class QuizRequest(BaseModel):
    """Quiz request validation."""

    topic: str = Field(..., min_length=1, max_length=50)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    num_questions: int = Field(default=10, ge=1, le=50)


class AnalyticsQueryRequest(BaseModel):
    """Analytics query validation."""

    start_date: Optional[str] = Field(default=None, description="ISO 8601 date")
    end_date: Optional[str] = Field(default=None, description="ISO 8601 date")
    limit: int = Field(default=100, ge=1, le=1000)
