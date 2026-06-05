
@router.post("/ai/analyze_ticket", response_model=TicketResponse)
@limiter.limit("10/minute")
async def analyze_ticket(request_body: TicketRequest, request: Request):
    """
    Main endpoint for analyzing a new ticket using the cascade of local AI models.
    """
    text = request_body.text

    settings = get_system_settings(request_body.company)
    confidence_threshold = settings["ai_confidence_threshold"]
    duplicate_sensitivity = settings["duplicate_sensitivity"]
    enable_auto_resolve = settings["enable_auto_resolve"]
    
    # Grab client metadata
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    origin_host = request.headers.get("origin", "unknown")
    
    env_metadata = {
        "ip": client_ip,
        "user_agent": user_agent,
        "origin": origin_host
    }

    # --- Layer 1: Local OCR (CPU, no API required) ---
    local_ocr_text = ""
    if request_body.image_base64 and ocr_service:
        print("[AI] Extracting text via local OCR...")
        local_ocr_text = ocr_service.extract_text(request_body.image_base64)
        if local_ocr_text:
            text = f"{text} {local_ocr_text}".strip()
            print(f"[AI] OCR added {len(local_ocr_text)} chars to context.")

    # Initalize Timeline
    return await analyze_only(request_body)

@router.post("/ai/analyze")
async def analyze_only(request_body: TicketRequest):
    """
    PERFORMANCE UPGRADE: AI Analysis phase only. 
    Does NOT persist to DB. This allows the user to review the analysis 
    and duplicate check before committing to a ticket creation.
    """
    text = request_body.text
    print(f"[AI] Starting Analysis (READ-ONLY) for: {text[:50]}...") 
    settings = get_system_settings(request_body.company)
    confidence_threshold = settings["ai_confidence_threshold"]
    duplicate_sensitivity = settings["duplicate_sensitivity"]
    enable_auto_resolve = settings["enable_auto_resolve"]
    
    # --- Context & Environment ---
    import datetime
    def get_now_ist():
        return datetime.datetime.utcnow().isoformat() + "Z"

    env_metadata = {
        "timestamp": get_now_ist(),
        "model_version": "3.0.0-PRO",
        "api_endpoint": "/ai/analyze"
    }
    
    timeline = {"received": get_now_ist()}

    # --- Vision Logic (OCR Awareness) ---
    gemini_analysis = {
        "ocr_text": request_body.image_text or "",
        "image_description": ""
    }
    
    if request_body.image_base64 and not gemini_analysis["ocr_text"]:
        try:
            print("[AI] Detecting visual context via Gemini...")
            vision_result = gemini_service.analyze_image(request_body.image_base64, text)
            gemini_analysis.update(vision_result)
        except Exception as e:
            print(f"[VISION ERROR] {e}")

    summary = text[:100] + ("…" if len(text) > 100 else "") 

    # --- Classification ---
    try:
        classification_v3_res = classifier_v3.predict(text)
        if "error" in classification_v3_res:
            # Fallback to V1
            classification = classifier_service.predict(text)
        else:
            # Parse V3 output
            cat = classification_v3_res.get("Category", {}).get("prediction", "Unknown")
            sub = classification_v3_res.get("Subcategory", {}).get("prediction", "Unknown")
            pri = classification_v3_res.get("priority", {}).get("prediction", "Medium")
            conf = classification_v3_res.get("Category", {}).get("confidence", 0.0)
            
            from backend.services.classifier_service import TEAM_MAP, AUTO_RESOLVE_SUBS
            assigned_team = TEAM_MAP.get(cat, "General Support")
            auto_resolve = sub in AUTO_RESOLVE_SUBS
            
            classification = {
                "category": cat,
                "subcategory": sub,
                "priority": pri,
                "auto_resolve": auto_resolve,
                "assigned_team": assigned_team,
                "confidence": float(conf)
            }
    except Exception as e:
        traceback.print_exc()
        classification = {
            "category": "Unknown", "subcategory": "Unknown", "priority": "Medium",
            "auto_resolve": False, "assigned_team": "General Support", "confidence": 0.0,
        }

    timeline["ai_analyzed"] = get_now_ist()
    timeline["triaged"] = get_now_ist()

    # --- NER ---
    try:
        entities = ner_service.extract_entities(text)
    except Exception:
        entities = []
    
    timeline["metadata_harvested"] = get_now_ist()

    # --- Duplicate detection ---
    try:
        dup_result = duplicate_service.check_duplicate(text, threshold=duplicate_sensitivity)
    except Exception:
        dup_result = {"is_duplicate": False, "duplicate_ticket_id": None, "similarity": 0.0}

    # --- RAG Knowledge Base Check ---
    rag_match = None
    try:
        rag_match = rag_service.search_knowledge_base(text, threshold=0.85)
        if rag_match:
            classification["auto_resolve"] = True
            classification["assigned_team"] = "Auto-Resolve AI"
            classification["confidence"] = max(classification["confidence"], float(rag_match["similarity"]))
            print(f"[RAG SUCCESS] Found solution for: '{rag_match['title']}'")
    except Exception as e:
        print(f"[RAG ERROR] {e}")

    # --- Reasoning ---
    decision_factors = []
    if classification["confidence"] > confidence_threshold:
        decision_factors.append(f"High confidence match for '{classification['subcategory']}'")
    if entities:
        decision_factors.append(f"Detected entities: {', '.join([e['text'] for e in entities[:2]])}")
    if dup_result["is_duplicate"]:
        decision_factors.append(f"Found similar incident ({int(dup_result['similarity']*100)}%)")
    if rag_match:
        decision_factors.append(f"Found solution article: '{rag_match['title']}'")

    reasoning = f"Categorized as '{classification['category']}' - {classification['subcategory']}."
    if (
        enable_auto_resolve
        and classification["confidence"] >= confidence_threshold
        and classification["auto_resolve"]
    ):
        classification["auto_resolve"] = True
    else:
        classification["auto_resolve"] = False
    if classification["auto_resolve"]:
        reasoning += " Flagged for AI auto-resolution via Knowledge Base." if rag_match else " Flagged for auto-resolution."
    
    timeline["routed"] = get_now_ist()
    
    # --- Gemini Summary ---
    if gemini_service and gemini_service._initialized:
        summary = gemini_service.get_summary(text)
    
    # Convert priority to SLA breached timestamp (for preview)
    hours_map = {"Critical": 2, "High": 8, "Medium": 24, "Low": 72}
    sla_hours = hours_map.get(classification["priority"], 72)
    sla_breach_dt = datetime.datetime.utcnow() + datetime.timedelta(hours=sla_hours)

    return TicketResponse(
        ticket_id=str(uuid.uuid4()), # Temporary ID
        summary=summary,
        category=classification["category"],
        subcategory=classification["subcategory"],
        priority=classification["priority"],
        auto_resolve=classification["auto_resolve"],
        assigned_team=classification["assigned_team"],
        entities=[EntityInfo(**e) for e in entities],
        duplicate_ticket=DuplicateInfo(**dup_result),
        confidence=classification["confidence"],
        needs_review=classification["confidence"] < confidence_threshold,
        reasoning=reasoning,
        decision_factors=decision_factors,
        image_description=gemini_analysis["image_description"],
        ocr_text=gemini_analysis["ocr_text"],
        image_url=request_body.image_url,
        highlights=entities, # Use entities as highlights for now
        timeline=timeline,
        env_metadata=env_metadata,
        sla_breach_at=sla_breach_dt.isoformat() + "Z"
    )

@router.post("/ai/analyze_stream")
async def analyze_stream(request_body: TicketRequest):
    """
    REAL-TIME SSE ENDPOINT: Streams the AI progress to the frontend dynamically.
    """
    import datetime
    def get_now_ist():
        return datetime.datetime.utcnow().isoformat() + "Z"

    async def event_generator():
        text = request_body.text
        env_metadata = {
            "timestamp": get_now_ist(),
            "model_version": "3.0.0-PRO",
            "api_endpoint": "/ai/analyze_stream"
        }
        timeline = {"received": get_now_ist()} 
        settings = get_system_settings(request_body.company)
        confidence_threshold = settings["ai_confidence_threshold"]
        duplicate_sensitivity = settings["duplicate_sensitivity"]
        enable_auto_resolve = settings["enable_auto_resolve"]

        # 1. Reading
        yield f"data: {json.dumps({'step': 'Reading your message', 'status': 'in_progress'})}\n\n"
        await asyncio.sleep(0.5)

        gemini_analysis = {"ocr_text": request_body.image_text or "", "image_description": ""}
        if request_body.image_base64 and not gemini_analysis["ocr_text"]:
            try:
                vision_result = gemini_service.analyze_image(request_body.image_base64, text)
                gemini_analysis.update(vision_result)
            except Exception as e:
                pass

        summary = text[:100] + ("…" if len(text) > 100 else "") 

        # 2. NER
        yield f"data: {json.dumps({'step': 'Extracting technical entities', 'status': 'in_progress'})}\n\n"
        await asyncio.sleep(0.2)
        try:
            entities = ner_service.extract_entities(text)
        except Exception:
            entities = []
        timeline["metadata_harvested"] = get_now_ist()

        # 3. Classification
        yield f"data: {json.dumps({'step': 'Detecting category and priority', 'status': 'in_progress'})}\n\n"
        await asyncio.sleep(0.2)
        try:
            classification_v3_res = classifier_v3.predict(text)
            if "error" in classification_v3_res:
                classification = classifier_service.predict(text)
            else:
                cat = classification_v3_res.get("Category", {}).get("prediction", "Unknown")
                sub = classification_v3_res.get("Subcategory", {}).get("prediction", "Unknown")
                pri = classification_v3_res.get("priority", {}).get("prediction", "Medium")
                conf = classification_v3_res.get("Category", {}).get("confidence", 0.0)
                
                from backend.services.classifier_service import TEAM_MAP, AUTO_RESOLVE_SUBS
                assigned_team = TEAM_MAP.get(cat, "General Support")
                auto_resolve = sub in AUTO_RESOLVE_SUBS
                
                classification = {
                    "category": cat,
                    "subcategory": sub,
                    "priority": pri,
                    "auto_resolve": auto_resolve,
                    "assigned_team": assigned_team,
                    "confidence": float(conf)
                }
        except Exception as e:
            classification = {
                "category": "Unknown", "subcategory": "Unknown", "priority": "Medium",
                "auto_resolve": False, "assigned_team": "General Support", "confidence": 0.0,
            }
        timeline["ai_analyzed"] = get_now_ist()
        timeline["triaged"] = get_now_ist()

        # 4. Duplicates
        yield f"data: {json.dumps({'step': 'Checking duplicate issues', 'status': 'in_progress'})}\n\n"
        await asyncio.sleep(0.2)
        try:
            dup_result = duplicate_service.check_duplicate(text, threshold=duplicate_sensitivity)
        except Exception:
            dup_result = {"is_duplicate": False, "duplicate_ticket_id": None, "similarity": 0.0}

        # 5. RAG / Solutions
        yield f"data: {json.dumps({'step': 'Finding possible solutions', 'status': 'in_progress'})}\n\n"
        await asyncio.sleep(0.2)
        rag_match = None
        try:
            rag_match = rag_service.search_knowledge_base(text, threshold=0.85)
            if rag_match:
                classification["auto_resolve"] = True
                classification["assigned_team"] = "Auto-Resolve AI"
                classification["confidence"] = max(classification["confidence"], float(rag_match["similarity"]))
        except Exception as e:
            pass

        decision_factors = []
        if classification["confidence"] > confidence_threshold:
            decision_factors.append(f"High confidence match for '{classification['subcategory']}'")
        if entities:
            decision_factors.append(f"Detected entities: {', '.join([e['text'] for e in entities[:2]])}")
        if dup_result["is_duplicate"]:
            decision_factors.append(f"Found similar incident ({int(dup_result['similarity']*100)}%)")
        if rag_match:
            decision_factors.append(f"Found solution article: '{rag_match['title']}'")

        if not enable_auto_resolve:
            classification["auto_resolve"] = False
        reasoning = f"Categorized as '{classification['category']}' - {classification['subcategory']}."
        if classification["auto_resolve"]:
            reasoning += " Flagged for AI auto-resolution via Knowledge Base." if rag_match else " Flagged for auto-resolution."
        
        timeline["routed"] = get_now_ist()

        if gemini_service and gemini_service._initialized:
            summary = gemini_service.get_summary(text)
        
        hours_map = {"Critical": 2, "High": 8, "Medium": 24, "Low": 72}
        sla_hours = hours_map.get(classification["priority"], 72)
        sla_breach_dt = datetime.datetime.utcnow() + datetime.timedelta(hours=sla_hours)

        ticket_response_dict = {
            "ticket_id": str(uuid.uuid4()),
            "summary": summary,
            "category": classification["category"],
            "subcategory": classification["subcategory"],
            "priority": classification["priority"],
            "auto_resolve": classification["auto_resolve"],
            "assigned_team": classification["assigned_team"],
            "entities": [e for e in entities],
            "duplicate_ticket": dup_result,
            "confidence": classification["confidence"],
            "needs_review": classification["confidence"] < confidence_threshold,
            "reasoning": reasoning,
            "decision_factors": decision_factors,
            "image_description": gemini_analysis["image_description"],
            "ocr_text": gemini_analysis["ocr_text"],
            "image_url": request_body.image_url,
            "highlights": entities,
            "timeline": timeline,
            "env_metadata": env_metadata,
            "sla_breach_at": sla_breach_dt.isoformat() + "Z"
        }

        # 6. Final Result
        yield f"data: {json.dumps({'step': 'done', 'result': jsonable_encoder(ticket_response_dict)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/ai/analyze_ticket/legacy")
async def legacy_analyze_and_save(request_body: TicketRequest):
    """
    BACKWARD COMPATIBILITY: Strictly performs analysis only. 
    Does NOT persist to DB to avoid foreign key violations.
    """
    return await analyze_only(request_body)

@router.post("/ai/analyze-v2")
async def analyze_ticket_v2(request: TicketRequest):
    text = request.text
    try:
        prediction = classifier_v2.predict(text)
        return {
            "status": "success",
            "category": prediction["category"]["prediction"],
            "subcategory": prediction["sub_category"]["prediction"],
            "priority": prediction["priority"]["prediction"],
            "auto_resolve": prediction["auto_resolve"]["prediction"].lower() == "true",
            "assigned_team": prediction["assigned_team"]["prediction"],
            "confidence": prediction["category"]["confidence"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Clean cookie-based Supabase Auth endpoints for /auth/me backward-compatibility
# ---------------------------------------------------------------------------
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
ACCESS_MAX_AGE = 60 * 60
REFRESH_MAX_AGE = 60 * 60 * 24 * 7

def _cookie_kwargs() -> dict:
    secure = os.getenv("ENV", "production").lower() != "development"
    return {
        "httponly": True,
        "secure": secure,
        "samesite": "strict",
        "path": "/",
    }

def extract_token(request: Request) -> str | None:
    cookie_token = request.cookies.get(ACCESS_COOKIE)
    if cookie_token:
        return cookie_token
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    return None

def _set_session_cookies(response: Response, session) -> None:
    if not session or not getattr(session, "access_token", None):
        return
    response.set_cookie(
        ACCESS_COOKIE,
        session.access_token,
        max_age=ACCESS_MAX_AGE,
        **_cookie_kwargs(),
    )
    refresh = getattr(session, "refresh_token", None)
    if refresh:
        response.set_cookie(
            REFRESH_COOKIE,
            refresh,
            max_age=REFRESH_MAX_AGE,
            **_cookie_kwargs(),
        )

def _clear_session_cookies(response: Response) -> None:
    kwargs = _cookie_kwargs()
    response.delete_cookie(ACCESS_COOKIE, path=kwargs["path"])
    response.delete_cookie(REFRESH_COOKIE, path=kwargs["path"])

async def get_current_user(request: Request) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection offline")
    try:
        result = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid session: {exc}",
        ) from exc
    user = getattr(result, "user", None) or (result.get("user") if isinstance(result, dict) else None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    if hasattr(user, "model_dump"):
        return user.model_dump()
    if hasattr(user, "dict"):
        return user.dict()
    return dict(user)

