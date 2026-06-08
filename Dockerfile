# Use an official Python runtime as a parent image
FROM python:3.10-slim

LABEL version="1.1.1" rebuild_trigger="2026-03-08-2032"

# Set the working directory to /app
WORKDIR /app

# Install system dependencies required for EasyOCR and OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Layer 1: Copy ML models first (large, rarely change)
COPY backend/models /app/backend/models

# Layer 2: Copy requirements and install pip dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: Copy application source code (changes most frequently)
COPY backend/main.py backend/healthcheck.py backend/__init__.py /app/backend/
COPY backend/services /app/backend/services
COPY backend/supabase /app/backend/supabase
COPY backend/data /app/backend/data
COPY backend/scripts /app/backend/scripts

# Tell Python where to look for modules (so it can find the 'backend' folder)
ENV PYTHONPATH=/app

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD ["python", "backend/healthcheck.py"]

# Run the FastAPI server via Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
