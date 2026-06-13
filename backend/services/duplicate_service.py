"""
Duplicate Detection Service
Uses sentence-transformers all-MiniLM-L6-v2 to detect similar tickets.
"""

import uuid
import os
from sentence_transformers import SentenceTransformer, util

SIMILARITY_THRESHOLD = 0.70


class DuplicateService:
    def __init__(self):
        self.model = None
        self._loaded = False
        self._load_failed = False
        # In-memory store: list of (ticket_id, embedding, text)
        self._tickets: list[tuple[str, object, str]] = []
        self.storage_file = os.path.join(os.path.dirname(__file__), "..", "data", "case_history_cache.json")
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)

    def is_available(self) -> bool:
        """Check if the model is available for duplicate detection."""
        return self._loaded and not self._load_failed

    def load(self):
        """Load the sentence-transformer model and saved tickets."""
        if self._loaded or self._load_failed:
            return
        
        print("[DuplicateService] Loading model...")
        try:
            # Check if a local model path is provided
            model_path = os.environ.get("SENTENCE_TRANSFORMER_MODEL_PATH")
            if model_path and os.path.exists(model_path):
                print(f"[DuplicateService] Loading from local path: {model_path}")
                self.model = SentenceTransformer(model_path)
            else:
                # Download from HuggingFace
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self._loaded = True
            
            if os.path.exists(self.storage_file):
                print(f"[DuplicateService] Syncing previous ticket history from {self.storage_file}...")
                import json
                try:
                    with open(self.storage_file, "r") as f:
                        data = json.load(f)
                        for item in data:
                            text = item["text"]
                            embedding = self.model.encode(text, convert_to_tensor=True)
                            self._tickets.append((item["ticket_id"], embedding, text))
                    print(f"[DuplicateService] Loaded {len(self._tickets)} tickets.")
                except Exception as e:
                    print(f"[DuplicateService] Error loading storage: {e}")
        except Exception as e:
            allow_degraded = os.environ.get("ALLOW_DEGRADED_STARTUP", "0") == "1"
            self._load_failed = True
            print(f"[DuplicateService] Failed to load model: {e}")
            if allow_degraded:
                print("[DuplicateService] DEGRADED: Continuing without model (ALLOW_DEGRADED_STARTUP=1)")
                self.model = None
                self._loaded = False
            else:
                raise

    def save_to_disk(self, ticket_id: str, text: str):
        """Append a new ticket to the JSON storage."""
        import json
        data = []
        try:
            os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)
            if os.path.exists(self.storage_file):
                with open(self.storage_file, "r") as f:
                    try:
                        data = json.load(f)
                        if not isinstance(data, list):
                            data = []
                    except:
                        data = []
            
            data.append({"ticket_id": ticket_id, "text": text})
            with open(self.storage_file, "w") as f:
                json.dump(data, f, indent=2)
            print(f"[DuplicateService] Indexed ticket {ticket_id} to case history.")
        except Exception as e:
            print(f"[DuplicateService] Failed to save to disk: {e}")

    def add_ticket(self, ticket_id: str, text: str):
        """Add a ticket to the in-memory store and persist to disk."""
        self.load()
        if not self.is_available():
            print(f"[DuplicateService] DEGRADED: Skipping embedding for ticket {ticket_id} (model not available)")
            return
        embedding = self.model.encode(text, convert_to_tensor=True)
        self._tickets.append((ticket_id, embedding, text))
        self.save_to_disk(ticket_id, text)

    def check_duplicate(self, text: str, threshold: float = None) -> dict:
        """
        Check if a ticket is a duplicate of any stored ticket.

        Args:
            text: The ticket text to check.
            threshold: Optional override for the similarity threshold.

        Returns:
            {
                "is_duplicate": bool,
                "duplicate_ticket_id": str | None,
                "similarity": float
            }
        """
        self.load()
        
        # If model is not available, return no duplicate found
        if not self.is_available():
            print("[DuplicateService] DEGRADED: Duplicate check skipped (model not available)")
            return {
                "is_duplicate": False,
                "duplicate_ticket_id": None,
                "similarity": 0.0,
            }
        
        # Use provided threshold or default to global constant
        active_threshold = threshold if threshold is not None else SIMILARITY_THRESHOLD

        if not self._tickets:
            return {
                "is_duplicate": False,
                "duplicate_ticket_id": None,
                "similarity": 0.0,
            }

        query_embedding = self.model.encode(text, convert_to_tensor=True)

        best_score = 0.0
        best_id = None

        for ticket_id, stored_emb, _ in self._tickets:
            score = util.cos_sim(query_embedding, stored_emb).item()
            if score > best_score:
                best_score = score
                best_id = ticket_id

        is_dup = best_score >= active_threshold

        return {
            "is_duplicate": is_dup,
            "duplicate_ticket_id": best_id if is_dup else None,
            "similarity": round(best_score, 4),
        }

    def merge_tickets(self, supabase, primary_id: str, secondary_ids: list[str], admin_id: str) -> dict:
        """
        Merge secondary tickets into the primary ticket.
        Transfers comments, attachments, and updates metadata.
        Creates an immutable audit log.
        """
        from datetime import datetime, timezone
        import json

        # 1. Fetch Primary Ticket
        primary_res = supabase.table("tickets").select("*").eq("id", primary_id).single().execute()
        if not primary_res.data:
            raise ValueError(f"Primary ticket {primary_id} not found.")
        primary_ticket = primary_res.data
        primary_metadata = primary_ticket.get("metadata") or {}
        primary_attachments = primary_metadata.get("attachments", [])
        if primary_ticket.get("image_url") and primary_ticket.get("image_url") not in primary_attachments:
            primary_attachments.append(primary_ticket.get("image_url"))

        merged_history = primary_metadata.get("merged_tickets", [])

        # 2. Process Secondary Tickets
        for sec_id in secondary_ids:
            sec_res = supabase.table("tickets").select("*").eq("id", sec_id).single().execute()
            if not sec_res.data:
                continue
            sec_ticket = sec_res.data
            
            # Transfer comments
            supabase.table("ticket_messages").update({"ticket_id": primary_id}).eq("ticket_id", sec_id).execute()

            # Transfer attachments
            sec_metadata = sec_ticket.get("metadata") or {}
            sec_attachments = sec_metadata.get("attachments", [])
            if sec_ticket.get("image_url") and sec_ticket.get("image_url") not in sec_attachments:
                sec_attachments.append(sec_ticket.get("image_url"))
            
            for att in sec_attachments:
                if att not in primary_attachments:
                    primary_attachments.append(att)

            # Update Secondary Ticket Status
            sec_metadata["merged_into"] = primary_id
            supabase.table("tickets").update({
                "status": "merged",
                "is_duplicate": True,
                "metadata": sec_metadata
            }).eq("id", sec_id).execute()

            # Add to history
            merged_history.append({
                "ticket_id": sec_id,
                "merged_at": datetime.now(timezone.utc).isoformat(),
                "merged_by": admin_id
            })

        # 3. Update Primary Ticket
        primary_metadata["attachments"] = primary_attachments
        primary_metadata["merged_tickets"] = merged_history
        supabase.table("tickets").update({
            "metadata": primary_metadata
        }).eq("id", primary_id).execute()

        # 4. Generate Audit Log
        audit_file = os.path.join(os.path.dirname(__file__), "..", "data", "merge_audit_log.json")
        audit_record = {
            "action": "ticket_merge",
            "primary_ticket_id": primary_id,
            "secondary_ticket_ids": secondary_ids,
            "admin_id": admin_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        audit_data = []
        if os.path.exists(audit_file):
            try:
                with open(audit_file, "r") as f:
                    audit_data = json.load(f)
            except:
                pass
        
        audit_data.append(audit_record)
        with open(audit_file, "w") as f:
            json.dump(audit_data, f, indent=2)

        # 5. Insert System Message to Primary Ticket
        supabase.table("ticket_messages").insert({
            "ticket_id": primary_id,
            "sender_id": "system",
            "sender_name": "System Audit",
            "sender_role": "system",
            "message": f"System Alert: Merged {len(secondary_ids)} ticket(s) ({', '.join(secondary_ids)}) into this ticket."
        }).execute()

        return {
            "success": True,
            "primary_id": primary_id,
            "merged_count": len(secondary_ids)
        }
