Production build and submission package for AI Interview System

Contents included:
- `frontend/dist` (production frontend assets)
- `backend` (backend source)
- `backend/requirements-freeze.txt` (pinned Python packages)
- `docs/` and essential project files

Run without Docker (recommended for reviewers):
1. Create and activate a Python 3.11 venv in repository root:

   python -m venv .venv
   .\.venv\Scripts\activate

2. Install backend deps:

   python -m pip install --upgrade pip
   python -m pip install -r backend/requirements-freeze.txt

3. Download spaCy English model:

   python -m spacy download en_core_web_sm

4. Start backend:

   set FLASK_ENV=production
   set DEBUG=false
   .venv\Scripts\python.exe backend\app.py

5. Serve frontend (static): open `frontend/dist/index.html` in a static file server or copy contents to any static host.

Docker notes:
- Docker is not available in the build environment used here. If reviewers want Docker images, run:

  docker compose build
  docker compose up -d

Submission notes for university:
- Included a frozen `requirements-freeze.txt` for reproducibility.
- Large model artifacts or cloud credentials are not included. Provide keys via environment variables: `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `SECRET_KEY`.
- Suggested bundle size limit: avoid including `.venv`, `node_modules`, and large dataset/model files.

Contacts:
- Developer: provided in project metadata / README.md
