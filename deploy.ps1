# ============================================================
#  TalentForge AI — One-Click Production Deploy (Windows)
#  Usage: .\deploy.ps1
# ============================================================
$ErrorActionPreference = "Stop"

function Info  { Write-Host "[OK] $args" -ForegroundColor Green }
function Warn  { Write-Host "[!]  $args" -ForegroundColor Yellow }
function Fail  { Write-Host "[X]  $args" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  TalentForge AI — Production Deployment" -ForegroundColor Cyan
Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Prerequisite checks ──────────────────────────────────────────────────
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed. Install from https://docs.docker.com/desktop/windows/"
}

# ─── Environment file ─────────────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Warn ".env not found — copying from .env.production..."
    Copy-Item ".env.production" ".env"
    Warn "IMPORTANT: Edit .env and set SECRET_KEY, GEMINI_API_KEY, ALLOWED_ORIGINS before continuing!"
    Read-Host "  Press ENTER once you've set the values (Ctrl+C to abort)"
}

# ─── Validate and auto-generate SECRET_KEY ───────────────────────────────
$envContent = Get-Content ".env" -Raw
$secretMatch = [regex]::Match($envContent, "^SECRET_KEY=(.*)$", [System.Text.RegularExpressions.RegexOptions]::Multiline)
$secretKey = $secretMatch.Groups[1].Value.Trim()

if ([string]::IsNullOrEmpty($secretKey) -or $secretKey -like "*CHANGE_ME*") {
    Warn "SECRET_KEY not set. Generating one..."
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $autoKey = ([System.BitConverter]::ToString($bytes) -replace "-", "").ToLower()
    $envContent = $envContent -replace "^SECRET_KEY=.*$", "SECRET_KEY=$autoKey", "Multiline"
    Set-Content ".env" $envContent
    Info "SECRET_KEY generated and saved to .env"
}

# ─── Pull latest code ─────────────────────────────────────────────────────
if (Test-Path ".git") {
    Info "Pulling latest code..."
    git pull --ff-only
}

# ─── Build images ─────────────────────────────────────────────────────────
Info "Building Docker images..."
docker compose build --no-cache
if ($LASTEXITCODE -ne 0) { Fail "Docker build failed." }

# ─── Start services ───────────────────────────────────────────────────────
Info "Starting services..."
docker compose up -d --remove-orphans
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed." }

# ─── Wait for backend health ──────────────────────────────────────────────
Info "Waiting for backend health check..."
$maxRetries = 20
$retry = 0
do {
    Start-Sleep 5
    $retry++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) { break }
    } catch {}
    Write-Host "  Waiting... ($retry/$maxRetries)"
    if ($retry -ge $maxRetries) { Fail "Backend did not start. Run: docker compose logs backend" }
} while ($true)

# ─── Done ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ✅  TalentForge AI is deployed and running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost"
Write-Host "  API      : http://localhost:5000"
Write-Host "  Health   : http://localhost:5000/health"
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Cyan
Write-Host "    docker compose logs -f           -- stream all logs"
Write-Host "    docker compose logs -f backend   -- backend logs only"
Write-Host "    docker compose down              -- stop all services"
Write-Host ""
