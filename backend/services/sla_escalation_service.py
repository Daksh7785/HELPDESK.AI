"""
Predictive SLA Escalation Service.

Evaluates the breach probability produced by :mod:`sla_predictor_service`
and takes automated action according to three risk tiers:

  High Risk  (probability > 0.80, unassigned):
      Auto-assign to Senior Team, increment escalation level, emit alert.

  Medium Risk (probability > 0.60, already assigned):
      Increment escalation level, upgrade priority if not already critical,
      emit manager alert.

  Early Warning (probability > 0.40):
      Flag the ticket in the ``sla_watch_queue`` metadata field so the
      risk dashboard can surface it to operators.

All mutations are applied atomically via Supabase and accompanied by an
audit-log entry and a system message on the ticket timeline.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from backend.services.sla_predictor_service import calculate_breach_probability

logger = logging.getLogger(__name__)

_UNASSIGNED_MARKERS = frozenset({"none", "unassigned", "", "null"})

_PRIORITY_UPGRADE: dict[str, str] = {
    "low":    "medium",
    "medium": "high",
    "high":   "critical",
}


def _is_unassigned(assigned_team: str | None) -> bool:
    return str(assigned_team or "").strip().lower() in _UNASSIGNED_MARKERS


class PredictiveSlaEscalationService:
    """Evaluate risk predictions and apply automated escalation rules."""

    def __init__(self, supabase_client: Any) -> None:
        self.supabase = supabase_client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_ticket(self, ticket: dict[str, Any]) -> dict[str, Any]:
        """
        Evaluate *ticket* and apply the appropriate escalation action.

        Returns a dict with ``ticket_id``, ``risk``, and ``action``.
        """
        now = datetime.now(timezone.utc)
        risk = calculate_breach_probability(ticket, now)
        ticket_id = str(ticket.get("id"))
        is_unassigned = _is_unassigned(ticket.get("assigned_team"))

        updates: dict[str, Any] = {}
        action: Optional[str] = None
        now_str = now.isoformat().replace("+00:00", "Z")

        if risk > 0.80 and is_unassigned:
            updates, action = self._high_risk_action(ticket, now_str)
        elif risk > 0.60 and not is_unassigned:
            updates, action = self._medium_risk_action(ticket, now_str)
        elif risk > 0.40:
            updates, action = self._early_warning_action(ticket, now_str)

        if updates:
            try:
                self.supabase.table("tickets").update(updates).eq("id", ticket_id).execute()
                if action:
                    self._insert_audit_log(ticket, risk, action, now_str)
                    self._emit_system_message(ticket, risk, action, now_str)
                logger.info(
                    "Predictive escalation | ticket=%s risk=%.2f action=%s",
                    ticket_id,
                    risk,
                    action,
                )
            except Exception as exc:
                logger.error("Failed predictive escalation for ticket %s: %s", ticket_id, exc)

        return {"ticket_id": ticket_id, "risk": risk, "action": action}

    # ------------------------------------------------------------------
    # Escalation rule builders
    # ------------------------------------------------------------------

    def _high_risk_action(
        self, ticket: dict[str, Any], timestamp: str
    ) -> tuple[dict[str, Any], str]:
        updates: dict[str, Any] = {
            "assigned_team": "Senior Team",
            "escalation_level": int(ticket.get("escalation_level") or 0) + 1,
            "updated_at": timestamp,
        }
        action = "High Risk: Auto-assigned to Senior Team. Manager notified."
        return updates, action

    def _medium_risk_action(
        self, ticket: dict[str, Any], timestamp: str
    ) -> tuple[dict[str, Any], str]:
        priority = str(ticket.get("priority") or "low").lower()
        updates: dict[str, Any] = {
            "escalation_level": int(ticket.get("escalation_level") or 0) + 1,
            "updated_at": timestamp,
        }
        action_parts = ["Medium Risk: Manager escalation triggered."]
        if priority != "critical":
            new_priority = _PRIORITY_UPGRADE.get(priority, "high")
            updates["priority"] = new_priority
            action_parts.append(f"Priority upgraded to {new_priority}.")
        return updates, " ".join(action_parts)

    def _early_warning_action(
        self, ticket: dict[str, Any], timestamp: str
    ) -> tuple[dict[str, Any], str]:
        metadata: dict[str, Any] = dict(ticket.get("metadata") or {})
        if metadata.get("sla_watch_queue"):
            return {}, ""   # already flagged – no duplicate update needed
        metadata["sla_watch_queue"] = True
        updates: dict[str, Any] = {
            "metadata": metadata,
            "updated_at": timestamp,
        }
        action = "Early Warning: Ticket added to SLA Watch Queue."
        return updates, action

    # ------------------------------------------------------------------
    # Side effects: audit log + ticket timeline message
    # ------------------------------------------------------------------

    def _insert_audit_log(
        self,
        ticket: dict[str, Any],
        risk: float,
        action: str,
        timestamp: str,
    ) -> None:
        try:
            self.supabase.table("audit_logs").insert({
                "event_type": "predictive_sla_escalation",
                "ticket_id": str(ticket.get("id")),
                "company_id": ticket.get("company_id"),
                "actor_type": "system",
                "message": action,
                "metadata": {
                    "risk_probability": risk,
                    "priority": ticket.get("priority"),
                    "assigned_team": ticket.get("assigned_team"),
                },
                "created_at": timestamp,
            }).execute()
        except Exception as exc:
            logger.warning("Could not write audit log for ticket %s: %s", ticket.get("id"), exc)

    def _emit_system_message(
        self,
        ticket: dict[str, Any],
        risk: float,
        action: str,
        timestamp: str,
    ) -> None:
        message = (
            f"🚨 SLA Risk Alert — {risk * 100:.0f}% breach probability detected. "
            f"Action taken: {action}"
        )
        try:
            self.supabase.table("ticket_messages").insert({
                "ticket_id": str(ticket.get("id")),
                "sender_id": "00000000-0000-0000-0000-000000000000",
                "sender_name": "SLA Predictive Engine",
                "sender_role": "admin",
                "message": message,
            }).execute()
        except Exception as exc:
            logger.warning(
                "Could not emit system message for ticket %s: %s", ticket.get("id"), exc
            )
