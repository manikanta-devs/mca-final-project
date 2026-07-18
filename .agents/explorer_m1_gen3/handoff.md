# Handoff Report: Codebase Inspection of NexHire Interview Platform

## 1. Observation
We conducted a comprehensive static analysis of the NexHire interview platform codebase across the frontend (React/Vite) and backend (Flask). Below are the direct observations of the architecture, integration patterns, and security postures.

### A. Codebase Architecture Layout
*   **Frontend Client Entry Points**:
    *   `frontend/index.html`: Bootstraps the application. Mounts `frontend/src/main.jsx` (line 14: `<script type="module" src="/src/main.jsx"></script>`).
    *   `frontend/src/main.jsx`: Renders the React DOM using `App` inside `AppProvider`.
    *   `frontend/src/App.jsx`: Sets up React Router routing (lines 25-40). Defines protected workspace routes under `<Route element={<ProtectedRoute />}>` covering path `/dashboard` and sub-pages `/coach`, `/resume`, `/interview`, `/quiz`, `/analytics`, and `/results/:sessionId`.
*   **Frontend Modules & API Layer**:
    *   `frontend/src/api/client.js`: Axiom HTTP client initialization with request/response interceptors. Request interceptor appends Bearer tokens (lines 33-36: `const token = localStorage.getItem('token')` ... `config.headers.Authorization = 'Bearer ' + token`). Response interceptor processes errors, clearing local credentials on 401 Unauthorized status (lines 62-70).
*   **Backend Server Entry Points**:
    *   `backend/app.py`: Standard Flask entry point. Sets up CORS using `ALLOWED_ORIGINS` config, registers blueprint modules (`resume_bp`, `interview_bp`, `analytics_bp`, `quiz_bp`, `coach_bp`, `video_interview_bp`, `realtime_bp`), handles global exceptions, and implements auth logic `/api/auth/register` and `/api/auth/login`.
*   **Backend Directories**:
    *   `backend/routes/`: Orchestrates blueprints mapping routes to controllers.
    *   `backend/services/`: Direct interface to database and business logic (`database.py` manages tables/queries, `interview_service.py` handles sessions, `resume_service.py` handles file parsing).
    *   `backend/ai/`: Handles LLM generation/evaluation wrappers.
    *   `backend/utils/`: Authentication utilities and helper functions.
    *   `backend/data/`: Default path for local persistence (`interviews.db`, `quizzes.json`).

### B. Gemini API Integration
*   **Backend Brokerage**: No Gemini API keys or endpoints are configured or fetched on the client-side (`frontend/`). The client is strictly stateless regarding LLMs, querying backend proxies (e.g. `client.post('/api/interview/answer', ...)`).
*   **Multi-Provider Fallback Service**:
    *   `backend/ai/gemini_service.py`: `GeminiService` class implements a fallback chain (lines 334-340: Gemini, DeepSeek, Groq, OpenRouter, Mistral, and Hugging Face).
    *   **Direct HTTP Calls**: Line 93: `url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent?key={self.api_key}"`. Gemini calls bypass the official SDK and communicate via direct HTTP REST requests to avoid gRPC dependency issues.
    *   **Credentials & Secrets**: Secrets are loaded from environment variables (`GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, etc.) via `os.getenv()`.
    *   **Cooldown Engine**: Automatically puts failing providers on a 300-second cooldown (lines 457, 467, 475) to prevent stalling request chains on successive failures.

### C. Security Audit: Authentication, IDOR, & Exploits
*   **Authentication Mechanism**:
    *   Protected backend endpoints use `@token_required` decorator (defined in `backend/utils/auth_utils.py`, line 68). It decodes JWT using `jwt.decode` (line 47) and binds `request.username = payload.get("username")` (line 103).
    *   **Dev/Test Bypass**: `verify_token` in `backend/utils/auth_utils.py` contains a bypass (lines 42-44):
        ```python
        if is_dev_or_test and token.startswith("token_"):
            username = token[6:] if len(token) > 6 else "Candidate"
            return {"username": username, "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS}
        ```
*   **Critical IDOR Vulnerabilities**:
    1.  **Bypassable Ownership Validation**:
        In `backend/routes/analytics_routes.py` (line 60), `backend/routes/interview_routes.py` (lines 351, 382, 417, 433), and `backend/routes/quiz_routes.py` (lines 68, 88, 114), ownership is validated using:
        ```python
        if session.get("username") and session.get("username") != request.username:
            return jsonify({"error": "Forbidden"}), 403
        ```
        If `session.get("username")` is `None` (which occurs for legacy database records, or if sessions are generated without explicitly setting the `"username"` key), the condition `session.get("username")` resolves to `False`. Thus, the authorization check is entirely bypassed, allowing any authenticated user to view or modify details.
    2.  **Lack of Ownership Validation on Active Writes**:
        *   `backend/routes/interview_routes.py` -> `/interview/answer` (line 130) and `/interview/onboarding-response` (line 271):
            These endpoints fetch the session via `session = interview_service.get_session(session_id)` but perform **no ownership checks** against `request.username`. Any user with a valid JWT token can write answers, advance, or modify details for any other user's session if they know the UUID.
        *   `backend/routes/interview_routes.py` -> `/interview/analyze-live` (line 495) and `/interview/coach` (line 442):
            These endpoints fetch sessions and parse transcripts or context without validating that the session belongs to `request.username`.
    3.  **Username Hijacking & Default Collision**:
        *   Default username fallback is `"Candidate"` across backend services (`database.py` line 138, `interview_service.py` line 32, `quiz_service.py` line 200).
        *   `backend/app.py` `/api/auth/register` (line 179) accepts any registration username and does not block registering as `"Candidate"`. Anyone can register a username named `"Candidate"` and automatically claim ownership of all default-fallback or unassigned sessions.
    4.  **Bulk Deletion Scope**:
        *   `backend/routes/analytics_routes.py` -> `/analytics/clear` (line 161) calls `analytics_service.clear_all()` which triggers `db.delete_all()` (deleting all database records globally rather than scoping the deletion to the requesting user's records).
*   **Unauthenticated Endpoint Exploitation**:
    *   `backend/app.py` (line 303) defines a POST route `/backup` without a `@token_required` decorator. Any anonymous visitor can post to `/backup` and trigger a database file snapshot on disk (`shutil.copy2`), potentially leading to disk exhaustion attacks.
*   **CSRF, XSS, and SQL Injection Assessments**:
    *   **CSRF**: Secure. Tokens are stored in localStorage and passed manually via authorization headers; browsers do not auto-send headers on cross-site requests.
    *   **XSS**: Safe. React automatically escapes HTML contents. The only `dangerouslySetInnerHTML` usage (in `frontend/src/pages/AnalyticsPage.jsx`, line 307) targets locally generated templates (`aiRecommendationText`), avoiding user-supplied HTML injection.
    *   **SQL Injection**: Secure. All SQL database executions in `backend/services/database.py` utilize parameterized queries (e.g. `?` placeholders) mapping input safely to variables.
    *   **Command Injection**: Secure. Subprocess execution in `backend/routes/interview_realtime_routes.py` (line 151) uses argument arrays rather than shell execution (`shell=True` is not used).

### D. Config and Secrets
*   **Environment Files**: `.env` is present in the project root and `backend/.env`. Both files store active API tokens for multiple AI providers (including Hugging Face, Gemini, Groq, OpenRouter, Mistral, and DeepSeek).
*   **Git Exposure**: The `.env` pattern is correctly documented in `.gitignore` (line 17: `.env`), meaning these secrets are ignored in commits, but they are fully visible locally.
*   **Production Validation**: `app.py` enforces safety requirements in production (lines 51-61): if `FLASK_ENV=production` is set, the server rejects fallback/weak secrets, forcing the server to shut down immediately unless a secure `SECRET_KEY` of at least 32 characters is configured.

---

## 2. Logic Chain
1.  **Architecture Mapping**: We examined frontend routes (`App.jsx`), API client configs (`client.js`), backend configurations (`config.py`), and blueprints (`app.py`). These demonstrate a clean decoupled architecture where the frontend serves as a presentation layer and delegates all critical logic to Flask.
2.  **API Brokerage**: Grepping for `GEMINI_` and `apiKey` across the frontend returned zero hardcoded keys or direct external calls. All requests route to the backend proxy where `GeminiService` manages the fallback chain, confirming that the Gemini API is strictly backend-brokered.
3.  **Vulnerability 1 (Bypassable IDOR)**: We observed that session validation checks check `session.get("username")` before matching it with `request.username`. If the database returns `NULL` for the username column, `session.get("username")` evaluates to `None`. In python, `None` in `None and None != request.username` halts evaluation and skips the entire block. Therefore, users can access sessions without proper authorization.
4.  **Vulnerability 2 (Missing IDOR Checks)**: We compared routes like `/interview/complete` (which checks `session.get("username")`) to routes like `/interview/answer`. The lack of any username matching statement in the latter routes means that once a session is active, any logged-in user can execute writes to it by supplying its UUID.
5.  **Vulnerability 3 (Username Collision)**: Because `"Candidate"` is used as a fallback owner in the database and session creation classes, and the registration endpoint `/api/auth/register` does not reject registration for `"Candidate"`, any user who signs up with the username `"Candidate"` will pass the `session.get("username") == request.username` check for all unowned sessions.
6.  **Vulnerability 4 (Bulk Deletion)**: Calling `DELETE /api/analytics/clear` triggers `db.delete_all()`. Analysis of `delete_all` in `database.py` shows it issues `DELETE FROM sessions` unconditionally, destroying the entire table rather than filtering by the user's username.
7.  **Vulnerability 5 (Unauthenticated Backup)**: The `/backup` endpoint lacks the `@token_required` decorator. Thus, any HTTP client can trigger a backup without authentication, executing server-side disk writes.

---

## 3. Caveats
*   We did not run the dynamic integration tests (`pytest`) because terminal command execution permissions timed out on the host environment. All assessments are based on static analysis of the source code.
*   We assumed that SQLite is the active database engine (which is the default on local dev instances). While the database driver wrapper contains compatibility modifications for PostgreSQL, some PostgreSQL-specific configurations were not dynamically tested.

---

## 4. Conclusion
The NexHire Interview Platform demonstrates a well-structured multi-provider AI fallback architecture that successfully hides API keys from the client-side and implements robust validation against SQL injection and CSRF. However, the static analysis revealed critical authentication and authorization bypasses (IDOR) on session read/write endpoints, data exposure potentials via default username collisions, bulk deletion data-loss risks, and unauthenticated endpoints.

### Actionable Recommendations:
1.  **Refactor IDOR Checks**: Replace `if session.get("username") and session.get("username") != request.username` with a strict validation block:
    ```python
    session_owner = session.get("username")
    if not session_owner or session_owner != request.username:
        return jsonify({"error": "Forbidden"}), 403
    ```
2.  **Add Token Restrictions on Active Routes**: Wire up `@token_required` and ownership checks to `/interview/answer`, `/interview/onboarding-response`, `/interview/analyze-live`, and `/interview/coach`.
3.  **Restrict Reserved Usernames**: Prevent candidates from registering usernames like `"Candidate"`, `"anonymous"`, or `"admin"` in the register API.
4.  **Scope Deletion & Protect Backups**: Modify `/analytics/clear` to only delete sessions matching the requesting user's records, and add `@token_required` to `/backup`.

---

## 5. Verification Method
To verify these findings:
1.  **Inspect Session Ownership Logic**:
    Open `backend/routes/analytics_routes.py` (lines 52-68) and `backend/routes/interview_routes.py` (lines 409-423) and check the authorization condition.
2.  **Check Missing Auth Checks on Writes**:
    Open `backend/routes/interview_routes.py` and inspect `submit_answer` (line 130) and `generate_onboarding_response` (line 271) to confirm that `request.username` is never compared against the session's username.
3.  **Check Unauthenticated Backups**:
    Open `backend/app.py` (line 303) and verify that `trigger_backup` lacks the `@token_required` decorator.
4.  **Run Test suite (Optional)**:
    If permissions allow, execute `.venv/Scripts/pytest` from the root workspace folder to verify core authentication and rate limiting flows.
