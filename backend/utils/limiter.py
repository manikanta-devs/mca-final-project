import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# In production with multiple Gunicorn workers, use Redis so all workers
# share the same rate-limit counters. Set RATELIMIT_STORAGE_URI=redis://...
# in your .env.production. Falls back to in-memory for local dev.
_storage_uri = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

# Globally shared Limiter instance — initialised against the app in create_app()
limiter = Limiter(key_func=get_remote_address, storage_uri=_storage_uri)
