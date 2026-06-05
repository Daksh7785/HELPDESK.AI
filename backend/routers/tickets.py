from fastapi import APIRouter, HTTPException, Depends
from backend.database import supabase
from backend.schemas import *

router = APIRouter(prefix="/tickets", tags=["Tickets"])
api_router = APIRouter(prefix="/api", tags=["API Decoupled"])

@router.get("/")
async def get_tickets():
    if not supabase: return []
    res = supabase.table("tickets").select("*").execute()
    return res.data

@router.post("/save")
async def save_ticket(req: TicketSaveRequest):
    if not supabase: raise HTTPException(500, "No DB")
    payload = req.dict()
    res = supabase.table("tickets").insert(payload).execute()
    return {"status": "success", "ticket": res.data[0]}

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str):
    if not supabase: raise HTTPException(500, "No DB")
    res = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
    if not res.data: raise HTTPException(404, "Ticket not found")
    return res.data[0]

@router.patch("/{ticket_id}")
async def patch_ticket(ticket_id: str, payload: dict):
    if not supabase: raise HTTPException(500, "No DB")
    res = supabase.table("tickets").update(payload).eq("id", ticket_id).execute()
    return res.data[0] if res.data else {}

# Decoupled endpoints
@api_router.get("/tickets")
async def api_get_tickets(user_id: str = None, company: str = None, limit: int = 50, offset: int = 0):
    if not supabase: return []
    query = supabase.table("tickets").select("*")
    if user_id: query = query.eq("user_id", user_id)
    if company: query = query.eq("company", company)
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return res.data

@api_router.patch("/tickets/{ticket_id}")
async def api_update_ticket(ticket_id: str, updates: dict):
    if not supabase: return {}
    res = supabase.table("tickets").update(updates).eq("id", ticket_id).execute()
    return res.data[0] if res.data else {}
