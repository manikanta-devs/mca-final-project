@echo off
:: ============================================================
:: AI Interview System — One-Click Setup Script (Windows)
:: ============================================================

echo.
echo ╔══════════════════════════════════════════════╗
echo ║   AI Interview System v2.0 — Setup Script    ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ── Check Python ──────────────────────────────────────────
echo [1/6] Checking Python...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python 3 not found. Install from https://python.org
    pause
    exit /b 1
)
python --version
echo Python found.

:: ── Check Node.js ─────────────────────────────────────────
echo.
echo [2/6] Checking Node.js...
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
node --version
echo Node.js found.

:: ── Backend Setup ─────────────────────────────────────────
echo.
echo [3/6] Setting up Python backend...
cd backend

IF NOT EXIST venv (
    python -m venv venv
    echo Virtual environment created.
) ELSE (
    echo Virtual environment already exists.
)

call venv\Scripts\activate.bat
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo Python dependencies installed.

python -m spacy download en_core_web_sm
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download spaCy language model 'en_core_web_sm'.
    echo Please check your internet connection or run: python -m spacy download en_core_web_sm
    pause
    exit /b 1
)
echo spaCy model downloaded.

IF NOT EXIST .env (
    copy .env.example .env
    echo .env created — add your GEMINI_API_KEY
) ELSE (
    echo .env already exists.
)

IF NOT EXIST data mkdir data
IF NOT EXIST uploads mkdir uploads

cd ..

:: ── Frontend Setup ─────────────────────────────────────────
echo.
echo [4/6] Setting up React frontend...
cd frontend

npm install
echo Node.js dependencies installed.

IF NOT EXIST .env (
    copy .env.example .env
    echo Frontend .env created.
) ELSE (
    echo Frontend .env already exists.
)

cd ..

:: ── Done ──────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════╗
echo ║              Setup Complete!                 ║
echo ╚══════════════════════════════════════════════╝
echo.
echo Next Steps:
echo.
echo 1. Edit backend\.env and add:
echo    GEMINI_API_KEY=your_key_here
echo.
echo 2. Start backend (Terminal 1):
echo    cd backend
echo    venv\Scripts\activate
echo    python app.py
echo.
echo 3. Start frontend (Terminal 2):
echo    cd frontend
echo    npm run dev
echo.
echo 4. Open: http://localhost:5173
echo.
echo Get free API key: https://makersuite.google.com/app/apikey
echo.
pause
