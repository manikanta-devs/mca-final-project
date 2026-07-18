# NexHire Interview Platform - Beta Test & QA Review Report

This report summarizes the codebase static analysis and dynamic QA audit conducted on the NexHire interview platform (Flask + React/Vite + SQLite + Gemini API). The evaluation identifies security flaws, authorization issues, UX/UI defects, and accessibility gaps.

---

## 🔴 Must-Fix

### 1. Bypassable Ownership Validation on Data Retrieval Endpoints (Critical IDOR)
*   **What I did**: Inspected the authorization checks in `backend/routes/analytics_routes.py` (line 60), `backend/routes/interview_routes.py` (lines 351, 382, 417, 433), and `backend/routes/quiz_routes.py` (lines 68, 88, 114).
*   **What happened vs what should happen**: The authorization check is implemented as `if session.get("username") and session.get("username") != request.username:`. If `session.get("username")` is `None` (which occurs for unassigned sessions, legacy data, or anonymous sessions), the condition resolves to `False` and bypasses the entire validation block. It should strictly enforce that a valid username is present and matches the authenticated user.
*   **Why it matters**: Allows any logged-in user to access, view, or modify details of other users' sessions if the database username field is null.
*   **A concrete fix/direction**: Refactor the verification logic to ensure the field is present:
    ```python
    session_owner = session.get("username")
    if not session_owner or session_owner != request.username:
        return jsonify({"error": "Forbidden"}), 403
    ```

### 2. Missing Ownership Checks on Active Writing and Onboarding Routes (Critical IDOR)
*   **What I did**: Analyzed mutation routes in `backend/routes/interview_routes.py` targeting `/interview/answer` (`submit_answer`), `/interview/onboarding-response` (`generate_onboarding_response`), `/interview/analyze-live`, and `/interview/coach`.
*   **What happened vs what should happen**: These endpoints fetch the session via `session = interview_service.get_session(session_id)` but perform **zero ownership validation** against `request.username`. Any user with a valid JWT token can write answers, edit context, or advance other candidates' interviews by guessing their UUID.
*   **Why it matters**: A malicious candidate can tamper with other users' live interviews, overwrite their submissions, or alter AI evaluation inputs.
*   **A concrete fix/direction**: Implement the session ownership check right after fetching the session:
    ```python
    if session.get("username") and session.get("username") != request.username:
        return jsonify({"error": "Forbidden"}), 403
    ```

### 3. Authentication Bypass via Mock Tokens in Non-Production Mode
*   **What I did**: Examined the JWT token parser in `backend/utils/auth_utils.py` and the `verify_token` implementation.
*   **What happened vs what should happen**: The route parser contains a bypass permitting arbitrary usernames when the token starts with `token_`:
    ```python
    if is_dev_or_test and token.startswith("token_"):
        username = token[6:] if len(token) > 6 else "Candidate"
        return {"username": username, "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS}
    ```
    Additionally, if `TESTING = True` is active, it defaults to user `"Candidate"` for completely unauthenticated routes. In secure platforms, development shortcuts should be isolated strictly to unittest suites rather than checking a generic `FLASK_ENV` value.
*   **Why it matters**: If the server is deployed to a staging or testing server in a semi-public network without setting `FLASK_ENV=production`, anyone can bypass the login page and access the entire system by sending `Bearer token_admin`.
*   **A concrete fix/direction**: Restrict bypass logic so that it only triggers under actual pytest running environments, or enforce that requests originate from `127.0.0.1`.

### 4. Username Hijacking of Default `"Candidate"` Accounts
*   **What I did**: Investigated the registration route `/api/auth/register` in `backend/app.py` and default fallbacks in `database.py` and service classes.
*   **What happened vs what should happen**: Unassigned, legacy, or default sessions are assigned to `"Candidate"` as a fallback owner. However, the registration endpoint permits any user to sign up with the username `"Candidate"`. It should reject registrations matching reserved usernames.
*   **Why it matters**: An attacker can register the username `"Candidate"` and automatically inherit and inspect all anonymous/default sessions created across the site.
*   **A concrete fix/direction**: Establish a list of forbidden usernames in the registration controller (e.g. `["Candidate", "admin", "anonymous", "null"]`) and return a `400 Bad Request` if a match is found.

### 5. Global Database Deletion via Bulk Reset Endpoint (Data Loss Risk)
*   **What I did**: Analyzed `/analytics/clear` in `backend/routes/analytics_routes.py` and `db.delete_all()` in `database.py`.
*   **What happened vs what should happen**: Triggering `/analytics/clear` executes `analytics_service.clear_all()`, which maps directly to a global database wipe. It should only clean records associated with the requesting user.
*   **Why it matters**: Any authenticated user can trigger a reset and purge the entire database globally, destroying other candidates' interview histories.
*   **A concrete fix/direction**: Modify `clear_all()` to accept `request.username` and change the SQL execution to filter deletion by username:
    ```sql
    DELETE FROM sessions WHERE username = ?
    ```

---

## 🟠 Should-Fix

### 6. Insecure LocalStorage JWT Token Storage
*   **What I did**: Examined token handlers in `frontend/src/pages/AuthPage.jsx` and `frontend/src/api/client.js`.
*   **What happened vs what should happen**: Tokens are stored in browser `localStorage`, making them accessible to any script running on the client. They should be stored in secure cookies.
*   **Why it matters**: If an XSS vulnerability occurs anywhere on the site, an attacker can extract session keys, compromising user accounts.
*   **A concrete fix/direction**: Transition token persistence to secure, `HttpOnly`, `SameSite=Strict` cookies, or configure a Content Security Policy (CSP) blocking unauthorized script evaluations.

### 7. Publicly Accessible Database Backup Endpoint
*   **What I did**: Inspected the routes in `backend/app.py` for `/backup` (line 303).
*   **What happened vs what should happen**: The backup endpoint lacks a `@token_required` decorator, allowing unauthenticated guests to trigger a database snapshot (`shutil.copy2`) on disk.
*   **Why it matters**: Anonymous scripts can hit this endpoint repeatedly to force massive filesystem allocations, leading to server storage exhaustion (DoS).
*   **A concrete fix/direction**: Apply the `@token_required` decorator and restrict access strictly to authorized administrator accounts.

### 8. Cross-Site Scripting (XSS) Hazard in AI Recommendations
*   **What I did**: Inspected layout structures in `frontend/src/pages/AnalyticsPage.jsx` (line 307).
*   **What happened vs what should happen**: AI recommendations are rendered into the DOM using `dangerouslySetInnerHTML={{ __html: aiRecommendationText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}`. Content should be sanitized prior to raw injection.
*   **Why it matters**: If Gemini returns a script block (triggered via a resume prompt injection), it will execute directly in the candidate's browser.
*   **A concrete fix/direction**: Sanitize the HTML output using a utility like `DOMPurify` before binding it to the DOM.

### 9. Lack of Mobile Responsiveness in Broadcast Studio Layout
*   **What I did**: Resized the viewport of the broadcast studio page (`VirtualInterviewRoom.jsx`) to mobile breakpoints.
*   **What happened vs what should happen**: The layout class forces a side-by-side flexbox container (`flex-1 flex gap-3 p-3 min-h-0`), causing the video feeds to be squished. The container should stack vertically on small viewports.
*   **Why it matters**: Candidates using mobile phones or tablets will encounter overlapping controls and distorted webcam feeds.
*   **A concrete fix/direction**: Add responsive media query classes:
    ```javascript
    <div className="flex-1 flex flex-col md:flex-row gap-3 p-3 min-h-0">
    ```

### 10. Mid-Interview Page Refresh and Navigation Session Loss
*   **What I did**: Analyzed `frontend/src/pages/InterviewPage.jsx` and the Zustand state store `frontend/src/store/useAppStore.js`.
*   **What happened vs what should happen**: There are no React Router navigation blockers or browser `beforeunload` event listeners registered, and the Zustand store does not persist its states. Refreshing the browser or navigating away immediately wipes the active interview session, destroying all completed answers. The app should display a confirmation warning before losing active states.
*   **Why it matters**: Candidates can accidentally lose 30 minutes of interview progress due to a minor navigation slip or browser refresh action.
*   **A concrete fix/direction**: Register a `beforeunload` window event listener in `InterviewPage.jsx` when an interview is active, and implement simple persistence for resume and session states in Zustand.

### 11. Bypassed Pydantic Input Length Constraints (Dead Code)
*   **What I did**: Inspected Pydantic validators in `backend/validators.py` and compared them against active route handlers in `backend/routes/interview_routes.py`.
*   **What happened vs what should happen**: `AnswerEvaluationRequest` defines strict validation boundaries (e.g. `max_length=2000`), but this schema is never imported or utilized in `interview_routes.py` routes (which accept raw input strings). Incoming answer routes must pass through Pydantic validators.
*   **Why it matters**: The server is vulnerable to buffer overload attacks, excessive AI token billing, or database bloat if a candidate posts extremely long paragraphs.
*   **A concrete fix/direction**: Import `AnswerEvaluationRequest` and run it against the request JSON in `submit_answer` (line 130) before processing text evaluations.

---

## 🟡 Polish

### 12. Hardcoded Mock Network Quality Simulator
*   **What I did**: Reviewed the `useNetworkQuality` hook inside `frontend/src/components/VirtualInterviewRoom.jsx`.
*   **What happened vs what should happen**: The network monitor selects labels at random from a static pool (`['HD', 'Good', 'Excellent']`) every few seconds rather than performing real latency/liveness checks.
*   **Why it matters**: Candidates might lose connection entirely, yet the interface will continue to report an "Excellent" connection.
*   **A concrete fix/direction**: Monitor `navigator.onLine` and test backend response speeds by executing head requests to `/health`.

### 13. Accessibility Violations (WCAG Standards)
*   **What I did**: Reviewed accessibility markers, focus rings, and contrast values in the broadcast interview room.
*   **What happened vs what should happen**:
    *   Mic, camera, and quit controls lack `aria-label` screen reader tags.
    *   Status labels display with low contrast ratios (`text-white/30` and `text-white/40`).
    *   No keyboard shortcuts are registered to toggle media or end the session.
*   **Why it matters**: Visually impaired or motor-impaired candidates will experience substantial barriers navigating the interview dashboard.
*   **A concrete fix/direction**: Add descriptive `aria-label` tags, increase text contrast (e.g., to `text-white/60`), and register keydown event listeners (e.g. `Space` or `m` to toggle mic).

### 14. Lack of Dynamic Speech Recognition Portability
*   **What I did**: Inspected the speech-to-text hook configuration in `frontend/src/features/video-interview/hooks/useSpeechToText.js`.
*   **What happened vs what should happen**: Speech recognition uses the Web Speech API (`window.SpeechRecognition`), which is natively unsupported on Brave and Firefox, and requires active internet connectivity to stream audio to browser vendor servers. It should gracefully fallback to textual alternatives or show compatibility warnings.
*   **Why it matters**: Candidates using unsupported browsers will find the speech-to-text recording functionality silently broken.
*   **A concrete fix/direction**: Enforce checking if speech recognition objects are undefined and display a friendly message advising the user to type answers instead.

### 15. Double-Buffered Video Avatar Ghosting Artifacts
*   **What I did**: Reviewed the HTML5 video elements in `frontend/src/components/AIInterviewerRoom.jsx`.
*   **What happened vs what should happen**: When a new question loads, the avatar transitions between video clips (e.g. `idle` to `talking`) by cross-fading opacity. Because the body posture in the clips is slightly offset, a double-exposure ghosting artifact occurs. The clips should have aligned postures or instant swaps.
*   **Why it matters**: Disrupts the visual realism and immersion of the "broadcast studio" experience.
*   **A concrete fix/direction**: Trim and pre-align the video assets to match key reference frames, or decrease cross-fade opacity transitions to 100ms.

### 16. Cold-Start Empty States on Dashboard & Analytics Page
*   **What I did**: Inspected default loading states in `frontend/src/pages/DashboardOverview.jsx` and `frontend/src/pages/AnalyticsPage.jsx` under a new account context.
*   **What happened vs what should happen**: The page locks downstream workflow stages, but displays a flat consistency heatmap and empty Recharts analytics graphs with blank labels. It should render friendly mock suggestions or placeholder cards instead of empty grids.
*   **Why it matters**: The cold-start experience feels unfinished and confusing for first-time candidates.
*   **A concrete fix/direction**: Display clear placeholders (e.g., "Complete your first interview to generate this radar chart") overlaid on empty analytics cards.

---

## 🟢 What's Working Well

### 17. Secured Gemini API Backend Brokerage
*   **What I did**: Scanned the React frontend source files for API keys and endpoint endpoints.
*   **What happened vs what should happen**: The frontend does not expose any Gemini API keys or tokens. All LLM calls are brokered through backend proxies, which is the correct architecture.
*   **Why it matters**: Protects AI credits from extraction and misuse by malicious users inspecting frontend assets.
*   **A concrete fix/direction**: Keep this proxy structure as-is.

### 18. Multi-Provider AI Fallback and Cooldown Engine
*   **What I did**: Inspected provider handlers in `backend/ai/gemini_service.py`.
*   **What happened vs what should happen**: The backend correctly configures fallback services (Gemini, DeepSeek, Groq, Mistral, Hugging Face) and puts failing APIs on a 300-second cooldown penalty.
*   **Why it matters**: Guarantees interview question generation and evaluation remain functional even if Gemini service experiences outages.
*   **A concrete fix/direction**: Maintain the fallback chain structure.

### 19. Contextual AI Prompts and Blueprints
*   **What I did**: Read the prompt instructions in `backend/ai/question_generator.py` and evaluated prompt tailoring.
*   **What happened vs what should happen**: Prompts extract skills, experience levels, company profiles, and Wikipedia summaries. They generate 7 structured interview stages with strict deduplication checks.
*   **Why it matters**: Candidates receive highly realistic, customized questions instead of generic, repetitive trivia.
*   **A concrete fix/direction**: The prompt structure is highly mature and should be kept.

### 20. Resiliency to SQL Injection and CSRF
*   **What I did**: Reviewed SQL formatting in `backend/services/database.py` and token headers in `client.js`.
*   **What happened vs what should happen**: SQL commands are executed exclusively with parameterized inputs (`?` syntax), and auth is header-based rather than browser-cookie-based.
*   **Why it matters**: Mitigates major web vulnerabilities such as SQL injection and CSRF attacks.
*   **A concrete fix/direction**: Keep this security layout.

### 21. Clean WebGL Resource Disposals
*   **What I did**: Inspected the Three.js cleanup block inside `frontend/src/components/VideoInterviewRoom.jsx`.
*   **What happened vs what should happen**: The `useEffect` cleanup handler loops through geometries, materials, and renderer configurations to dispose of WebGL objects.
*   **Why it matters**: Prevents GPU memory leaks and tab crashes when candidates open and close interview rooms repeatedly.
*   **A concrete fix/direction**: Keep the resource traversal disposals.

### 22. Graceful Resume Parsing Fallbacks
*   **What I did**: Scanned exception catches in `backend/services/resume_service.py`.
*   **What happened vs what should happen**: Document extraction exceptions are caught, and the backend falls back to local spaCy diagnostics if the AI parser fails.
*   **Why it matters**: Ensures the candidate is still onboarded and graded even if parsing crashes or connection drops.
*   **A concrete fix/direction**: Keep exception catches.

---

## Top 3 Critical Fixes Before Submission

Before final project submission, the following top three critical fixes must be implemented immediately to secure the platform and protect candidate data: first, session ownership validation must be added to all backend mutation routes (specifically `/api/interview/answer` and `/api/interview/onboarding-response`) to stop authenticated users from submitting answers or tampering with other candidates' live interviews; second, the global database wipe in the `/analytics/clear` route must be scoped strictly to the requesting user's records to prevent data-loss exploits; and third, the username `"Candidate"` and other reserved default system strings must be blacklisted in the `/api/auth/register` flow to stop attackers from registering accounts that automatically hijack anonymous or unassigned session history.
