"""
Gunicorn production configuration for TalentForge AI Backend.
Tuned for AI workloads: long-running Gemini API calls need generous timeouts.
"""
import multiprocessing
import os

# ─── Workers ────────────────────────────────────────────────────────────────
# Use gthread worker class — handles long AI API waits without blocking
worker_class = "gthread"
workers = int(os.getenv("GUNICORN_WORKERS", max(2, multiprocessing.cpu_count())))
threads = int(os.getenv("GUNICORN_THREADS", 4))

# ─── Timeouts ───────────────────────────────────────────────────────────────
# Gemini API calls can take 30-90s — set timeout well above that
timeout = int(os.getenv("GUNICORN_TIMEOUT", 180))
graceful_timeout = 30
keepalive = 5

# ─── Binding ────────────────────────────────────────────────────────────────
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# ─── Logging ────────────────────────────────────────────────────────────────
accesslog = "-"   # stdout
errorlog  = "-"   # stderr
loglevel  = os.getenv("LOG_LEVEL", "info").lower()
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ─── Process naming ─────────────────────────────────────────────────────────
proc_name = "talentforge-backend"

# ─── Security ───────────────────────────────────────────────────────────────
limit_request_line   = 8190
limit_request_fields = 100
forwarded_allow_ips  = os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1")
