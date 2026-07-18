# 🚀 TalentForge AI — Deployment Guide

## Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://docs.docker.com/get-docker/) installed
- A **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-interview-system.git
cd ai-interview-system
```

### 2. Set up environment
```bash
# Copy the production template
cp .env.production .env

# Edit .env — set at minimum:
#   SECRET_KEY   →  python -c "import secrets; print(secrets.token_hex(32))"
#   GEMINI_API_KEY → your key from aistudio.google.com
#   ALLOWED_ORIGINS → your domain (e.g. https://myapp.com)
```

### 3. Deploy

**Linux / macOS:**
```bash
bash deploy.sh
```

**Windows:**
```powershell
.\deploy.ps1
```

**Manual Docker Compose:**
```bash
docker compose build
docker compose up -d
```

### 4. Open the app
- **Frontend:** http://localhost
- **API Health:** http://localhost:5000/health

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ Yes | JWT signing key — generate with `secrets.token_hex(32)` |
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini AI key |
| `FLASK_ENV` | ✅ Yes | Set to `production` |
| `ALLOWED_ORIGINS` | ✅ Yes | Comma-separated list of your domain(s) |
| `HUGGINGFACE_API_KEY` | ❌ No | Optional fallback AI key |
| `DATABASE_URL` | ❌ No | PostgreSQL URL (uses SQLite if blank) |
| `RATE_LIMIT_ENABLED` | ❌ No | Default `true` in production |
| `GUNICORN_WORKERS` | ❌ No | Auto-calculated from CPU count |
| `GUNICORN_TIMEOUT` | ❌ No | Default `180`s (for long AI calls) |
| `PORT` | ❌ No | Backend port, default `5000` |

---

## Architecture

```
Browser
   │
   ▼
┌──────────────────────┐
│  nginx (port 80)     │  ← Serves React SPA
│  frontend container  │  ← Proxies /api/* → backend:5000
└──────────┬───────────┘
           │ Docker network
           ▼
┌──────────────────────┐
│  Gunicorn (port 5000)│  ← gthread workers, 180s timeout
│  backend container   │  ← Flask + Gemini AI
│                      │  ← SQLite (or PostgreSQL)
└──────────────────────┘
```

---

## CI/CD (GitHub Actions)

| Workflow | Trigger | What it does |
|---|---|---|
| `pr-checks.yml` | Pull request | pytest + ESLint + Docker build smoke test |
| `ci.yml` | Push to `main` | Build & push Docker images to GHCR |

To enable SSH auto-deploy, uncomment the `deploy` job in `ci.yml` and add these repository secrets:
- `SSH_HOST` — your server IP
- `SSH_USER` — SSH username
- `SSH_KEY` — private SSH key

---

## Useful Commands

```bash
# View live logs
docker compose logs -f

# Restart a single service
docker compose restart backend

# Stop everything
docker compose down

# Stop + delete volumes (⚠️ deletes database)
docker compose down -v

# Rebuild after code changes
docker compose build backend && docker compose up -d backend

# Run a database backup
curl -X POST http://localhost:5000/backup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Production Checklist

- [ ] `SECRET_KEY` is 32+ random hex characters
- [ ] `FLASK_ENV=production` in .env
- [ ] `GEMINI_API_KEY` set
- [ ] `ALLOWED_ORIGINS` set to your actual domain
- [ ] Docker containers start with `restart: unless-stopped`
- [ ] HTTPS configured (via reverse proxy like Caddy/nginx on host, or Cloudflare)
- [ ] Firewall: only ports 80 and 443 open externally
- [ ] Backups scheduled (`/backup` endpoint or volume snapshots)
