"""
FastAPI Backend — AI Helpdesk Ticket Analyzer (Refactored)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

import warnings
warnings.filterwarnings("ignore", message="'pin_memory'")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

# Ensure project root is on path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import supabase
from backend.routers import health, tickets, ai, auth, admin

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="HELPDESK.AI Backend API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"Global Exception on {request.url.path}: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(exc)})

# Register Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(tickets.router)
app.include_router(tickets.api_router)
app.include_router(ai.router)

