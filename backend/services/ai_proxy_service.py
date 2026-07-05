import os
import json
import httpx
import logging
import base64
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def build_config_list():
    configs = []
    
    # Gemini
    gemini_keys = [
        os.getenv('GEMINI_API_KEY_1') or os.getenv('VITE_GEMINI_API_KEY_1'),
        os.getenv('GEMINI_API_KEY_2') or os.getenv('VITE_GEMINI_API_KEY_2'),
        os.getenv('GEMINI_API_KEY_3') or os.getenv('VITE_GEMINI_API_KEY_3'),
        os.getenv('GEMINI_API_KEY_4') or os.getenv('VITE_GEMINI_API_KEY_4'),
    ]
    gemini_keys = [k for k in gemini_keys if k]
    gemini_models_env = os.getenv('AI_GEMINI_MODELS') or os.getenv('VITE_AI_GEMINI_MODELS') or 'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash'
    gemini_models = gemini_models_env.split(',')
    
    for key in gemini_keys:
        for model in gemini_models:
            configs.append({'provider': 'gemini', 'key': key, 'model': model.strip()})
            
    # OpenRouter
    openrouter_keys = [
        os.getenv('OPENROUTER_API_KEY_1') or os.getenv('VITE_OPENROUTER_API_KEY_1'),
        os.getenv('OPENROUTER_API_KEY_2') or os.getenv('VITE_OPENROUTER_API_KEY_2'),
        os.getenv('OPENROUTER_API_KEY_3') or os.getenv('VITE_OPENROUTER_API_KEY_3'),
        os.getenv('OPENROUTER_API_KEY_4') or os.getenv('VITE_OPENROUTER_API_KEY_4'),
    ]
    openrouter_keys = [k for k in openrouter_keys if k]
    openrouter_models_env = os.getenv('AI_OPENROUTER_MODELS') or os.getenv('VITE_AI_OPENROUTER_MODELS') or 'meta-llama/llama-3.2-3b-instruct:free,microsoft/phi-3-mini-128k-instruct:free,mistralai/mistral-7b-instruct:free,google/gemma-2-9b-it:free'
    openrouter_models = openrouter_models_env.split(',')
    
    if openrouter_models:
        for idx, key in enumerate(openrouter_keys):
            primary_model = openrouter_models[idx % len(openrouter_models)].strip()
            secondary_model = openrouter_models[(idx + 1) % len(openrouter_models)].strip()
            configs.append({'provider': 'openrouter', 'key': key, 'model': primary_model})
            configs.append({'provider': 'openrouter', 'key': key, 'model': secondary_model})

    # Groq
    groq_keys = [
        os.getenv('GROQ_API_KEY_1') or os.getenv('VITE_GROQ_API_KEY_1'),
        os.getenv('GROQ_API_KEY_2') or os.getenv('VITE_GROQ_API_KEY_2'),
        os.getenv('GROQ_API_KEY_3') or os.getenv('VITE_GROQ_API_KEY_3'),
    ]
    groq_keys = [k for k in groq_keys if k]
    groq_models_env = os.getenv('AI_GROQ_MODELS') or os.getenv('VITE_AI_GROQ_MODELS') or 'llama-3.1-8b-instant,mixtral-8x7b-32768,gemma2-9b-it'
    groq_models = groq_models_env.split(',')
    
    if groq_models:
        for idx, key in enumerate(groq_keys):
            configs.append({'provider': 'groq', 'key': key, 'model': groq_models[idx % len(groq_models)].strip()})
        
    return configs

async def call_gemini(config, prompt_text, history, image):
    contents = []
    
    for msg in history:
        parts = [{"text": msg.get("text", "")}]
        if msg.get("image"):
            mime_part, data = msg["image"].split(';base64,')
            mime_type = mime_part.split(':')[1] if ':' in mime_part else 'image/png'
            parts.append({"inline_data": {"mime_type": mime_type, "data": data}})
        contents.append({
            "role": "model" if msg.get("role") == "bot" else "user",
            "parts": parts
        })
        
    # Gemini requires history to start with 'user' role
    first_user_idx = -1
    for i, c in enumerate(contents):
        if c["role"] == "user":
            first_user_idx = i
            break
            
    if first_user_idx > 0:
        contents = contents[first_user_idx:]
    elif first_user_idx == -1:
        contents = []
        
    message_parts = [{"text": prompt_text}]
    if image:
        mime_part, data = image.split(';base64,')
        mime_type = mime_part.split(':')[1] if ':' in mime_part else 'image/png'
        message_parts.append({"inline_data": {"mime_type": mime_type, "data": data}})
        
    contents.append({
        "role": "user",
        "parts": message_parts
    })
    
    payload = {
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 2048}
    }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{config['model']}:generateContent?key={config['key']}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=60.0)
        
        if not response.is_success:
            err = Exception(f"HTTP {response.status_code}")
            err.status = response.status_code
            err.message = response.text
            raise err
            
        data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            return "No response received."

async def call_openai_compat(config, prompt_text, history, image, base_url, extra_headers=None):
    if extra_headers is None:
        extra_headers = {}
        
    messages = []
    for msg in history:
        messages.append({
            "role": "assistant" if msg.get("role") == "bot" else "user",
            "content": msg.get("text", "")
        })
        
    if image:
        user_content = [
            {"type": "text", "text": prompt_text},
            {"type": "image_url", "image_url": {"url": image}}
        ]
    else:
        user_content = prompt_text
        
    messages.append({"role": "user", "content": user_content})
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {config['key']}"
    }
    headers.update(extra_headers)
    
    payload = {
        "model": config["model"],
        "messages": messages,
        "max_tokens": 2048
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=60.0)
        
        if not response.is_success:
            err = Exception(f"HTTP {response.status_code}")
            err.status = response.status_code
            err.message = response.text
            raise err
            
        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            return "No response received."

async def run_with_failover(prompt_text, history, image):
    config_list = build_config_list()
    if not config_list:
        raise Exception("No AI API keys configured in environment variables.")
        
    blacklisted_keys = set()
    
    for i, config in enumerate(config_list):
        if config["key"] in blacklisted_keys:
            logger.info(f"[AI Failover] Skipping blacklisted key for {config['provider']} ({config['model']})")
            continue
            
        logger.info(f"[AI Failover] Trying {i + 1}/{len(config_list)}: {config['provider']} ({config['model']})")
        
        try:
            if config["provider"] == "gemini":
                return await call_gemini(config, prompt_text, history, image)
            elif config["provider"] == "openrouter":
                # Fallback referer if not set
                referer = os.getenv("FRONTEND_URL", "http://localhost:5173")
                return await call_openai_compat(
                    config, prompt_text, history, image,
                    "https://openrouter.ai/api/v1",
                    {"HTTP-Referer": referer, "X-Title": "AI Helpdesk"}
                )
            elif config["provider"] == "groq":
                return await call_openai_compat(
                    config, prompt_text, history, None, # Groq = text only
                    "https://api.groq.com/openai/v1"
                )
        except Exception as error:
            status = getattr(error, 'status', None)
            msg = getattr(error, 'message', str(error))
            
            is_rate_limit = (
                status == 429 or 
                '429' in msg or 
                'quota' in msg.lower() or 
                'RESOURCE_EXHAUSTED' in msg or 
                'rate_limit' in msg.lower()
            )
            
            is_expired_or_invalid = (
                'API_KEY_INVALID' in msg or 
                'API key expired' in msg or 
                'invalid' in msg.lower() or 
                'expired' in msg.lower() or 
                status in [401, 403]
            )
            
            if is_expired_or_invalid:
                blacklisted_keys.add(config["key"])
                logger.warning(f"[AI Failover] Blacklisted invalid/expired key for {config['provider']}")
                
            logger.warning(f"[AI Failover] ❌ {config['provider']} key {i + 1}: {'Quota exceeded' if is_rate_limit else msg}")
            
    raise Exception("QUOTA_EXCEEDED: All AI API keys exhausted. Please wait a few minutes and try again.")

def local_fallback_summary(issue_text):
    text = issue_text.strip()
    summary = (text[0].upper() + text[1:])[:100] + ('…' if len(text) > 100 else '')
    return {"summary": summary, "image_description": ""}

def get_sla_breach_at(priority="Medium"):
    hours_map = {"Critical": 2, "High": 8, "Medium": 24, "Low": 72}
    sla_hours = hours_map.get(priority, 24)
    breach_time = datetime.utcnow() + timedelta(hours=sla_hours)
    return breach_time.isoformat() + "Z"

async def ask_ai(prompt: str, ticket_context: dict, history: list = None, image: str = None):
    if history is None:
        history = []
        
    system_prompt = f"""You are an expert enterprise IT troubleshooting assistant.
Your goal is to guide the user to a resolution with extreme clarity and professionalism.

STRICT FORMATTING RULES:
1. Use **markdown** for all responses.
2. Use **bold headers** for main steps.
3. Use - bulleted lists for options or details within a step.
4. Use `code blocks` or `inline code` for all terminal commands, paths, or specific UI elements.
5. Keep the tone helpful, concise, and structured. Avoid long blocks of text.
6. If you need to ask multiple questions, use a bulleted list.

Context:
- Summary: {ticket_context.get('summary', 'N/A')}
- Category: {ticket_context.get('category', 'N/A')}
- Subcategory: {ticket_context.get('subcategory', 'N/A')}
- Entities: {json.dumps(ticket_context.get('entities', []))}
- OCR Text: {ticket_context.get('ocr_text', 'None')}"""

    effective_prompt = f"{system_prompt}\n\nUSER REQUEST: {prompt}" if len(history) == 0 else f"{prompt}\n\n(Reminder: Follow all system formatting and context rules)"
    
    return await run_with_failover(effective_prompt, history, image)

async def analyze_ticket_with_ai(issue_text: str, ocr_text: str = "", image: str = None):
    image_note = f"\nExtracted text from uploaded screenshot: \"{ocr_text}\"" if ocr_text else ""
    image_instruction = "\nAn image has also been provided. Analyze it and describe the visible error or issue." if image else ""
    
    prompt = f"""You are an enterprise IT analyst. Given the following user-reported issue, do three things:
1. Write a concise one-line summary (max 100 chars) of the core technical problem.
2. If an image is provided, describe the visible error/UI state in one sentence.
3. Classify the ticket accurately, regardless of the language it is written in (translate internally if needed).

Respond in this EXACT JSON format (no markdown, just raw JSON):
{{
  "summary": "...",
  "image_description": "...",
  "category": "...",
  "subcategory": "...",
  "priority": "...",
  "assigned_team": "...",
  "confidence": 0.95
}}

User Issue: "{issue_text}"{image_note}{image_instruction}"""
    
    try:
        raw = await run_with_failover(prompt, [], image)
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)
        
        return {
            "summary": parsed.get("summary") or issue_text[:100],
            "image_description": parsed.get("image_description", ""),
            "category": parsed.get("category"),
            "subcategory": parsed.get("subcategory"),
            "priority": parsed.get("priority"),
            "assigned_team": parsed.get("assigned_team"),
            "confidence": parsed.get("confidence", 0.9),
            "sla_breach_at": get_sla_breach_at(parsed.get("priority"))
        }
    except Exception as err:
        logger.warning(f"[analyzeTicketWithAI] All providers exhausted, using local fallback: {err}")
        fallback = local_fallback_summary(issue_text)
        fallback["sla_breach_at"] = get_sla_breach_at()
        return fallback
