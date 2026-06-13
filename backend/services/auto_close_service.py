"""
Auto-Close Service: Scheduled background job to automatically close resolved tickets
after a company-configured inactivity period.

Now includes CSAT Auto-Trigger logic.
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()
formatter = logging.Formatter("[AutoCloseService] %(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


class AutoCloseService:
    """Background service for automatically closing resolved tickets and triggering CSAT."""

    def __init__(self):
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.enabled = os.getenv("AUTO_CLOSE_ENABLED", "true").lower() == "true"
        self.default_auto_close_days = int(os.getenv("AUTO_CLOSE_DAYS", "7"))
        self.cron_schedule = os.getenv("AUTO_CLOSE_CRON_SCHEDULE", "0 2 * * *")

    def get_system_settings(self, company_id: str) -> Dict:
        try:
            response = self.supabase.table("system_settings").select(
                "auto_close_days, auto_close_enabled"
            ).eq("company_id", company_id).single().execute()
            
            if response.data:
                return {
                    "auto_close_days": response.data.get("auto_close_days", self.default_auto_close_days),
                    "auto_close_enabled": response.data.get("auto_close_enabled", True)
                }
        except Exception as e:
            logger.warning(f"Could not fetch settings for company {company_id}: {str(e)}. Using defaults.")
        
        return {
            "auto_close_days": self.default_auto_close_days,
            "auto_close_enabled": True
        }

    def _close_ticket(self, ticket_id: str, company_id: str, stats: Dict) -> bool:
        try:
            self.supabase.table("tickets").update({
                "status": "closed",
                "auto_closed": True,
                "closed_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", ticket_id).eq("company_id", company_id).execute()
            
            stats["closed_count"] += 1
            logger.info(f"Closed ticket {ticket_id} for company {company_id}")
            return True
        except Exception as e:
            stats["error_count"] += 1
            logger.error(f"Failed to close ticket {ticket_id}: {str(e)}")
            return False

    def trigger_csat_surveys(self):
        """Find resolved tickets older than 2 hours without a CSAT record and trigger survey."""
        logger.info("Running CSAT Trigger Job...")
        cutoff_date = datetime.now(timezone.utc) - timedelta(hours=2)
        try:
            # Get resolved tickets
            response = self.supabase.table("tickets").select(
                "id, owner_id"
            ).eq("status", "resolved").lte("updated_at", cutoff_date.isoformat()).execute()
            
            tickets = response.data if response.data else []
            for t in tickets:
                ticket_id = t["id"]
                owner_id = t.get("owner_id")
                # Check if CSAT record already exists
                csat_check = self.supabase.table("ticket_csat_feedback").select("id").eq("ticket_id", ticket_id).execute()
                if not csat_check.data:
                    # Insert pending survey
                    self.supabase.table("ticket_csat_feedback").insert({
                        "ticket_id": ticket_id,
                        "user_id": owner_id,
                        "status": "pending",
                        "next_reminder_at": datetime.now(timezone.utc).isoformat()
                    }).execute()
                    logger.info(f"Triggered CSAT for ticket {ticket_id}")
        except Exception as e:
            logger.error(f"Error triggering CSAT: {str(e)}")

    def submit_feedback(self, ticket_id: str, rating: int, comment: str, language: str):
        try:
            data = {
                "rating": rating,
                "comment": comment,
                "status": "submitted",
                "submitted_at": datetime.now(timezone.utc).isoformat(),
                "language": language
            }
            res = self.supabase.table("ticket_csat_feedback").update(data).eq("ticket_id", ticket_id).execute()
            if not res.data:
                # Insert if not existing
                self.supabase.table("ticket_csat_feedback").insert({
                    "ticket_id": ticket_id,
                    **data
                }).execute()
            # update legacy tickets table just in case
            self.supabase.table("tickets").update({"csat_rating": rating, "csat_comment": comment}).eq("id", ticket_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error submitting CSAT: {str(e)}")
            return False

    def remind_later(self, ticket_id: str):
        try:
            csat_check = self.supabase.table("ticket_csat_feedback").select("reminder_count").eq("ticket_id", ticket_id).execute()
            if csat_check.data:
                reminders = csat_check.data[0].get("reminder_count", 0)
                if reminders >= 3:
                    self.supabase.table("ticket_csat_feedback").update({
                        "status": "expired"
                    }).eq("ticket_id", ticket_id).execute()
                    return {"status": "expired"}
                else:
                    next_reminder = datetime.now(timezone.utc) + timedelta(hours=24)
                    self.supabase.table("ticket_csat_feedback").update({
                        "status": "remind_later",
                        "reminder_count": reminders + 1,
                        "next_reminder_at": next_reminder.isoformat()
                    }).eq("ticket_id", ticket_id).execute()
                    return {"status": "remind_later"}
        except Exception as e:
            logger.error(f"Error remind later: {str(e)}")
            return False

    def get_pending_surveys(self, user_id: str):
        now = datetime.now(timezone.utc).isoformat()
        try:
            res = self.supabase.table("ticket_csat_feedback").select(
                "ticket_id, reminder_count"
            ).eq("user_id", user_id).in_("status", ["pending", "remind_later"]).lte("next_reminder_at", now).execute()
            return res.data if res.data else []
        except Exception as e:
            logger.error(f"Error getting pending surveys: {str(e)}")
            return []

    def get_analytics(self, company_id: str = None):
        try:
            # Simplified analytics collection
            query = self.supabase.table("ticket_csat_feedback").select(
                "rating, status"
            ).eq("status", "submitted")
            
            res = query.execute()
            data = res.data if res.data else []
            
            total_surveys = len(data)
            if total_surveys == 0:
                return {"avg_csat": 0, "response_rate": 0, "distribution": {}}
                
            total_score = sum([d["rating"] for d in data if d.get("rating")])
            avg = total_score / total_surveys if total_surveys > 0 else 0
            
            distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for d in data:
                if d.get("rating"):
                    distribution[d["rating"]] += 1
            
            all_res = self.supabase.table("ticket_csat_feedback").select("id, status").execute()
            all_data = all_res.data if all_res.data else []
            response_rate = (total_surveys / len(all_data)) * 100 if len(all_data) > 0 else 0
            
            return {
                "avg_csat": round(avg, 1),
                "response_rate": round(response_rate, 1),
                "distribution": distribution
            }
        except Exception as e:
            logger.error(f"Error getting analytics: {str(e)}")
            return {}

    def run(self) -> Dict:
        if not self.enabled:
            return {"status": "disabled"}

        # Run CSAT Trigger
        self.trigger_csat_surveys()

        stats = {
            "processed_count": 0, "closed_count": 0, "error_count": 0, "skipped_count": 0
        }
        try:
            response = self.supabase.table("tickets").select(
                "id, company_id, status, updated_at"
            ).eq("status", "resolved").execute()

            resolved_tickets = response.data if response.data else []
            stats["processed_count"] = len(resolved_tickets)

            company_tickets: Dict[str, List] = {}
            for ticket in resolved_tickets:
                company_id = ticket.get("company_id")
                if company_id not in company_tickets:
                    company_tickets[company_id] = []
                company_tickets[company_id].append(ticket)

            for company_id, tickets in company_tickets.items():
                try:
                    settings = self.get_system_settings(company_id)
                    if not settings["auto_close_enabled"]:
                        stats["skipped_count"] += len(tickets)
                        continue

                    auto_close_days = settings["auto_close_days"]
                    cutoff_date = datetime.now(timezone.utc) - timedelta(days=auto_close_days)

                    for ticket in tickets:
                        try:
                            updated_at_str = ticket.get("updated_at")
                            if not updated_at_str:
                                continue
                            updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                            if updated_at < cutoff_date:
                                self._close_ticket(ticket["id"], company_id, stats)
                            else:
                                stats["skipped_count"] += 1
                        except ValueError as e:
                            stats["error_count"] += 1
                except Exception as e:
                    stats["error_count"] += len(tickets)

            return stats
        except Exception as e:
            stats["error_count"] += 1
            return stats

_instance: Optional[AutoCloseService] = None

def load():
    global _instance
    if _instance is None:
        _instance = AutoCloseService()
    return _instance

def get_instance() -> Optional[AutoCloseService]:
    return _instance
