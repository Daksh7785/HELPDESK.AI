from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from backend.database import supabase

router = APIRouter(tags=["Auth"])

class LoginBody(BaseModel):
    email: str
    password: str

class SignupBody(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    role: str | None = "user"
    company: str | None = None

@router.post("/auth/login")
async def auth_login(body: LoginBody, response: Response):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection offline")
    try:
        result = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    session = getattr(result, "session", None)
    user = getattr(result, "user", None)
    if not session or not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _set_session_cookies(response, session)
    user_payload = user.model_dump() if hasattr(user, "model_dump") else dict(user)
    return {"user": user_payload, "message": "Session cookies set"}

@router.post("/auth/signup")
async def auth_signup(body: SignupBody, response: Response):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection offline")
    metadata = {}
    if body.full_name:
        metadata["full_name"] = body.full_name
    if body.role:
        metadata["role"] = body.role
    if body.company:
        metadata["company"] = body.company

    try:
        result = supabase.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": metadata} if metadata else {},
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session = getattr(result, "session", None)
    user = getattr(result, "user", None)
    if session:
        _set_session_cookies(response, session)
    user_payload = user.model_dump() if user and hasattr(user, "model_dump") else None
    return {"user": user_payload, "message": "Signup complete"}

@router.post("/auth/logout")
async def auth_logout(response: Response):
    _clear_session_cookies(response)
    return {"ok": True}

@router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {"user": user}


# ---------------------------------------------------------------------------
# API Endpoints (Replacing Frontend Supabase Calls)
# ---------------------------------------------------------------------------

