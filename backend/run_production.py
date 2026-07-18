"""Production Waitress WSGI runner for Windows."""

import logging
import os
import sys
from dotenv import load_dotenv

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

# Setup basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)8s] %(message)s")
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    load_dotenv()
    
    # Check production configuration safety
    secret = os.getenv("SECRET_KEY")
    if os.getenv("FLASK_ENV") == "production" and (not secret or secret == "dev_secret_key"):
        logger.error("CRITICAL: Production server cannot start with a default/missing SECRET_KEY!")
        sys.exit(1)

    try:
        from waitress import serve
        port = int(os.getenv("PORT", 5000))
        logger.info(f"Starting Waitress production WSGI server on port {port}...")
        app = create_app()
        serve(app, host="0.0.0.0", port=port, threads=4)
    except Exception as e:
        logger.error(f"Failed to start WSGI production server: {e}")
        sys.exit(1)
