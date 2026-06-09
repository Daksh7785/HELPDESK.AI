"""
FastAPI Backend — AI Helpdesk Ticket Analyzer
POST /ai/analyze_ticket  →  full analysis of a support ticket
GET  /health             →  service health check
"""

import os
import sys
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

# Suppress harmless PyTorch CPU pin_memory warning
warnings.filterwarnings("ignore", message="'pin_memory'")

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is on path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import dependencies (this will trigger models to be loaded and singletons to be initialized)
from backend.dependencies import (
    classifier_service,
    ner_service,
    duplicate_service,
    rag_service,
    gemini_service,
    limiter
)

from backend.routers import health, auth, tickets, ai

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all models at startup."""
    print("[Startup] Loading AI models ...")
    try:
        classifier_service.load()
    except FileNotFoundError as e:
        print(f"[WARNING] Classifier not loaded: {e}")
    try:
        ner_service.load()
    except FileNotFoundError as e:
        print(f"[WARNING] NER not loaded: {e}")
    try:
        duplicate_service.load()
    except Exception as e:
        print(f"[WARNING] Duplicate service not loaded: {e}")
    try:
        rag_service.load()
    except Exception as e:
        print(f"[WARNING] RAG service not loaded: {e}")
    
    if gemini_service:
        print(f"[Startup] Gemini Service: {'Initialized' if getattr(gemini_service, '_initialized', False) else 'FAILED (Key missing or SDK error)'}")
    else:
        print("[Startup] Gemini Service: NOT LOADED (Import failed)")

    print("[Startup] Classifier V2 Shadow: Ready.")
    print("[Startup] Ready.")
    
    # Strict health checks: fail loudly when core model assets are unavailable.
    try:
        strict_mode = os.environ.get("ALLOW_DEGRADED_STARTUP", "0") != "1"
    except Exception:
        strict_mode = True

    classifier_loaded_flag = getattr(classifier_service, "_loaded", False)

    if strict_mode and not classifier_loaded_flag:
        raise RuntimeError("[Startup-FATAL] Classifier assets not loaded. Set ALLOW_DEGRADED_STARTUP=1 to bypass.")
    yield
    print("[Shutdown] Cleaning up ...")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Helpdesk Backend",
    description="Ticket classification, entity extraction, and duplicate detection",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter — 10 AI requests per minute per IP (free tier protection)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — locked to production + local dev only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://helpdeskaiv1.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(ai.router)
