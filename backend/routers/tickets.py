import logging
import hashlib
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.dependencies import supabase, TICKETS_DB, duplicate_service

router = APIRouter(prefix="/tickets", tags=["tickets"])

class Message(BaseModel):
    sender: str
    message: str
    timestamp: str

class TicketRecord(BaseModel):
    ticket_id: str
    owner_id: str
    summary: str
    category: str
    subcategory: str
    priority: str
    status: str
    assigned_team: str
    created_at: str
    updated_at: str | None = None
    last_user_viewed_at: str | None = None
    messages: list[Message] = []
    metadata: dict = {}
    timeline: dict = {}

class TicketSaveRequest(BaseModel):
    user_id: str
    subject: str
    description: str
    category: str
    subcategory: str
    priority: str
    assigned_team: str
    status: str
    auto_resolve: bool
    is_duplicate: bool
    confidence: float
    image_url: str | None = None
    company: str | None = None
    company_id: str | None = None
    sla_breach_at: str
    metadata: dict
    entities: list = []
    solution_steps: list = []
    ocr_text: str = ""
    needs_review: bool = False
    routing_confidence: float

@router.get("/")
async def get_tickets(company_id: str | None = None):
    """Fetch persistent tickets from Supabase."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    
    query = supabase.table("tickets").select("*").order("created_at", desc=True)
    if company_id:
        query = query.eq("company_id", company_id)
        
    res = query.execute()
    return res.data

@router.post("/save")
async def save_ticket(request_body: TicketSaveRequest):
    """
    OFFICIAL PERSISTENCE: Saves the analyzed ticket to Supabase.
    This is called AFTER the user confirms the analysis results.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase connection not initialized.")

    logger = logging.getLogger(__name__)
    try:
        final_data = request_body.dict()

        # Resolve tenant linkage from user profile with authorization validation.
        profile = {}
        if request_body.user_id:
            try:
                profile_res = (
                    supabase.table("profiles")
                    .select("company_id, company")
                    .eq("id", request_body.user_id)
                    .single()
                    .execute()
                )
                profile = profile_res.data or {}
                if not profile:
                    raise HTTPException(status_code=404, detail="User profile not found")
            except HTTPException:
                raise
            except Exception as profile_error:
                user_hash = hashlib.sha256(str(request_body.user_id).encode()).hexdigest()[:8]
                logger.error(f"Tenant resolution error for user {user_hash}: {profile_error}")
                raise HTTPException(status_code=503, detail="Failed to resolve tenant linkage") from profile_error

        # Validate tenant consistency and authorization.
        profile_company_id = profile.get("company_id")
        if final_data.get("company_id"):
            # User provided company_id: verify it matches their profile.
            if profile_company_id and final_data["company_id"] != profile_company_id:
                user_hash = hashlib.sha256(str(request_body.user_id).encode()).hexdigest()[:8]
                logger.warning(f"Tenant mismatch: user {user_hash} attempted {final_data['company_id']}, assigned to {profile_company_id}")
                raise HTTPException(status_code=403, detail="User not authorized for this tenant")
        elif profile_company_id:
            # Backfill company_id from profile.
            final_data["company_id"] = profile_company_id
        elif request_body.user_id:
            # User has no tenant assignment.
            raise HTTPException(status_code=400, detail="User has no tenant assignment")

        # Backfill company name if missing.
        if not final_data.get("company") and profile.get("company"):
            final_data["company"] = profile["company"]

        user_hash = hashlib.sha256(str(request_body.user_id).encode()).hexdigest()[:8]
        logger.info(f"Tenant linkage: user_hash={user_hash}, company_id={final_data.get('company_id')}")

        res = supabase.table("tickets").insert(final_data).execute()
        
        if not res.data:
            raise Exception("Failed to insert ticket into database.")
            
        ticket_id = res.data[0]["id"]

        duplicate_indexed = True
        duplicate_index_warning = None
        description_text = (request_body.description or "").strip()
        subject_text = (request_body.subject or "").strip()
        duplicate_text = description_text or subject_text
        if duplicate_text:
            try:
                duplicate_service.add_ticket(str(ticket_id), duplicate_text)
            except Exception as index_error:
                duplicate_indexed = False
                duplicate_index_warning = "Duplicate index update failed."
                print(f"[WARNING] {duplicate_index_warning} ticket_id={ticket_id} error={index_error}")
        else:
            duplicate_indexed = False
            duplicate_index_warning = "Duplicate index update skipped: no description or subject text was provided."
            print(f"[WARNING] {duplicate_index_warning}")
        
        # Add initial system diagnostic message
        msg = "Our Neural Engine has successfully triaged your issue and routed it to the designated team."
        if final_data["auto_resolve"]:
            msg = "AI Auto-Resolution active: A verified solution has been identified. Please review the attached resolution steps."

        supabase.table("ticket_messages").insert({
            "ticket_id": ticket_id,
            "sender_id": "00000000-0000-0000-0000-000000000000", # System ID
            "sender_name": "AI Assistant",
            "sender_role": "admin",
            "message": msg
        }).execute()
        
        response = {"status": "success", "ticket_id": ticket_id, "duplicate_indexed": duplicate_indexed}
        if duplicate_index_warning:
            response["duplicate_index_warning"] = duplicate_index_warning
        return response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{ticket_id}")
async def get_ticket_by_id(ticket_id: str):
    """Fetch single persistent ticket."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not initialized")
    
    res = supabase.table("tickets").select("*").eq("id", ticket_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return res.data

@router.post("/", response_model=TicketRecord)
async def create_ticket(ticket: TicketRecord):
    """Save a new ticket into the system (in-memory)."""
    # Check for duplicates before adding
    existing = next((t for t in TICKETS_DB if t.ticket_id == ticket.ticket_id), None)
    if existing:
        return existing
        
    TICKETS_DB.append(ticket)
    print(f"[DB] Ticket #{ticket.ticket_id} created for user {ticket.owner_id}")
    return ticket

@router.patch("/{ticket_id}", response_model=TicketRecord)
async def update_ticket(ticket_id: str, updates: dict):
    """Partially update a ticket's fields (e.g., status, viewed_at) in memory."""
    for i, ticket in enumerate(TICKETS_DB):
        if str(ticket.ticket_id) == str(ticket_id):
            ticket_dict = ticket.dict()
            ticket_dict.update(updates)
            updated_ticket = TicketRecord(**ticket_dict)
            TICKETS_DB[i] = updated_ticket
            return updated_ticket
    
    raise HTTPException(status_code=404, detail="Ticket not found")
