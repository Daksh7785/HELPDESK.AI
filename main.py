from fastapi import FastAPI
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import os
from supabase import create_client

app = FastAPI()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        if os.getenv("ALLOW_DEGRADED_STARTUP") != "1":
            raise
        print(f"Warning: Failed to initialize Supabase: {e}")

@app.get("/docs", include_in_schema=False)
async def get_docs():
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="HelpDesk AI Backend",
        redoc_favicon_url="https://helpdeskaiv1.vercel.app/favicon.ico",
        with_google_font=False,
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_open_api():
    return get_openapi(
        title="HelpDesk AI Backend",
        version="1.0.0",
        description="API Documentation for HelpDesk AI Backend",
        routes=app.routes,
    )