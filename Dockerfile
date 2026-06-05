# ============================================================
# HELPDESK.AI — Canonical Backend Dockerfile
# ============================================================
# This is the single source-of-truth Dockerfile for the backend.
# Use this file for all environments (HF Spaces, Docker Compose,
# Kubernetes, local dev). backend/Dockerfile is a shim that
# redirects here to avoid duplicate maintenance.
#
# Build from repo root:
#   docker build -t helpdesk-ai-backend .
#
# Build target variants:
#   docker build --target development -t helpdesk-ai-dev .
#   docker build --target production  -t helpdesk-ai-prod .
# ============================================================

# ── Stage 1: Base ────────────────────────────────────────────
FROM python:3.10-slim AS base

LABEL version="1.2.0" \
      maintainer="ritesh-1918" \
      description="HELPDESK.AI FastAPI backend" \
      org.opencontainers.image.source="https://github.com/ritesh-1918/HELPDESK.AI"

# Prevents Python from writing .pyc files and enables stdout/stderr flushing
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install OS-level dependencies (EasyOCR requires libgl1 + libglib2.0-0)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Dependencies ────────────────────────────────────
FROM base AS dependencies

# Copy only requirements first — layer-cached unless requirements change
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Development ─────────────────────────────────────
# Adds dev tools (pytest, httpx, watchdog) without bloating production.
FROM dependencies AS development

RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    httpx \
    watchdog

# Copy full backend source
COPY backend /app/backend

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Reload on code changes in dev
CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--reload", \
     "--reload-dir", "/app/backend"]

# ── Stage 4: Production ──────────────────────────────────────
# Minimal image — no dev tools, no cache, single worker tuned for HF Spaces.
FROM dependencies AS production

# Copy backend source
COPY backend /app/backend

# Non-root user for security hardening
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Hugging Face Spaces default port
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD ["python", "backend/healthcheck.py"]

CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "7860", \
     "--workers", "1", \
     "--log-level", "info"]
