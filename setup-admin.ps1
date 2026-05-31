#!/usr/bin/env pwsh
<#
.SYNOPSIS
    AI Interview System - Quick Setup Script for Admins
    
.DESCRIPTION
    Automatically installs dependencies and configures the system for first use.
    
.EXAMPLE
    .\setup-admin.ps1
#>

param(
    [switch]$SkipPythonCheck = $false,
    [switch]$SkipNodeCheck = $false
)

Write-Host "`n🚀 AI Interview System - Admin Setup`n" -ForegroundColor Cyan

# ==========================================
# Check Prerequisites
# ==========================================
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

$pythonInstalled = $false
$nodeInstalled = $false

if (-not $SkipPythonCheck) {
    try {
        $pythonVer = python --version 2>&1
        if ($pythonVer -match "3\.[0-9]+") {
            Write-Host "✅ Python found: $pythonVer" -ForegroundColor Green
            $pythonInstalled = $true
        }
    } catch {
        Write-Host "❌ Python not found. Download from https://python.org" -ForegroundColor Red
    }
}

if (-not $SkipNodeCheck) {
    try {
        $nodeVer = node --version 2>&1
        Write-Host "✅ Node.js found: $nodeVer" -ForegroundColor Green
        $nodeInstalled = $true
    } catch {
        Write-Host "❌ Node.js not found. Download from https://nodejs.org" -ForegroundColor Red
    }
}

if (-not $pythonInstalled -or -not $nodeInstalled) {
    Write-Host "Please install missing prerequisites and try again." -ForegroundColor Red
    exit 1
}

# ==========================================
# Setup .env Configuration
# ==========================================
Write-Host "`n⚙️  Configuring API keys..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating .env file..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
    
    Write-Host "`n📌 IMPORTANT: Gemini API Key Setup" -ForegroundColor Yellow
    Write-Host "1. Go to: https://aistudio.google.com/app/apikey" -ForegroundColor White
    Write-Host "2. Click 'Create API Key' in new project" -ForegroundColor White
    Write-Host "3. Copy your key" -ForegroundColor White
    Write-Host "4. Edit .env file and add: GEMINI_API_KEY=your_key_here" -ForegroundColor White
    Write-Host "`n(You can skip this for now to test with fallback mode)" -ForegroundColor Gray
    
    pause
}

# ==========================================
# Install Python Dependencies
# ==========================================
Write-Host "`n📦 Installing Python dependencies..." -ForegroundColor Yellow

try {
    Set-Location backend
    python -m pip install --upgrade pip | Out-Null
    python -m pip install -r requirements.txt -q
    Write-Host "✅ Python packages installed" -ForegroundColor Green
    Set-Location ..
} catch {
    Write-Host "❌ Failed to install Python packages" -ForegroundColor Red
    exit 1
}

# ==========================================
# Install Node Dependencies
# ==========================================
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow

try {
    Set-Location frontend
    npm install --silent 2>&1 | Out-Null
    Write-Host "✅ Frontend packages installed" -ForegroundColor Green
    Set-Location ..
} catch {
    Write-Host "❌ Failed to install frontend packages" -ForegroundColor Red
    exit 1
}

# ==========================================
# Summary
# ==========================================
Write-Host "`n✅ Setup Complete!`n" -ForegroundColor Green

Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "`n1️⃣  Backend - Open Terminal 1 and run:" -ForegroundColor White
Write-Host "   cd $PWD" -ForegroundColor Gray
Write-Host "   .venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python backend/app.py" -ForegroundColor Gray

Write-Host "`n2️⃣  Frontend - Open Terminal 2 and run:" -ForegroundColor White
Write-Host "   cd $PWD\frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray

Write-Host "`n3️⃣  Open Browser:" -ForegroundColor White
Write-Host "   http://localhost:5173" -ForegroundColor Cyan

Write-Host "`n📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - Setup Guide: ADMIN_SETUP.md" -ForegroundColor Gray
Write-Host "   - Project Info: README.md" -ForegroundColor Gray

Write-Host "`n"
