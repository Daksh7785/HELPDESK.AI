import os
import base64
import io
import re
from PIL import Image
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self._initialized = False
        self.model_name = 'gemini-2.5-flash'
        
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self._initialized = True
                print(f"[GeminiService] Connected to Google GenAI API (Model: {self.model_name})")
            except Exception as e:
                print(f"[GeminiService] Initialization Error: {e}")
        else:
            print("[GeminiService] WARNING: GEMINI_API_KEY not found in environment.")

    def analyze_image(self, image_base64: str) -> dict:
        """
        Perform OCR and image analysis using Gemini logic.
        """
        if not self._initialized:
            return {
                "image_description": "[Gemini API Key Missing] Could not analyze image.",
                "ocr_text": "",
                "detected_problem": ""
            }

        try:
            # Decode base64 image (actually the new SDK handles base64 easily if we just pass bytes, 
            # but we can also use PIL if we need to process it)
            image_bytes = base64.b64decode(image_base64)
            img = Image.open(io.BytesIO(image_bytes))

            prompt = (
                "Analyze this screenshot from a user reporting a technical issue. "
                "1. Provide a concise description of what is shown in the image. "
                "2. Perform OCR and extract any error messages or key text. "
                "3. Identify the main technical problem depicted. "
                "Return the result in the following format: "
                "Description: <description>\n"
                "OCR: <text>\n"
                "Problem: <problem>"
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt, img]
            )
            text_response = response.text

            description_match = re.search(r"(?:Description|1\.)\s*[:\-]?\s*(.*)", text_response, re.IGNORECASE)
            ocr_match = re.search(r"(?:OCR|2\.)\s*[:\-]?\s*(.*)", text_response, re.IGNORECASE)
            problem_match = re.search(r"(?:Problem|3\.)\s*[:\-]?\s*(.*)", text_response, re.IGNORECASE)

            return {
                "image_description": description_match.group(1).strip() if description_match else text_response[:500],
                "ocr_text": ocr_match.group(1).strip() if ocr_match else "",
                "detected_problem": problem_match.group(1).strip() if problem_match else ""
            }

        except Exception as e:
            print(f"[GeminiService] Image Analysis Error: {e}")
            return {
                "image_description": f"Error analyzing image: {str(e)}",
                "ocr_text": "",
                "detected_problem": ""
            }

    def get_summary(self, ticket_text: str) -> str:
        """
        Generate a concise, one-line summary of the ticket text.
        """
        if not self._initialized:
            return ticket_text[:100] + ("…" if len(ticket_text) > 100 else "")

        try:
            prompt = (
                "You are an expert IT triage specialized in extreme brevity. "
                "Summarize the following IT support ticket into exactly ONE concise, hard-hitting line (max 15 words) "
                "that captures the technical essence. NO intro, NO filler, just the core problem headline. "
                f"Ticket: '{ticket_text}'"
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip().replace("\n", " ")
        except Exception as e:
            print(f"[GeminiService] Summarization Error: {e}")
            return ticket_text[:100] + ("…" if len(ticket_text) > 100 else "")

    def get_reasoning(self, ticket_text: str, category: str, team: str) -> dict:
        """
        Get a deeper AI explanation and key takeaways for the ticket.
        """
        if not self._initialized:
            return {"reasoning": "", "highlights": []}

        try:
            prompt = (
                f"Analyze this IT support ticket: '{ticket_text}'\n"
                f"It was categorized as '{category}' and routed to '{team}'.\n\n"
                "Please provide:\n"
                "1. Reasoning: A professional explanation of why this category/team was chosen (max 2 sentences).\n"
                "2. Highlights: 2-3 key technical points or symptoms mentioned in the ticket (short bullets).\n"
                "\nFormat the output strictly as:\n"
                "REASONING: <text>\n"
                "HIGHLIGHTS: <point1> | <point2> | <point3>"
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            text_response = response.text.strip()

            reasoning_match = re.search(r"REASONING:\s*(.*)", text_response, re.IGNORECASE)
            highlights_match = re.search(r"HIGHLIGHTS:\s*(.*)", text_response, re.IGNORECASE)

            reasoning = reasoning_match.group(1).strip() if reasoning_match else ""
            highlights_raw = highlights_match.group(1).strip() if highlights_match else ""
            highlights = [h.strip() for h in highlights_raw.split("|") if h.strip()]

            return {
                "reasoning": reasoning,
                "highlights": highlights
            }
        except Exception as e:
            print(f"[GeminiService] Reasoning Error: {e}")
            return {"reasoning": "", "highlights": []}

    def get_troubleshooting_step(self, ticket_text: str, history: list[dict], category: str) -> dict:
        """
        Get the next troubleshooting step from Gemini based on conversation history.
        """
        if not self._initialized:
            return {
                "step_text": "AI Troubleshooting is currently unavailable.",
                "options": ["Try again later"],
                "is_final": True
            }

        try:
            history_str = ""
            for msg in history:
                role = "User" if msg["role"] == "user" else "AI"
                history_str += f"{role}: {msg['text']}\n"

            prompt = (
                f"You are an expert IT support assistant. A user is reporting this issue: '{ticket_text}' (Category: {category}).\n\n"
                f"Previous conversation:\n{history_str}\n"
                "Provide the NEXT troubleshooting step. Follow these rules:\n"
                "1. If the issue seems resolved based on history, or if you've exhausted basic steps, set is_final: True.\n"
                "2. Provide exactly 2-3 short, actionable user options (e.g., 'Yes, I did that', 'I need help').\n"
                "3. Keep the bot message concise and professional.\n\n"
                "Format your response EXACTLY like this:\n"
                "STEP: <the instructions for the user>\n"
                "OPTIONS: <option1> | <option2> | <option3>\n"
                "FINAL: <True/False>"
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            text_response = response.text.strip()

            step_match = re.search(r"STEP:\s*(.*)", text_response, re.IGNORECASE)
            options_match = re.search(r"OPTIONS:\s*(.*)", text_response, re.IGNORECASE)
            final_match = re.search(r"FINAL:\s*(True|False)", text_response, re.IGNORECASE)

            return {
                "step_text": step_match.group(1).strip() if step_match else "Let's try checking your settings.",
                "options": [o.strip() for o in (options_match.group(1).strip() if options_match else "Done | Stuck").split("|") if o.strip()],
                "is_final": final_match.group(1).lower() == "true" if final_match else False
            }
        except Exception as e:
            print(f"[GeminiService] Troubleshooting Error: {e}")
            return {
                "step_text": "I encountered an error. Let's try one more basic check.",
                "options": ["Okay", "Skip to agent"],
                "is_final": False
            }

    def analyze_bug_report(self, bug_title: str, description: str, steps: str, errors: list) -> str:
        """
        Analyze a bug report and captured console errors to generate a Probable Cause.
        """
        if not self._initialized:
            return "AI Diagnostics unavailable (API key missing or disconnected)."

        try:
            errors_schema = "\n".join([f"- {err}" for err in errors]) if errors else "None captured."
            prompt = (
                f"You are a Level 3 Senior System Engineer diagnosing a bug report.\n"
                f"Title: {bug_title}\n"
                f"Description: {description}\n"
                f"Steps to reproduce: {steps}\n"
                f"Captured Console/Network Errors: \n{errors_schema}\n\n"
                "Based on this exact telemetry and report, provide a concise 'Probable Root Cause' (1-3 sentences maximum). "
                "Focus purely on technical inference and what the developer should investigate first. "
                "Do not include pleasantries. Do not say 'The probable cause is', just state the technical theory."
            )

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"[GeminiService] Bug Analysis Error: {e}")
            return f"Diagnostic analysis failed: {str(e)}"

    def ask_ai(self, prompt: str, ticket_context: dict, history: list, image_base64: str = None) -> str:
        """
        Generic raw AI chat for troubleshooting. Replaces the frontend askAI direct call.
        """
        if not self._initialized:
            return "AI Chat unavailable (API key missing or disconnected)."

        try:
            # Build context string from ticket_context
            summary = ticket_context.get("summary", "N/A") if ticket_context else "N/A"
            category = ticket_context.get("category", "N/A") if ticket_context else "N/A"
            subcategory = ticket_context.get("subcategory", "N/A") if ticket_context else "N/A"
            entities = ticket_context.get("entities", []) if ticket_context else []
            ocr_text = ticket_context.get("ocr_text", "None") if ticket_context else "None"
            
            system_prompt = (
                "You are an expert enterprise IT troubleshooting assistant.\n"
                "Your goal is to guide the user to a resolution with extreme clarity and professionalism.\n\n"
                "STRICT FORMATTING RULES:\n"
                "1. Use **markdown** for all responses.\n"
                "2. Use **bold headers** for main steps.\n"
                "3. Use - bulleted lists for options or details within a step.\n"
                "4. Use `code blocks` or `inline code` for all terminal commands, paths, or specific UI elements.\n"
                "5. Keep the tone helpful, concise, and structured. Avoid long blocks of text.\n"
                "6. If you need to ask multiple questions, use a bulleted list.\n\n"
                f"Context:\n"
                f"- Summary: {summary}\n"
                f"- Category: {category}\n"
                f"- Subcategory: {subcategory}\n"
                f"- Entities: {entities}\n"
                f"- OCR Text: {ocr_text}"
            )

            contents = []
            
            # Since the new python SDK does not have a "startChat" equivalent that easily takes system prompts
            # without specific role mapping we'll construct the history manually.
            if not history:
                effective_prompt = f"{system_prompt}\n\nUSER REQUEST: {prompt}"
                contents.append(effective_prompt)
            else:
                # Add history
                # We will prepend system prompt to the first user message
                for i, msg in enumerate(history):
                    role = "user" if msg.get("role") == "user" else "model"
                    msg_text = msg.get("text", "")
                    if i == 0 and role == "user":
                        msg_text = f"{system_prompt}\n\n{msg_text}"
                    
                    contents.append(genai.types.Content(role=role, parts=[genai.types.Part.from_text(text=msg_text)]))
                
                # Add current prompt
                current_prompt = f"{prompt}\n\n(Reminder: Follow all system formatting and context rules)"
                contents.append(genai.types.Content(role="user", parts=[genai.types.Part.from_text(text=current_prompt)]))

            # Add image to the last part if provided
            if image_base64:
                image_bytes = base64.b64decode(image_base64.split("base64,")[-1] if "base64," in image_base64 else image_base64)
                img = Image.open(io.BytesIO(image_bytes))
                
                # Note: For contents parameter, if it's a list of `Content` objects, we need to append the image to the last user message.
                if isinstance(contents[-1], genai.types.Content):
                    contents[-1].parts.append(img)
                else:
                    contents.append(img)

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents
            )
            return response.text.strip()
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"[GeminiService] Chat Error: {e}")
            return f"I encountered an error processing your request: {str(e)}"

