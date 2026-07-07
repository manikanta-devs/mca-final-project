#!/bin/bash
# ============================================================
# AI Interview System — One-Click Setup Script (Mac/Linux)
# ============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "\n${BLUE}▶ $1${NC}"; }
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║   AI Interview System v2.0 — Setup Script    ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check prerequisites ────────────────────────────────────
print_step "Checking prerequisites..."

if ! command -v python3 &>/dev/null; then
  print_err "Python 3 is required. Install from https://python.org"
  exit 1
fi

PYTHON_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
print_ok "Python $PYTHON_VER found"

if ! command -v node &>/dev/null; then
  print_err "Node.js 18+ is required. Install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node --version)
print_ok "Node.js $NODE_VER found"

if ! command -v npm &>/dev/null; then
  print_err "npm is required"
  exit 1
fi
print_ok "npm found"

# ── Backend Setup ──────────────────────────────────────────
print_step "Setting up Python backend..."

cd backend

if [ ! -d "venv" ]; then
  python3 -m venv venv
  print_ok "Virtual environment created"
else
  print_ok "Virtual environment already exists"
fi

source venv/bin/activate

pip install --upgrade pip -q
pip install -r requirements.txt -q
print_ok "Python dependencies installed"

python -m spacy download en_core_web_sm || {
  print_err "Failed to download spaCy language model 'en_core_web_sm'."
  print_err "Please check your internet connection or run: python -m spacy download en_core_web_sm"
  exit 1
}
print_ok "spaCy model ready"

if [ ! -f ".env" ]; then
  cp .env.example .env
  print_warn ".env created from template — add your GEMINI_API_KEY"
else
  print_ok ".env already exists"
fi

mkdir -p data uploads
cd ..

# ── Frontend Setup ─────────────────────────────────────────
print_step "Setting up React frontend..."

cd frontend

npm install --silent
print_ok "Node.js dependencies installed"

if [ ! -f ".env" ]; then
  cp .env.example .env
  print_ok ".env created"
else
  print_ok ".env already exists"
fi

cd ..

# ── Summary ────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗"
echo -e "║              Setup Complete! 🎉              ║"
echo -e "╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your Gemini API key to backend/.env:"
echo "     ${YELLOW}GEMINI_API_KEY=your_key_here${NC}"
echo ""
echo "  2. Start the backend:"
echo "     ${BLUE}cd backend && source venv/bin/activate && python app.py${NC}"
echo ""
echo "  3. Start the frontend (new terminal):"
echo "     ${BLUE}cd frontend && npm run dev${NC}"
echo ""
echo "  4. Open your browser:"
echo "     ${GREEN}http://localhost:5173${NC}"
echo ""
echo "Get your free Gemini API key at:"
echo "  ${BLUE}https://makersuite.google.com/app/apikey${NC}"
echo ""
