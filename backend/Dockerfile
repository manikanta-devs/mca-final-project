FROM python:3.12-slim

# Security & performance env vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

# Copy app code
COPY . .

# Create data/upload dirs and set ownership
RUN mkdir -p data uploads && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 5000

CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:create_app()"]
