FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --user --no-cache-dirs -r requirements.txt

FROM python:3.12-slim AS production

LABEL maintainer="HELPDESK.AI Team" \
      version="2.0.0" \
      description="AI Helpdesk — backend production image"

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python /app/backend/healthcheck.py

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
