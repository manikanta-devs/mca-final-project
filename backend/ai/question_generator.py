import logging
import random
import textwrap
from ai.gemini_service import GeminiService
from ai.wiki_service import WikiService
from utils.prompt_sanitizer import sanitize_for_prompt

logger = logging.getLogger(__name__)


# ── Skill-specific question templates ────────────────────────────
# Each key maps to a list of question templates that reference the skill.
SKILL_QUESTIONS = {
    "python": [
        {
            "text": "You listed Python on your resume. Explain the difference between a list and a tuple, and when you would use each in production code.",
            "category": "Python",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "How does Python handle memory management and garbage collection? Have you ever hit a memory issue in a Python project?",
            "category": "Python",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Walk me through how you would use Python decorators and context managers to build a retry-with-logging pattern.",
            "category": "Python",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "javascript": [
        {
            "text": "Explain closures in JavaScript with a real example from your work.",
            "category": "JavaScript",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "What is the event loop in JavaScript, and how does it affect async code execution?",
            "category": "JavaScript",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "How would you debug a memory leak in a long-running JavaScript application?",
            "category": "JavaScript",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "typescript": [
        {
            "text": "How do you use TypeScript generics to build reusable, type-safe utility functions?",
            "category": "TypeScript",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Explain the difference between interface and type in TypeScript. When do you prefer one over the other?",
            "category": "TypeScript",
            "type": "technical",
            "difficulty": "easy",
        },
    ],
    "react": [
        {
            "text": "You have React experience. Explain how the Virtual DOM works and why it improves performance.",
            "category": "React",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "When would you use useReducer instead of useState, and how do you decide?",
            "category": "React",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "How would you optimize a React app that re-renders too often? Walk me through your profiling approach.",
            "category": "React",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "angular": [
        {
            "text": "Explain dependency injection in Angular and how it differs from React's approach to shared state.",
            "category": "Angular",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "How do Angular modules, lazy loading, and route guards work together in a large enterprise app?",
            "category": "Angular",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "vue": [
        {
            "text": "Explain Vue's reactivity system. How does it differ from React's approach?",
            "category": "Vue",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "How do you manage complex state in a Vue application — Vuex, Pinia, or composables?",
            "category": "Vue",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "node": [
        {
            "text": "How does Node.js handle concurrent requests if it is single-threaded?",
            "category": "Node.js",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Explain the difference between process.nextTick and setImmediate in Node.js.",
            "category": "Node.js",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "django": [
        {
            "text": "Explain Django's ORM query optimization. How do you avoid N+1 queries in a real project?",
            "category": "Django",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "How does Django's middleware pipeline work, and when would you write custom middleware?",
            "category": "Django",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "flask": [
        {
            "text": "Compare Flask and Django. When would you choose Flask for a production API?",
            "category": "Flask",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "spring": [
        {
            "text": "Explain Spring Boot auto-configuration and how dependency injection works under the hood.",
            "category": "Spring",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "docker": [
        {
            "text": "You have Docker experience. How would you optimize a Docker image to reduce build time and image size?",
            "category": "Docker",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Explain multi-stage Docker builds and how they improve CI/CD pipelines.",
            "category": "Docker",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "kubernetes": [
        {
            "text": "Walk me through how Kubernetes manages pod scheduling, scaling, and self-healing.",
            "category": "Kubernetes",
            "type": "technical",
            "difficulty": "hard",
        },
        {
            "text": "How do you handle secrets management in a Kubernetes cluster?",
            "category": "Kubernetes",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "aws": [
        {
            "text": "You listed AWS on your resume. Design a highly available architecture using at least 3 AWS services.",
            "category": "AWS",
            "type": "technical",
            "difficulty": "hard",
        },
        {
            "text": "How do you optimize AWS costs for a data-intensive application?",
            "category": "AWS",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "gcp": [
        {
            "text": "Compare GCP's BigQuery with traditional data warehouse solutions. When would you choose BigQuery?",
            "category": "GCP",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "azure": [
        {
            "text": "How would you set up a CI/CD pipeline using Azure DevOps for a microservices architecture?",
            "category": "Azure",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "postgresql": [
        {
            "text": "You work with PostgreSQL. Explain EXPLAIN ANALYZE and how you use it to optimize slow queries.",
            "category": "Databases",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "mongodb": [
        {
            "text": "When would you choose MongoDB over a relational database? What are the trade-offs?",
            "category": "Databases",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "redis": [
        {
            "text": "How have you used Redis in production — caching, pub/sub, or something else? Walk me through the architecture.",
            "category": "Redis",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "tensorflow": [
        {
            "text": "You have TensorFlow experience. Walk me through building and deploying a model from training to production inference.",
            "category": "ML/AI",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "pytorch": [
        {
            "text": "Compare PyTorch and TensorFlow. Why might you choose one over the other for a research project?",
            "category": "ML/AI",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "git": [
        {
            "text": "Explain your Git branching strategy. How do you handle merge conflicts in a team of 5+ developers?",
            "category": "Version Control",
            "type": "technical",
            "difficulty": "easy",
        },
    ],
    "graphql": [
        {
            "text": "Compare GraphQL and REST. When is GraphQL the wrong choice?",
            "category": "API Design",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "terraform": [
        {
            "text": "How do you manage Terraform state safely across a team? What about state locking and drift detection?",
            "category": "IaC",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "java": [
        {
            "text": "Explain the Java memory model — heap, stack, and garbage collection strategies.",
            "category": "Java",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "How do you handle concurrency in Java? Compare synchronized blocks, ReentrantLock, and the java.util.concurrent package.",
            "category": "Java",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "c++": [
        {
            "text": "Explain RAII in C++ and how smart pointers prevent memory leaks.",
            "category": "C++",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "go": [
        {
            "text": "How do goroutines and channels work in Go? How does this compare to thread-based concurrency?",
            "category": "Go",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "rust": [
        {
            "text": "Explain Rust's ownership model and how it prevents data races at compile time.",
            "category": "Rust",
            "type": "technical",
            "difficulty": "hard",
        },
    ],
    "swift": [
        {
            "text": "How does Swift handle memory management with ARC? What are retain cycles and how do you avoid them?",
            "category": "Swift",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "kotlin": [
        {
            "text": "What advantages does Kotlin offer over Java for Android development? Give specific examples from your work.",
            "category": "Kotlin",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
}

# ── Experience-level questions ───────────────────────────────────
SKILL_QUESTIONS.update({
    "reactjs": SKILL_QUESTIONS["react"],
    "springboot": SKILL_QUESTIONS["spring"],
    "sql": [
        {
            "text": "Write or explain a SQL query to find the second highest salary from an employee table. What edge cases would you handle?",
            "category": "SQL",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Explain joins, indexes, and query optimization using a real reporting or dashboard example.",
            "category": "SQL",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "mysql": [
        {
            "text": "Write or explain a SQL query to find the second highest salary from an employee table. What edge cases would you handle?",
            "category": "SQL",
            "type": "technical",
            "difficulty": "medium",
        }
    ],
    "machinelearning": [
        {
            "text": "Explain supervised learning with an example from a real project or business problem.",
            "category": "Machine Learning",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "What is the difference between classification and regression, and how would you choose the right approach for a problem?",
            "category": "Machine Learning",
            "type": "technical",
            "difficulty": "medium",
        },
    ],
    "ml": [
        {
            "text": "Explain supervised learning with an example from a real project or business problem.",
            "category": "Machine Learning",
            "type": "technical",
            "difficulty": "easy",
        }
    ],
})

SKILL_QUESTIONS["java"].extend([
    {
        "text": "Explain JVM, JRE, and JDK. How does JVM help Java run across different platforms?",
        "category": "Java",
        "type": "technical",
        "difficulty": "easy",
    },
    {
        "text": "What is the difference between HashMap and Hashtable, and which one would you use in a modern Java application?",
        "category": "Java Collections",
        "type": "technical",
        "difficulty": "medium",
    },
])

EXPERIENCE_QUESTIONS = {
    "entry": [
        {
            "text": "Tell me about a project from school or personal work that you are most proud of. What was your specific contribution?",
            "category": "Experience",
            "type": "behavioral",
            "difficulty": "easy",
        },
        {
            "text": "How do you approach learning a new technology or framework for the first time?",
            "category": "Learning",
            "type": "behavioral",
            "difficulty": "easy",
        },
    ],
    "junior": [
        {
            "text": "Describe a bug you spent a long time debugging. What was the root cause and how did you finally find it?",
            "category": "Debugging",
            "type": "situational",
            "difficulty": "medium",
        },
        {
            "text": "How do you handle code reviews? What do you look for when reviewing someone else's code?",
            "category": "Teamwork",
            "type": "behavioral",
            "difficulty": "easy",
        },
    ],
    "mid": [
        {
            "text": "Tell me about a system you designed or significantly improved. What trade-offs did you make?",
            "category": "System Design",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Describe a time you had to push back on a requirement because of technical constraints. How did you handle it?",
            "category": "Communication",
            "type": "behavioral",
            "difficulty": "medium",
        },
    ],
    "senior": [
        {
            "text": "Walk me through a complex architectural decision you made. How did you evaluate alternatives and manage risk?",
            "category": "Architecture",
            "type": "technical",
            "difficulty": "hard",
        },
        {
            "text": "How do you mentor junior developers while still meeting your own delivery commitments?",
            "category": "Leadership",
            "type": "behavioral",
            "difficulty": "medium",
        },
        {
            "text": "Describe a production outage you led the response for. What was your incident management process?",
            "category": "Incident Response",
            "type": "situational",
            "difficulty": "hard",
        },
    ],
}

# ── Job-title-specific questions ─────────────────────────────────
TITLE_QUESTIONS = [
    {
        "text": "Based on your previous role as {title}, what was the most impactful project you delivered and what metrics proved its success?",
        "category": "Experience",
        "type": "behavioral",
        "difficulty": "medium",
    },
    {
        "text": "In your role as {title}, how did you collaborate across teams to ship features on time?",
        "category": "Collaboration",
        "type": "behavioral",
        "difficulty": "medium",
    },
]

# ── Generic role-based fallbacks (unchanged from v3.0) ───────────
FALLBACK_QUESTIONS = {
    "software_engineer": [
        {
            "id": 1,
            "text": "Walk me through how you would design a REST API for interview sessions, including authentication, validation, and error handling.",
            "category": "System Design",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 2,
            "text": "You join a codebase and a release is failing in production. How do you isolate the issue, communicate risk, and recover quickly?",
            "category": "Problem Solving",
            "difficulty": "medium",
            "type": "situational",
        },
        {
            "id": 3,
            "text": "Explain the difference between a shallow copy and a deep copy, and give a real example from application code.",
            "category": "Core Concepts",
            "difficulty": "easy",
            "type": "technical",
        },
        {
            "id": 4,
            "text": "What is the difference between SQL and NoSQL databases, and what trade-offs matter when building analytics features?",
            "category": "Databases",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 5,
            "text": "How would you design a background job that scores interview answers without blocking the user experience?",
            "category": "Architecture",
            "difficulty": "hard",
            "type": "technical",
        },
        {
            "id": 6,
            "text": "Describe a time you disagreed with a technical decision. How did you handle the discussion and the final outcome?",
            "category": "Behavioral",
            "difficulty": "medium",
            "type": "behavioral",
        },
        {
            "id": 7,
            "text": "What is CI/CD, and how would you make deployments safer for a fast-moving product team?",
            "category": "DevOps",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 8,
            "text": "Explain CAP theorem using a real distributed system example.",
            "category": "Distributed Systems",
            "difficulty": "hard",
            "type": "technical",
        },
    ],
    "frontend_developer": [
        {
            "id": 1,
            "text": "Walk me through how you would build a responsive interview dashboard for mobile and desktop users.",
            "category": "UI Architecture",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 2,
            "text": "Explain the Virtual DOM in React and how it affects rendering performance in a real app.",
            "category": "React",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 3,
            "text": "How would you debug a button click that works locally but fails after deployment?",
            "category": "Debugging",
            "difficulty": "medium",
            "type": "situational",
        },
        {
            "id": 4,
            "text": "What is the difference between useState and useReducer hooks, and when would you choose each?",
            "category": "React Hooks",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 5,
            "text": "How does CSS Flexbox differ from Grid? When would you use each in a production dashboard?",
            "category": "CSS",
            "difficulty": "easy",
            "type": "technical",
        },
        {
            "id": 6,
            "text": "What are Web Vitals? How do you optimize Core Web Vitals for a content-heavy page?",
            "category": "Performance",
            "difficulty": "hard",
            "type": "technical",
        },
    ],
    "data_scientist": [
        {
            "id": 1,
            "text": "Explain the bias-variance tradeoff in machine learning and how you would explain it to a product manager.",
            "category": "ML Fundamentals",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 2,
            "text": "When would you use Random Forest vs. Gradient Boosting in a customer scoring model?",
            "category": "Algorithms",
            "difficulty": "hard",
            "type": "technical",
        },
        {
            "id": 3,
            "text": "Explain how you handle missing data in a dataset before training a model.",
            "category": "Data Processing",
            "difficulty": "easy",
            "type": "technical",
        },
        {
            "id": 4,
            "text": "What is cross-validation and why is it important for measuring model quality?",
            "category": "Model Evaluation",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 5,
            "text": "How would you detect and handle class imbalance in a classification problem?",
            "category": "ML Techniques",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 6,
            "text": "Explain attention mechanisms in transformers in a way a non-ML interviewer could follow.",
            "category": "Deep Learning",
            "difficulty": "hard",
            "type": "technical",
        },
    ],
    "backend_developer": [
        {
            "id": 1,
            "text": "How would you design a rate limiter that handles 10,000 requests per second across multiple servers?",
            "category": "System Design",
            "difficulty": "hard",
            "type": "technical",
        },
        {
            "id": 2,
            "text": "Explain the differences between REST, GraphQL, and gRPC. When would you choose each?",
            "category": "API Design",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 3,
            "text": "What is the N+1 query problem and how would you solve it in an ORM-based application?",
            "category": "Performance",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 4,
            "text": "How do you handle authentication and authorization in a microservices architecture?",
            "category": "Security",
            "difficulty": "hard",
            "type": "technical",
        },
        {
            "id": 5,
            "text": "Describe how you would implement a message queue for processing background jobs reliably.",
            "category": "Architecture",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 6,
            "text": "Tell me about a time you had to debug a memory leak in production. What was your approach?",
            "category": "Debugging",
            "difficulty": "hard",
            "type": "situational",
        },
    ],
    "default": [
        {
            "id": 1,
            "text": "Tell me about yourself and how your background fits this role.",
            "category": "Introduction",
            "difficulty": "easy",
            "type": "behavioral",
        },
        {
            "id": 2,
            "text": "What are your strongest skills, and where have you used them to solve a real problem?",
            "category": "Skills",
            "difficulty": "easy",
            "type": "behavioral",
        },
        {
            "id": 3,
            "text": "Describe a challenging project you worked on and how you overcame the biggest obstacle.",
            "category": "Experience",
            "difficulty": "medium",
            "type": "behavioral",
        },
        {
            "id": 4,
            "text": "How do you stay updated with the latest industry trends and technologies?",
            "category": "Learning",
            "difficulty": "easy",
            "type": "behavioral",
        },
        {
            "id": 5,
            "text": "What does good code quality mean to you, and how do you ensure it during development?",
            "category": "Best Practices",
            "difficulty": "medium",
            "type": "technical",
        },
        {
            "id": 6,
            "text": "Tell me about a time you disagreed with a technical decision. How did you handle it?",
            "category": "Teamwork",
            "difficulty": "medium",
            "type": "behavioral",
        },
    ],
}

# ── Scenario-based questions ─────────────────────────────────────
SCENARIO_QUESTIONS = [
    {
        "text": "A critical production bug is reported during your release. Walk me through exactly how you would handle the next 60 minutes.",
        "category": "Incident Response",
        "type": "situational",
        "difficulty": "hard",
        "persona": "strict_manager",
    },
    {
        "text": "A teammate consistently misses deadlines and it is affecting the sprint. How do you address this without damaging the relationship?",
        "category": "Team Dynamics",
        "type": "situational",
        "difficulty": "medium",
        "persona": "hr_manager",
    },
    {
        "text": "A client reports data inconsistency in a dashboard. Walk me through your investigation process from first report to root cause.",
        "category": "Debugging",
        "type": "situational",
        "difficulty": "hard",
        "persona": "technical_lead",
    },
    {
        "text": "You are asked to build a feature with a one-week deadline, but you estimate it needs three weeks. What do you do?",
        "category": "Project Management",
        "type": "situational",
        "difficulty": "medium",
        "persona": "strict_manager",
    },
    {
        "text": "Two senior engineers on your team disagree on the architecture for a new service. You need to break the deadlock. How?",
        "category": "Leadership",
        "type": "situational",
        "difficulty": "hard",
        "persona": "hr_manager",
    },
    {
        "text": "You discover a security vulnerability in production code. The fix will require 4 hours of downtime. Walk me through your decision process.",
        "category": "Security",
        "type": "situational",
        "difficulty": "hard",
        "persona": "technical_lead",
    },
    {
        "text": "A non-technical stakeholder keeps changing requirements mid-sprint. How do you manage scope creep while maintaining team morale?",
        "category": "Stakeholder Management",
        "type": "situational",
        "difficulty": "medium",
        "persona": "hr_manager",
    },
    {
        "text": "Your team is migrating a monolith to microservices. A junior engineer suggests rewriting everything from scratch. How do you respond?",
        "category": "Architecture",
        "type": "situational",
        "difficulty": "hard",
        "persona": "technical_lead",
    },
]


REAL_LIFE_INTERVIEW_QUESTIONS = [
    {
        "text": "Thank you for sharing your resume. Please walk me through your background, the main projects you want me to notice, and why this role is the right next step for you.",
        "category": "Resume Walkthrough",
        "type": "behavioral",
        "difficulty": "easy",
        "persona": "hr_manager",
    },
    {
        "text": "I see several skills on your resume. Pick one project that best proves those skills and explain the problem, your exact contribution, and the final result.",
        "category": "Project Deep Dive",
        "type": "behavioral",
        "difficulty": "medium",
        "persona": "hr_manager",
    },
    {
        "text": "Imagine I am the hiring manager and I only have two minutes. How would you convince me that your resume matches this job better than another candidate's?",
        "category": "Candidate Pitch",
        "type": "behavioral",
        "difficulty": "medium",
        "persona": "hr_manager",
    },
    {
        "text": "Tell me about a time something on your resume did not go perfectly. What failed, what did you own personally, and what changed after that?",
        "category": "Failure and Learning",
        "type": "behavioral",
        "difficulty": "medium",
        "persona": "strict_manager",
    },
    {
        "text": "A manager asks you about a skill listed on your resume, but your experience with it is limited. How do you answer honestly while still showing readiness to learn?",
        "category": "Resume Pressure",
        "type": "situational",
        "difficulty": "medium",
        "persona": "hr_manager",
    },
    {
        "text": "You join a new team and discover the codebase is poorly documented. What do you do in your first week to become productive without slowing the team down?",
        "category": "First 30 Days",
        "type": "situational",
        "difficulty": "medium",
        "persona": "technical_lead",
    },
    {
        "text": "A senior teammate challenges your design during a review. Walk me through how you defend your reasoning, listen to feedback, and decide what to change.",
        "category": "Design Review",
        "type": "situational",
        "difficulty": "medium",
        "persona": "strict_manager",
    },
    {
        "text": "Describe a time you had to explain a technical decision to a non-technical person. How did you make it clear and useful?",
        "category": "Communication",
        "type": "behavioral",
        "difficulty": "medium",
        "persona": "hr_manager",
    },
    {
        "text": "Suppose you are given an urgent task five minutes before leaving for the day. What questions do you ask, and how do you handle the priority?",
        "category": "Workplace Judgment",
        "type": "situational",
        "difficulty": "easy",
        "persona": "hr_manager",
    },
    {
        "text": "At the end of this interview, what is one concern you think I might have about your profile, and how would you address it?",
        "category": "Self Awareness",
        "type": "behavioral",
        "difficulty": "hard",
        "persona": "strict_manager",
    },
]


class QuestionGenerator:
    """Generates interview questions using Gemini AI with smart fallback"""

    def __init__(self):
        self.gemini = GeminiService()
        self.wiki = WikiService()

    def generate(
        self,
        resume_data,
        role,
        difficulty="medium",
        num_questions=8,
        panel_mode=False,
        company="General",
        company_context="",
    ):
        """Generate questions using Gemini, with resume-aware fallback"""
        if self.gemini.is_available():
            questions = self._generate_with_gemini(
                resume_data,
                role,
                difficulty,
                num_questions,
                panel_mode,
                company,
                company_context,
            )
            if questions:
                return questions

        logger.info("Using fallback questions")
        return self._get_fallback_questions(
            role, num_questions, resume_data, difficulty, panel_mode
        )

    def _generate_with_gemini(
        self,
        resume_data,
        role,
        difficulty,
        num_questions,
        panel_mode=False,
        company="General",
        company_context="",
    ):
        """Generate questions using Gemini API"""
        skills = resume_data.get("skills", {}).get("all", [])
        experience = resume_data.get("experience", {})
        education = resume_data.get("education", [])
        titles = experience.get("titles", []) if isinstance(experience, dict) else []

        skills_str = ", ".join(skills[:15]) if skills else "general programming"
        exp_str = (
            f"{experience.get('years', 0)} years"
            if isinstance(experience, dict) and experience.get("years")
            else "entry level"
        )
        edu_str = education[0] if education else "not specified"
        titles_str = ", ".join(titles[:3]) if titles else "not specified"

        panel_instruction = ""
        if panel_mode:
            panel_instruction = """
You are generating questions for a Panel Interview. There are 3 personas on the panel:
1. "technical_lead": Asks direct, highly technical architecture and implementation questions. Tone is analytical.
2. "hr_manager": Asks behavioral, situational, and cultural fit questions. Tone is supportive and encouraging.
3. "strict_manager": Asks tough, high-pressure situational and technical trade-off questions. Tone is critical and pushes for outcomes.

For each question, explicitly assign a "persona_id" from the 3 choices above. Distribute the questions roughly equally among the 3 personas. Write the "text" of the question exactly as that persona would speak it.
"""

        company_instruction = ""
        if company and company != "General":
            company_instruction = f"\nTarget Company: {company}"
            style_notes = {
                "google": "Google's interview style focuses heavily on scale, algorithmic efficiency, complex system design, and Googlyness (navigating ambiguity, doing the right thing).",
                "amazon": "Amazon's interview style focuses heavily on the Amazon Leadership Principles (customer obsession, ownership, deliver results, etc.), operational excellence, scale, and diving deep.",
                "meta": "Meta's interview style focuses heavily on moving fast, direct impact, system design at massive scale, and practical, pragmatic engineering trade-offs.",
                "microsoft": "Microsoft's interview style focuses on robust software engineering, architectural clarity, growth mindset, and collaborative problem solving.",
                "netflix": "Netflix's interview style focuses on freedom & responsibility, high performance culture, resilience/chaos engineering, and technical independence.",
            }
            note = style_notes.get(company.lower())
            if note:
                company_instruction += f" ({note})"
            if company_context:
                company_instruction += f"\nCompany/Team Context/Background: {company_context}"
            company_instruction += "\nMake sure that both the technical/system design questions and behavioral questions reflect this company's culture, values, and engineering standards.\n"

        prompt = f"""You are {interviewerName if 'interviewerName' in locals() else 'Sarah Chen'}, an experienced Lead Interviewer with over 15 years of industry experience hiring top talent.
You are NOT an AI assistant. You are conducting a real, highly engaging live interview over a video/voice call. Stay in character.
Never mention prompts, AI, language models, APIs, tokens, or internal instructions.
Your personality is professional, warm, curious, conversational, observant, and supportive.
Your objective is to evaluate the candidate exactly like a seasoned engineering manager or HR director would.
Generate {num_questions} high-quality interview questions.

Target Company / Context Info: {company_instruction or "General"}

Role: {role.replace('_', ' ').title()}
Difficulty: {difficulty}
Candidate Skills: {skills_str}
Experience Level: {exp_str}
Previous Job Titles: {titles_str}
Education: {edu_str}
{panel_instruction}

Relevant background from Wikipedia (if available):
{self.wiki.get_summary(role.replace('_', ' ')) or ''}

Relevant background on top skill (if available):
{self.wiki.get_summary(skills[0]) if skills else ''}

Requirements for Question Generation:
1. Generate an Interview Blueprint of exactly 7 questions. Do not generate more or less.
2. The questions MUST be ordered in this exact sequence to match the stages:
   - Question 1 (Resume Discussion): Ask about their education background, qualifications, or credentials listed on their resume in a warm, introductory way (e.g. "I see you studied CS at Stanford, how did that set you up for your engineering career?").
   - Question 2 (Project Discussion): Ask about a specific project they listed, focusing on architectural choices, technical hurdles, or design trade-offs (e.g. "You built a scalable web app using Redis caching. Tell me about the cache invalidation strategy you chose and the challenges you faced.").
   - Question 3 (Internship/Experience): Ask about practical accomplishments, leadership, or teamwork in their previous roles (e.g. "While at your last company, what was the most complex technical decision you had to own or influence?").
   - Question 4 (Technical Round 1): Deep dive into a core skill listed on their resume, focusing on practical implementation, optimization, or internals rather than basic definitions (e.g. "In React, we often face state synchronization issues. How have you managed complex side-effects without causing infinite re-render loops?").
   - Question 5 (Technical Round 2): Ask about design patterns, database optimization, scaling trade-offs, or production debugging (e.g. "If your database queries start bottlenecking under a 3x traffic spike, what are the first three things you profile and optimize?").
   - Question 6 (Behavioral Round): A realistic, STAR-based behavioral question about handling conflict, strict deadlines, or prioritizing tasks.
   - Question 7 (Situational Round): A realistic, high-stakes workplace scenario (e.g. "Imagine you are an hour away from a major production release and you discover a memory leak. Walk me through your decision-making process under that pressure.").
3. Tailoring & Realism: Questions MUST be highly specific to the candidate's actual background and target role. Strictly avoid generic, textbook definitions or simple trivia (e.g. do not ask "What is a list?", "What is a closure?", "Explain the virtual DOM"). Instead, ask about practical scenarios, architectural choices, scale, and real-world trade-offs.
4. Natural Conversational Tone: Frame the questions as if you are speaking live in a real, collaborative meeting: "I noticed on your resume...", "Suppose this happens in your first month...", "Walk me through how you designed...".
5. Difficulty Level: The questions must strictly match the '{difficulty}' level.

Return a JSON array of exactly 7 question objects. Each question object must have:
- "id": number (1 to 7)
- "text": the full question text (personalized to their resume, warm and conversational)
- "category": topic category (e.g., Resume Discussion, Project Discussion, Technical, Behavioral, Situational)
- "difficulty": "{difficulty}"
- "type": "technical", "behavioral", or "situational"
- "persona_id": "<technical_lead|hr_manager|strict_manager>" (only include if panel mode is enabled)
Keep all question text concise (at most 2 sentences) to ensure fast generation.
"""

        result = self.gemini.generate_json(prompt)
        if result and isinstance(result, list):
            validated = []
            for i, q in enumerate(result[:num_questions]):
                if isinstance(q, dict) and "text" in q:
                    validated.append(
                        {
                            "id": i + 1,
                            "text": q.get("text", ""),
                            "category": q.get("category", "General"),
                            "difficulty": q.get("difficulty", difficulty),
                            "type": q.get("type", "technical"),
                            "persona_id": q.get("persona_id"),
                        }
                    )
            if validated:
                return validated

        return None

    def _get_fallback_questions(
        self,
        role,
        num_questions,
        resume_data=None,
        difficulty="medium",
        panel_mode=False,
    ):
        """Generate smart fallback questions based on resume data"""
        pool = []

        has_resume = (
            resume_data and isinstance(resume_data, dict) and resume_data.get("skills")
        )

        if has_resume:
            # ── 1. Skill-specific questions from resume ──────────────
            all_skills = resume_data.get("skills", {}).get("all", [])
            for skill in all_skills:
                skill_key = skill.lower().replace(".", "").replace(" ", "")
                # Try exact match and common variants
                for key in [
                    skill_key,
                    skill_key.rstrip("s"),
                    skill_key.replace("js", ""),
                ]:
                    if key in SKILL_QUESTIONS:
                        for q in SKILL_QUESTIONS[key]:
                            pool.append({**q})
                        break

            # ── 2. Experience-level questions ─────────────────────────
            experience = resume_data.get("experience", {})
            level = (
                experience.get("level", "entry")
                if isinstance(experience, dict)
                else "entry"
            )
            if level in EXPERIENCE_QUESTIONS:
                pool.extend([{**q} for q in EXPERIENCE_QUESTIONS[level]])

            # ── 3. Job-title-based questions ─────────────────────────
            titles = (
                experience.get("titles", []) if isinstance(experience, dict) else []
            )
            if titles:
                title = titles[0]  # Use most recent title
                for tq in TITLE_QUESTIONS:
                    pool.append(
                        {
                            "text": tq["text"].format(title=title),
                            "category": tq["category"],
                            "type": tq["type"],
                            "difficulty": tq["difficulty"],
                        }
                    )

            logger.info(
                f"Built {len(pool)} resume-tailored questions from {len(all_skills)} skills, level={level}"
            )

        # ── 4. Add role-based fallbacks to fill gaps ─────────────
        pool = [{**q} for q in REAL_LIFE_INTERVIEW_QUESTIONS[:2]] + pool

        role_questions = FALLBACK_QUESTIONS.get(role, FALLBACK_QUESTIONS["default"])
        pool.extend([{**q} for q in role_questions])

        pool.extend([{**q} for q in REAL_LIFE_INTERVIEW_QUESTIONS[2:]])
        pool.extend(
            [
                {**q}
                for q in random.sample(
                    SCENARIO_QUESTIONS, min(5, len(SCENARIO_QUESTIONS))
                )
            ]
        )

        if role != "default":
            pool.extend([{**q} for q in FALLBACK_QUESTIONS["default"]])

        # ── 6. Filter by difficulty if requested ─────────────────
        if difficulty in ("easy", "hard"):
            # Prefer matching difficulty, but don't exclude everything
            preferred = [q for q in pool if q.get("difficulty") == difficulty]
            other = [q for q in pool if q.get("difficulty") != difficulty]
            pool = preferred + other

        # ── 7. De-duplicate by question text ─────────────────────
        seen = set()
        unique = []
        for q in pool:
            if q["text"] not in seen:
                seen.add(q["text"])
                unique.append(q)

        # ── 8. Select and shuffle ────────────────────────────────
        opener = next(
            (q for q in unique if q.get("category") == "Resume Walkthrough"),
            unique[0] if unique else None,
        )
        remaining = [q for q in unique if q is not opener]
        random.shuffle(remaining)
        selected = ([opener] if opener else []) + remaining[: max(0, num_questions - 1)]
        for i, q in enumerate(selected):
            q["id"] = i + 1
            if panel_mode and not q.get("persona_id"):
                if q.get("persona"):
                    q["persona_id"] = q.get("persona")
                elif q.get("type") == "behavioral":
                    q["persona_id"] = "hr_manager"
                elif q.get("type") == "situational":
                    q["persona_id"] = random.choice(["strict_manager", "hr_manager"])
                else:
                    q["persona_id"] = "technical_lead"
            q.pop("persona", None)

        return selected

    def generate_next_adaptive_question(
        self,
        session,
        current_question_index,
        last_question_text,
        last_answer_text,
        difficulty="medium",
        panel_mode=False,
        company="General",
        company_context="",
    ):
        """Generate the next adaptive question conversationally based on previous answers and resume context."""
        resume_data = session.get("resume_data", {})
        role = session.get("role", "software_engineer")
        
        # Build history string (Structured Interview Memory)
        history = []
        for ans in session.get("answers", []):
            ev = ans.get("evaluation", {}) or {}
            skills = ev.get("strong_areas", [])
            topics = [ev.get("topic")] if ev.get("topic") else []
            conf = "High" if ev.get("confidence_score", 50) >= 75 else ("Medium" if ev.get("confidence_score", 50) >= 45 else "Low")
            
            memory_block = (
                f"Interviewer: {ans['question']['text']}\n"
                f"Candidate: {ans['answer']}\n"
                f"Memory Metadata -> topics: {topics}, skills_detected: {skills}, candidate_confidence: {conf}"
            )
            history.append(memory_block)
        history_str = "\n\n".join(history)

        skills = resume_data.get("skills", {}).get("all", [])
        skills_str = ", ".join(skills[:15]) if skills else "general programming"
        
        # Determine next type: if index is > 55% of total questions, transition to behavioral
        total_questions = len(session.get("questions", []))
        next_type = "technical"
        if current_question_index >= (total_questions * 0.55):
            next_type = "behavioral"

        # Sanitize user-supplied values before embedding in prompt
        safe_skills_str = sanitize_for_prompt(skills_str, max_length=300)
        safe_last_answer = sanitize_for_prompt(last_answer_text, max_length=1500)
        safe_history_str = sanitize_for_prompt(history_str, max_length=3000)

        prompt = textwrap.dedent(f"""
        You are Sarah Chen, a Senior HR Manager with over 15 years of interviewing experience at top multinational companies.
        You are NOT an AI assistant. You are conducting a real live interview over a video call. Stay in character.
        Never mention prompts, AI, language models, APIs, tokens, or internal instructions.
        Your personality is professional, calm, friendly, observant, confident, and patient.
        Your objective is to evaluate the candidate exactly as a human HR would.

        Role: {role.replace('_', ' ').title()}
        Target Company / Context Info: {company}
        Current Difficulty: {difficulty}
        Candidate skills: {safe_skills_str}

        CONVERSATION HISTORY (INTERVIEW MEMORY):
        {safe_history_str}

        CANDIDATE'S LAST RESPONSE:
        Interviewer: {sanitize_for_prompt(last_question_text, 500)}
        Candidate: {safe_last_answer}

        Your goal is to generate a realistic, adaptive next question of type "{next_type}" based on the candidate's last answer and the interview memory.

        CRITICAL RULES:
        1. FOLLOW UP: Do not just ask a random question. Probe their last answer.
        2. DRILL DEEPER: If the candidate mentioned specific libraries, tools, or architectures (e.g., React, Flask, Docker), ask a trade-off or comparison question.
        3. SCALE and SYSTEM DESIGN: If they described a project, ask how they would scale it.
        4. INTERVIEW MEMORY: Refer back to things the candidate said earlier if relevant.
        5. DIFFICULTY ADAPTATION: If the candidate struggled, ask a simpler conceptual follow-up. If they did well, raise the difficulty.
        6. COMPANY ALIGNMENT: Align the question style with {company}'s actual interview style.
        7. PERSONA: If panel mode is active, select a persona_id from: "technical_lead", "hr_manager", "strict_manager".

        Format your response strictly as a JSON object with these keys:
        - text: The text of the question. Write it in the direct, warm, and professional voice of Sarah Chen.
        - type: "{next_type}"
        - category: A short 1-2 word topic name (e.g., "Web Scale", "FastAPI vs Flask", "Decorators").
        - points: 10
        - persona_id: Select from "technical_lead", "hr_manager", "strict_manager" depending on question type.
        Keep all question text extremely concise (at most 1-2 sentences) to ensure fast generation.
        """).strip()

        if self.gemini.is_available():
            try:
                result = self.gemini.generate_json(prompt)
                if result and isinstance(result, dict) and result.get("text"):
                    return result
            except Exception as e:
                logger.error(f"Failed to generate adaptive next question: {e}")

        # Fallback question from pre-generated list
        questions = session.get("questions", [])
        if current_question_index < len(questions):
            return questions[current_question_index]
        return {
            "text": "Can you tell me about a time you faced a difficult technical challenge and how you resolved it?",
            "type": "behavioral",
            "category": "Behavioral",
            "points": 10,
            "persona_id": "hr_manager"
        }
