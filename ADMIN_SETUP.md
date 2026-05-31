# 🚀 AI Interview System - Admin Setup Guide

This guide explains how to set up and run the AI Interview System with full AI capabilities enabled.

---

## 📋 Requirements

- **Node.js 18+** - Download from https://nodejs.org
- **Python 3.10+** - Download from https://python.org
- **API Key** (Optional but Recommended):
  - **Hugging Face** - FREE, 30k requests/month, no credit card (⭐ RECOMMENDED)
  - **Gemini** - FREE, unlimited for testing (fallback option)

---

## ⚙️ Step 1: Get Your Free API Key (5-10 minutes)

### ⭐ Option A: Hugging Face (RECOMMENDED - Most Reliable Free Tier)

1. **Go to:** https://huggingface.co/settings/tokens
2. **Sign up** (or log in if you have account)
3. **Confirm your email** from the confirmation link
4. **Create new token:**
   - Click **"New token"**
   - Name: `ai-interview-system`
   - Type: **Read**
   - Click **"Create"**
5. **Copy your token** (starts with `hf_`)
6. **Open `.env` file** in project root and paste:
   ```
   HUGGINGFACE_API_KEY=hf_paste_your_token_here
   ```

### Option B: Gemini API (Alternative Fallback)

If you prefer Gemini or want a backup:
1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"** → **"Create API key in new project"**
3. Copy the generated key
4. In `.env` file:
   ```
   GEMINI_API_KEY=paste_your_key_here
   ```

### Option C: Work Without API Key (Fallback Mode)
- The system works **without an API key** using built-in question banks
- Questions will be pre-generated (less personalized)
- Skip to Step 2 if you want to test without API first

---

## 📦 Step 2: Install Dependencies

### Backend Setup
```powershell
# Navigate to project
cd c:\anime\ai-interview-system

# Activate Python virtual environment
.venv\Scripts\Activate.ps1

# Install Python packages
pip install -r backend/requirements.txt
```

### Frontend Setup
```powershell
# In a new terminal
cd c:\anime\ai-interview-system\frontend

# Install npm packages
npm install
```

---

## 🎯 Step 3: Run the System

### Start Backend (Terminal 1)
```powershell
cd c:\anime\ai-interview-system
.venv\Scripts\Activate.ps1
python backend/app.py
```

You should see:
```
Running on http://127.0.0.1:5000
```

### Start Frontend (Terminal 2)
```powershell
cd c:\anime\ai-interview-system\frontend
npm run dev
```

You should see:
```
➜ Local: http://localhost:5173/
```

---

## ✅ Step 4: Verify It Works

1. Open browser: **http://localhost:5173**
2. You should see the landing page with:
   - ✅ Difficulty selector with emojis (🟢 Easy, 🟡 Medium, 🔴 Hard)
   - ✅ Role selection dropdown
   - ✅ Interview setup form

3. **With Hugging Face or Gemini API**: Click "Start Interview" → Get AI-generated questions tailored to role
4. **Without API Key**: You'll get pre-built questions (still works, less personalized)

---

## 🔑 Configuration File

The `.env` file in the project root controls:
- `HUGGINGFACE_API_KEY` → **PRIMARY** AI provider (30k requests/month free)
- `GEMINI_API_KEY` → **FALLBACK** AI provider (if HF key not set)
- `SECRET_KEY` → Flask session security (auto-generated)
- `FLASK_ENV` → Set to "production" for deployment

**Example .env:**
```
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyD9x1xWz5H7v8k3j2l9m0n1o2p3q4r5s6t7u
SECRET_KEY=your-production-secret-key-here
FLASK_ENV=production
```

---

## 🐳 Docker Setup (Optional)

To run with Docker:
```powershell
docker-compose up
```

This starts both frontend (5173) and backend (5000) automatically.

---

## 🆘 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'requests'"
**Solution**: Ensure you ran `pip install -r backend/requirements.txt` (requests is needed for Hugging Face API)

### Issue: "HUGGINGFACE_API_KEY not set" (Warning)
**Solution**: 
1. Get a free token from https://huggingface.co/settings/tokens
2. Create `.env` file with `HUGGINGFACE_API_KEY=hf_your_token_here`
3. Restart backend

### Issue: "Hugging Face rate limited" (429 errors)
**Solution**: 
- You've hit the 30k/month limit (unlikely unless heavy usage)
- Fallback to Gemini: Add `GEMINI_API_KEY=...` to `.env`
- Or wait for monthly reset

### Issue: "GEMINI_API_KEY not set" (Warning)
**Solution**: 
1. Get a free key from https://aistudio.google.com/app/apikey
2. Add to `.env`: `GEMINI_API_KEY=your_key_here`
3. Restart backend

### Issue: "Port 5173 already in use"
**Solution**: 
```powershell
# Kill existing process
taskkill /F /IM node.exe

# Or use a different port
npm run dev -- --port 5174
```

### Issue: "Emoji characters showing as ðŸŸ¢"
**Solution**: This is already fixed in the code. Just do a hard browser refresh (Ctrl+Shift+R)

---

## 📊 API Comparison

| Feature | Hugging Face | Gemini | Fallback |
|---------|--------------|--------|----------|
| **Cost** | FREE (30k/mo) | FREE (testing) | N/A |
| **Setup Time** | 2 min | 5 min | N/A |
| **Quality** | Excellent | Excellent | Basic |
| **Speed** | Fast | Very Fast | Instant |
| **Questions** | ✅ AI-generated | ✅ AI-generated | ✅ Pre-built |
| **Personalized** | ✅ Resume-aware | ✅ Resume-aware | ❌ Generic |
| **Evaluation** | ✅ AI scoring | ✅ AI scoring | ✅ Heuristic |

---

## 📚 Features With/Without API

| Feature | Without API | With Any API |
|---------|------------|----------|
| Question Generation | ✅ Pre-built questions | ✅ AI-tailored questions |
| Resume-Based Questions | ❌ No | ✅ Yes |
| Answer Evaluation | ✅ Basic scoring | ✅ Detailed AI feedback |
| Communication Coach | ✅ Templates | ✅ AI-personalized tips |
| Quiz Practice | ✅ Yes | ✅ Yes |

---

## 🚀 Going Live

When ready to deploy:

1. **Set environment**: Change `FLASK_ENV=production`
2. **Add SECRET_KEY**: Generate a strong random key, add to `.env`
3. **Disable Debug**: Ensure `FLASK_DEBUG=False` in backend
4. **Use Docker**: Deploy with `docker-compose.yml`
5. **SSL Certificate**: Set up HTTPS for production

---

## 📞 Support

- Gemini API Issues: https://support.google.com/generativeai
- Flask Documentation: https://flask.palletsprojects.com
- React Documentation: https://react.dev

---

**Last Updated**: May 31, 2026  
**Project Version**: 2.0  
**Status**: ✅ Ready for Production
