# Project: NexHire Interview Platform QA & Product Review

## Architecture
- Frontend: React / Vite (located in `frontend/`)
- Backend: Flask (located in `backend/`)
- Database: SQLite (located in `backend/` or database folder)
- Integrations: Gemini API for dynamic question generation and response analysis

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | M1: Codebase Setup & Exploratory Run | Spawn explorer/worker to start frontend and backend, perform basic walkthrough | None | DONE |
| 2 | M2: Security Audit & Token Exposure | Analyze client-side codebase for exposed API keys, IDOR, auth issues | M1 | DONE |
| 3 | M3: Detailed QA Audit & Edge Cases | Deep dive into onboarding, resume upload, avatar, live captions, network drop | M1 | DONE |
| 4 | M4: Performance, Mobile & Accessibility | Verify 3D lag, accessibility (screen reader, keyboard), mobile responsive | M1 | DONE |
| 5 | M5: Synthesis & Report Generation | Synthesize all subagent findings into C:\anime\ai-interview-system\BETA_TEST_REPORT.md | M2, M3, M4 | DONE |

## Interface Contracts & Entry Points
- Backend Server: Typically runs on port 5000 / 8000 / 5001
- Frontend Client: Typically runs on port 5173 / 3000
- API Endpoints: Auth, Resume Upload, Interview Session, Answer Submission, Report Retrieval
