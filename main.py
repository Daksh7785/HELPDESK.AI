import logging
from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from backend.csrf import CSRFTokenMiddleware, set_csrf_cookie, CSRF_COOKIE_NAME

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(CSRFTokenMiddleware)


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