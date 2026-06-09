import logging
from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from backend.csrf import CSRFTokenMiddleware, set_csrf_cookie, CSRF_COOKIE_NAME

from backend.routers import tickets, ai, admin, health, auth
from backend.routes import translation, estimator, voice, privacy, active_learning, weekly_digest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(CSRFTokenMiddleware)

app.include_router(tickets.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(translation.router)
app.include_router(estimator.router)
app.include_router(voice.router)
app.include_router(privacy.router)
app.include_router(active_learning.router)
app.include_router(weekly_digest.router)


@app.get("/auth/csrf-token")
async def get_csrf_token(response: JSONResponse):
    token = set_csrf_cookie(response)
    return {"csrf_token": token}


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