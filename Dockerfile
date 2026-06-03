# =============================================================================
# Multi-stage Dockerfile for HELPDESK.AI — Production Backend Image
# Stage 1 (builder): Install all Python dependencies including torch/transformers
# Stage 2 (production): Minimal runtime image with non-root user & health check
# Base: python:3.11-slim-bookworm
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: builder — install all Python dependencies
# ---------------------------------------------------------------------------
FROM python:3.11-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend /build/backend
RUN /opt/venv/bin/python -m compileall -q /build/backend || true


# ---------------------------------------------------------------------------
# Stage 2: production — minimal runtime image
# ---------------------------------------------------------------------------
FROM python:3.11-slim-bookworm AS production

LABEL maintainer="HELPDESK.AI Team" \
      version="2.0.0" \
      description="AI Helpdesk — production backend image"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid 1001 --no-create-home --shell /bin/false appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /build/backend /app/backend

ENV PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ALLOW_DEGRADED_STARTUP=1 \
    PORT=7860

USER appuser

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD ["python", "/app/backend/healthcheck.py"]

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
