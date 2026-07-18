#!/usr/bin/env bash
# ============================================================
#  TalentForge AI — One-Click Production Deploy (Linux/macOS)
#  Usage: bash deploy.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "  ████████╗ █████╗ ██╗     ███████╗███╗   ██╗████████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗"
echo "     ██╔══╝██╔══██╗██║     ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝"
echo "     ██║   ███████║██║     █████╗  ██╔██╗ ██║   ██║   █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  "
echo "     ██║   ██╔══██║██║     ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  "
echo "     ██║   ██║  ██║███████╗███████╗██║ ╚████║   ██║   ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗"
echo "     ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝"
echo ""
echo "  Production Deployment Script"
echo "  ═══════════════════════════════════════════════════════"
echo ""

# ─── Prerequisite checks ──────────────────────────────────────────────────
command -v docker    >/dev/null 2>&1 || error "Docker is not installed. Install from https://docs.docker.com/get-docker/"
command -v docker compose >/dev/null 2>&1 || error "Docker Compose v2 is not installed."

# ─── Environment file ─────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    warn ".env not found — copying from .env.production template..."
    cp .env.production .env
    warn "IMPORTANT: Edit .env and set SECRET_KEY, GEMINI_API_KEY, ALLOWED_ORIGINS before continuing!"
    echo ""
    read -rp "  Press ENTER once you've set the values, or Ctrl+C to abort: "
fi

# ─── Validate SECRET_KEY ──────────────────────────────────────────────────
SECRET_KEY=$(grep "^SECRET_KEY=" .env | cut -d'=' -f2-)
if [ -z "$SECRET_KEY" ] || echo "$SECRET_KEY" | grep -q "CHANGE_ME"; then
    warn "SECRET_KEY is not set. Generating one automatically..."
    AUTO_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$AUTO_KEY|" .env
    info "SECRET_KEY generated and saved to .env"
fi

# ─── Pull latest code ─────────────────────────────────────────────────────
if git rev-parse --git-dir >/dev/null 2>&1; then
    info "Pulling latest code from git..."
    git pull --ff-only
fi

# ─── Build images ─────────────────────────────────────────────────────────
info "Building Docker images (this may take a few minutes)..."
docker compose build --no-cache

# ─── Start / Restart services ─────────────────────────────────────────────
info "Starting services..."
docker compose up -d --remove-orphans

# ─── Wait for health check ────────────────────────────────────────────────
info "Waiting for backend health check..."
MAX_RETRIES=20
RETRY=0
until curl -sf http://localhost:5000/health >/dev/null 2>&1; do
    RETRY=$((RETRY+1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        error "Backend failed to start after ${MAX_RETRIES} retries. Check: docker compose logs backend"
    fi
    echo "  Waiting... ($RETRY/$MAX_RETRIES)"
    sleep 5
done

# ─── Clean up old images ──────────────────────────────────────────────────
info "Cleaning up unused Docker images..."
docker image prune -f >/dev/null 2>&1 || true

# ─── Done ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ✅ TalentForge AI is deployed and running!${NC}"
echo ""
echo "  Frontend : http://localhost"
echo "  API      : http://localhost:5000"
echo "  Health   : http://localhost:5000/health"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f        — stream all logs"
echo "    docker compose logs -f backend — backend logs only"
echo "    docker compose down           — stop all services"
echo ""
