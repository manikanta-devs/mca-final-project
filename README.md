# 🤖 AI-Based Resume Driven Interview System v2.0

> An intelligent, full-stack interview preparation platform powered by **Google Gemini AI** and **spaCy NLP** — built with React + Flask.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **Resume Analysis** | Upload PDF/DOCX/TXT — extracts skills, experience, education via spaCy |
| 🎯 **Resume Scoring** | Grades your resume on skills, education, experience, completeness |
| 🤖 **AI Question Gen** | Gemini generates 3-10 tailored questions per role + resume |
| 🎙️ **Live Interview** | Timed text, voice, and video Q&A flow with countdown timer and skip support |
| 🗣️ **Communication Coach** | Daily drills for clarity, confidence, structure, and filler-word reduction |
| ⚡ **Answer Evaluation** | AI scores technical accuracy, clarity, completeness, and voice delivery |
| 📊 **Analytics Dashboard** | Track trends, radar charts, weak areas over all sessions |
| 🎯 **Job Match Analysis** | Compare a resume against a job description with fit score, gaps, and action plan |
| 🧠 **Quiz Practice** | Topic-based MCQ practice for Python, SQL, aptitude, and HR preparation |
| 🌙 **Dark Mode** | Full dark/light mode toggle |
| 💾 **Session Persistence** | All interviews saved to JSON, viewable anytime |
| 📥 **Export Results** | Download interview summary as .txt |
| 12+ Roles | Software Engineer, Data Scientist, DevOps, PM, and more |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Python 3.10+ + Flask 3 |
| AI | Google Gemini 1.5 Flash API |
| NLP | spaCy (`en_core_web_sm`) |
| State | React Context API |
| Charts | Recharts |
| Routing | React Router v6 |
| HTTP | Axios |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Gemini API Key (free at https://makersuite.google.com/app/apikey)

---

### 1️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start server
python app.py
```

Backend runs at: **http://localhost:5000**

Test: `curl http://localhost:5000/health`

---

### 2️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 📁 Project Structure

```
ai-interview-system/
├── backend/
│   ├── app.py                   # Flask app factory
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── resume_routes.py     # /api/resume/*
│   │   ├── interview_routes.py  # /api/interview/*
│   │   └── analytics_routes.py  # /api/analytics/*
│   ├── services/
│   │   ├── resume_service.py    # PDF/DOCX extraction + NLP
│   │   ├── interview_service.py # Session management + JSON storage
│   │   └── analytics_service.py # Performance aggregation
│   ├── ai/
│   │   ├── gemini_service.py    # Gemini API wrapper + retry logic
│   │   ├── question_generator.py# AI question generation + fallbacks
│   │   └── answer_evaluator.py  # AI answer scoring + feedback
│   └── data/                    # Auto-created, stores sessions.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Router + providers
    │   ├── context/
    │   │   └── AppContext.jsx   # Global state
    │   ├── api/
    │   │   └── client.js        # Axios API client
    │   ├── components/
    │   │   ├── Sidebar.jsx      # Collapsible navigation
    │   │   ├── Header.jsx       # Top bar
    │   │   ├── Timer.jsx        # Interview countdown
    │   │   ├── ProgressBar.jsx  # Linear + circular progress
    │   │   ├── ScoreCard.jsx    # Score display components
    │   │   └── LoadingSpinner.jsx
    │   └── pages/
    │       ├── LandingPage.jsx  # Hero / marketing page
    │       ├── Dashboard.jsx    # Layout with sidebar
    │       ├── DashboardOverview.jsx # Real-time dashboard summary
    │       ├── ResumePage.jsx   # Upload + analysis
    │       ├── InterviewPage.jsx# Full interview flow
    │       ├── CommunicationCoachPage.jsx # Speaking practice and drills
    │       ├── QuizPage.jsx     # Topic-based quiz practice
    │       ├── AnalyticsPage.jsx# Charts + history
    │       └── ResultsPage.jsx  # Per-session detailed results
    └── package.json
```

---

## 🔑 Environment Variables

### Backend `.env`
```env
GEMINI_API_KEY=your_key_here
PORT=5000
DEBUG=true
SECRET_KEY=your-secret-key
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| POST | `/api/resume/upload` | Upload + analyze resume |
| POST | `/api/resume/analyze-text` | Analyze pasted text |
| POST | `/api/resume/match-job` | Compare analyzed resume data against a job description |
| GET | `/api/resume/roles` | Get available roles |
| POST | `/api/interview/generate-questions` | Generate AI questions |
| POST | `/api/interview/start` | Start session |
| POST | `/api/interview/answer` | Submit answer + evaluate |
| POST | `/api/interview/complete` | Finalize interview |
| GET | `/api/quiz/topics` | Get quiz topics |
| POST | `/api/quiz/start` | Start a quiz session |
| POST | `/api/quiz/answer` | Submit quiz answer |
| POST | `/api/quiz/complete` | Finalize quiz |
| GET | `/api/quiz/sessions` | Quiz history |
| GET | `/api/analytics/summary` | Performance summary |
| GET | `/api/analytics/sessions` | All sessions |
| GET | `/api/analytics/performance-trend` | Score over time |
| GET | `/api/analytics/weak-areas` | Aggregated weak areas |

---

## 💡 Usage Flow

```
1. Landing Page → Click "Start Interview"
2. Resume Page → Enter name + upload resume/paste text
3. See extracted skills, education, experience, score
4. Click "Start Interview" → Interview Page
5. Configure role, difficulty, number of questions
6. Practice in text, voice, or video mode
7. See AI evaluation after each answer
8. Complete all questions → View Results
9. Open the Communication Coach → Improve clarity, confidence, and delivery
10. Use Quiz Practice → Strengthen weak topics before the next interview
11. Analytics Page → Track progress over time
```

---

## 🌐 Deployment

### Docker (optional)

```bash
# Build and start
docker-compose up --build
```

### Manual Deployment
```

## 📦 Deployment & Sharing (Admin)

Use Docker Compose for the simplest production-like deployment. Ensure you have Docker and Docker Compose installed.

1. Copy `.env.example` to `.env` and set keys (do NOT commit `.env`):

```
HUGGINGFACE_API_KEY=hf_xxx
GEMINI_API_KEY=your_gemini_key_optional
SECRET_KEY=change-me
FLASK_ENV=production
```

2. Build and run:

```powershell
docker-compose up --build -d
```

3. Verify services:

```powershell

**Backend (Gunicorn)**:
```bash
cd backend
```

4. Create a release zip to send to an admin (PowerShell):

```powershell
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```


5. To share on GitHub:
- Invite the admin as a collaborator (`Settings -> Collaborators`) or share the repo URL.
- Alternatively, create a GitHub Release and upload the zip archive.

Security notes:
- Never share your `.env` file or API keys over email/chat. Provide admins with instructions to add keys after they receive the code.
- Rotate keys if they are accidentally exposed.

**Frontend (Build)**:
```bash
cd frontend
npm run build
# Serve dist/ with nginx or any static host
```

---

## 🤝 Fallback Mode

If `GEMINI_API_KEY` is not set:
- Questions fall back to a built-in bank of 100+ role-specific questions
- Answer evaluation uses a heuristic scoring system based on word count and structure
- All other features work normally

---

## 📝 License

MIT License — Free to use and modify.

---

**Built with ❤️ using React, Flask, Google Gemini AI, and spaCy**
