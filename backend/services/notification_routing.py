"""
Notification Routing Middleware: Centralized gating logic for all notifications.

Ensures that email, push, and admin alert notifications respect company-level settings:
- `email_notifications`: Gate all email-based notifications (digests, alerts)
- `admin_alerts`: Gate high-priority admin escalations
- `digest_frequency`: Control digest email frequency (daily, weekly, disabled)

Features:
- Company settings caching to reduce DB queries
- Audit logging for all notification decisions
- Fail-open design (allow notification if settings unavailable)
- Reusable for all notification trigger points
- Email delivery status tracking (sent, delivered, failed)
- User-friendly error message mapping for SMTP failures
- Resend support for failed notifications
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from enum import Enum

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()
formatter = logging.Formatter("[NotificationRouting] %(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


class NotificationType(str, Enum):
    """Types of notifications that can be gated."""
    DAILY_DIGEST = "daily_digest"
    WEEKLY_DIGEST = "weekly_digest"
    TICKET_ALERT = "ticket_alert"
    ADMIN_ALERT = "admin_alert"
    PUSH_NOTIFICATION = "push_notification"


class EmailDeliveryStatus(str, Enum):
    """Possible states of an email notification delivery lifecycle."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


# Maps known technical SMTP / provider error codes to user-friendly messages.
SMTP_ERROR_MESSAGES: Dict[str, str] = {
    "SMTP_550": "Recipient email address appears invalid.",
    "SMTP_421": "Email service is temporarily unavailable. Please try again shortly.",
    "SMTP_452": "Recipient mailbox cannot receive new messages.",
    "SMTP_554": "Email was rejected by the recipient server.",
    "RATE_LIMIT": "Too many emails sent recently. Please wait before retrying.",
    "TIMEOUT": "Email service is temporarily unavailable. Please try again shortly.",
    "DNS_ERROR": "Email delivery failed due to a network issue. Please try again.",
    "INVALID_ADDRESS": "Recipient email address appears invalid.",
    "MAILBOX_FULL": "Recipient mailbox cannot receive new messages.",
    "CONNECTION_REFUSED": "Email service is temporarily unavailable. Please try again shortly.",
}

DEFAULT_ERROR_MESSAGE = "We couldn't deliver this email. Please try again."


def map_error_to_user_message(error_code: Optional[str]) -> str:
    """
    Convert a technical SMTP / provider error code into a human-readable message.

    Args:
        error_code: Raw error code string from the mail provider.

    Returns:
        A user-friendly explanation string.
    """
    if not error_code:
        return DEFAULT_ERROR_MESSAGE
    normalized = error_code.upper().strip()
    for key, message in SMTP_ERROR_MESSAGES.items():
        if key in normalized:
            return message
    return DEFAULT_ERROR_MESSAGE


class NotificationRoutingMiddleware:
    """Middleware for routing and gating notifications based on company settings."""

# NOTE: method names updated from `*_company_settings` to `*_system_settings` to match
# the new schema. The database table and column names are `system_settings`,
# `email_notifications`, and `admin_alerts`.

    def __init__(self):
        """Initialize the notification routing middleware."""
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self._settings_cache: Dict[str, Dict] = {}
        self.log_level = os.getenv("NOTIFICATION_ROUTING_LOG_LEVEL", "info").lower()

    def _fetch_system_settings(self, company_id: str) -> Dict:
        """
        Fetch company settings from database.
        
        Args:
            company_id: UUID of company
            
        Returns:
            Dict with `email_notifications`, `admin_alerts`, `digest_frequency`
        """
        try:
            response = self.supabase.table("system_settings").select(
                "email_notifications, admin_alerts, digest_frequency"
            ).eq("company_id", company_id).single().execute()

            if response.data:
                return {
                    "email_notifications": response.data.get("email_notifications", True),
                    "admin_alerts": response.data.get("admin_alerts", True),
                    "digest_frequency": response.data.get("digest_frequency", "daily")
                }
        except Exception as e:
            logger.warning(f"Could not fetch company settings for {company_id}: {str(e)}")

        # Fail-open: allow notifications if settings unavailable
        return {
            "email_notifications": True,
            "admin_alerts": True,
            "digest_frequency": "daily"
        }

    def get_system_settings(self, company_id: str) -> Dict:
        """
        Get company settings with caching.
        
        Args:
            company_id: UUID of company
            
        Returns:
            Dict with company notification preferences
        """
        if company_id not in self._settings_cache:
            self._settings_cache[company_id] = self._fetch_system_settings(company_id)
        return self._settings_cache[company_id]

    def should_send_email_notification(self, company_id: str, notification_type: NotificationType) -> bool:
        """
        Check if email notification should be sent for this company.
        
        Args:
            company_id: UUID of company
            notification_type: Type of notification to send
            
        Returns:
            True if notification should be sent, False otherwise
        """
        settings = self.get_system_settings(company_id)

        # Gate on global email notifications setting
        if not settings["email_notifications"]:
            self.log_notification_skipped(
                company_id, notification_type, "email_notifications_disabled"
            )
            return False

        # Check digest-specific frequency settings
        if notification_type in [NotificationType.DAILY_DIGEST, NotificationType.WEEKLY_DIGEST]:
            digest_frequency = settings.get("digest_frequency", "daily")
            
            if digest_frequency == "disabled":
                self.log_notification_skipped(
                    company_id, notification_type, "digest_frequency_disabled"
                )
                return False

            if notification_type == NotificationType.WEEKLY_DIGEST and digest_frequency == "daily":
                self.log_notification_skipped(
                    company_id, notification_type, "digest_frequency_mismatch"
                )
                return False

        self.log_notification_sent(company_id, notification_type)
        return True

    def should_send_admin_alert(self, company_id: str) -> bool:
        """
        Check if admin alert/escalation should be sent for this company.
        
        Args:
            company_id: UUID of company
            
        Returns:
            True if alert should be sent, False otherwise
        """
        settings = self.get_system_settings(company_id)

        if not settings["admin_alerts"]:
            self.log_notification_skipped(
                company_id, NotificationType.ADMIN_ALERT, "admin_alerts_disabled"
            )
            return False

        self.log_notification_sent(company_id, NotificationType.ADMIN_ALERT)
        return True

    def should_send_push_notification(self, company_id: str) -> bool:
        """
        Check if push notification should be sent for this company.
        
        Args:
            company_id: UUID of company
            
        Returns:
            True if notification should be sent, False otherwise
        """
        settings = self.get_system_settings(company_id)

        # Push notifications typically gated by email_notifications
        if not settings["email_notifications"]:
            self.log_notification_skipped(
                company_id, NotificationType.PUSH_NOTIFICATION, "notifications_disabled"
            )
            return False

        self.log_notification_sent(company_id, NotificationType.PUSH_NOTIFICATION)
        return True

    # -----------------------------------------------------------------------
    # Delivery status tracking
    # -----------------------------------------------------------------------

    def record_delivery_status(
        self,
        notification_id: str,
        status: EmailDeliveryStatus,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Persist the delivery status for a notification in the database.

        Stores `sent_at` when transitioning to SENT, `delivered_at` when
        transitioning to DELIVERED, and error metadata when FAILED.

        Args:
            notification_id: UUID of the notification record.
            status: New delivery status.
            error_code: Optional raw provider error code (e.g. "SMTP_550").
            error_message: Optional raw provider error message.

        Returns:
            Dict with the stored delivery metadata.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        payload: Dict[str, Any] = {
            "notification_id": notification_id,
            "status": status.value,
            "updated_at": now_iso,
        }

        if status == EmailDeliveryStatus.SENT:
            payload["sent_at"] = now_iso
        elif status == EmailDeliveryStatus.DELIVERED:
            payload["delivered_at"] = now_iso
        elif status == EmailDeliveryStatus.FAILED:
            payload["failed_at"] = now_iso
            payload["error_code"] = error_code or "UNKNOWN"
            payload["error_message"] = error_message or ""
            payload["user_error_message"] = map_error_to_user_message(error_code)

        try:
            # Upsert so a re-delivery attempt updates the existing row.
            self.supabase.table("notification_delivery_status").upsert(
                payload, on_conflict="notification_id"
            ).execute()
            logger.info(
                f"Delivery status recorded | notification={notification_id} | status={status.value}"
            )
        except Exception as e:
            logger.error(
                f"Failed to record delivery status | notification={notification_id} | error={e}"
            )

        return payload

    def get_delivery_status(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve the current delivery status for a notification.

        Args:
            notification_id: UUID of the notification record.

        Returns:
            Dict with delivery metadata, or None if not found.
        """
        try:
            response = (
                self.supabase.table("notification_delivery_status")
                .select("*")
                .eq("notification_id", notification_id)
                .single()
                .execute()
            )
            return response.data or None
        except Exception as e:
            logger.warning(f"Could not fetch delivery status for {notification_id}: {e}")
            return None

    def resend_notification(self, notification_id: str, user_id: str) -> Dict[str, Any]:
        """
        Validate and initiate a resend for a failed notification.

        Checks ownership and that the current status is FAILED before
        attempting re-delivery.  Marks status as PENDING, then delegates
        the actual send to the caller via the returned metadata dict.

        Args:
            notification_id: UUID of the notification to resend.
            user_id: UUID of the requesting user (ownership check).

        Returns:
            Dict with ``{"success": bool, "message": str, "status": str}``.
        """
        try:
            # Ownership + existence check
            notif_res = (
                self.supabase.table("notifications")
                .select("id, user_id, status")
                .eq("id", notification_id)
                .single()
                .execute()
            )
            if not notif_res.data:
                return {"success": False, "message": "Notification not found.", "status": "not_found"}

            notification = notif_res.data
            if notification.get("user_id") != user_id:
                return {"success": False, "message": "Not authorized.", "status": "forbidden"}

            # Fetch delivery status
            delivery = self.get_delivery_status(notification_id)
            current_status = delivery.get("status") if delivery else None

            if current_status != EmailDeliveryStatus.FAILED.value:
                return {
                    "success": False,
                    "message": "Only failed notifications can be resent.",
                    "status": current_status or "unknown",
                }

            # Mark as pending for retry
            self.record_delivery_status(notification_id, EmailDeliveryStatus.PENDING)
            logger.info(f"Resend initiated | notification={notification_id} | user={user_id}")

            return {
                "success": True,
                "message": "Resend initiated. Status will update shortly.",
                "status": EmailDeliveryStatus.PENDING.value,
            }

        except Exception as e:
            logger.error(f"Resend error | notification={notification_id} | error={e}")
            return {"success": False, "message": "An error occurred. Please try again.", "status": "error"}

    # -----------------------------------------------------------------------
    # Logging helpers (unchanged)
    # -----------------------------------------------------------------------

    def log_notification_sent(self, company_id: str, notification_type: NotificationType) -> None:
        """Log that a notification was sent."""
        if self.log_level in ["debug", "info"]:
            logger.info(
                f"Notification sent | company={company_id} | type={notification_type.value} | "
                f"timestamp={datetime.now(timezone.utc).isoformat()}"
            )

    def log_notification_skipped(
        self, company_id: str, notification_type: NotificationType, reason: str
    ) -> None:
        """Log that a notification was skipped."""
        if self.log_level in ["debug", "info", "warning"]:
            logger.warning(
                f"Notification skipped | company={company_id} | type={notification_type.value} | "
                f"reason={reason} | timestamp={datetime.now(timezone.utc).isoformat()}"
            )

    def log_notification_error(
        self, company_id: str, notification_type: NotificationType, error: Exception
    ) -> None:
        """Log notification sending error."""
        logger.error(
            f"Notification error | company={company_id} | type={notification_type.value} | "
            f"error={str(error)} | timestamp={datetime.now(timezone.utc).isoformat()}"
        )

    def invalidate_cache(self, company_id: str) -> None:
        """
        Invalidate cached settings for a company.
        Call this after updating system_settings in DB.
        
        Args:
            company_id: UUID of company
        """
        if company_id in self._settings_cache:
            del self._settings_cache[company_id]
            logger.info(f"Invalidated settings cache for company {company_id}")


# Singleton instance
_instance: Optional[NotificationRoutingMiddleware] = None


def load():
    """Load and return singleton instance of NotificationRoutingMiddleware."""
    global _instance
    if _instance is None:
        _instance = NotificationRoutingMiddleware()
        logger.info("NotificationRoutingMiddleware loaded")
    return _instance


def get_instance() -> Optional[NotificationRoutingMiddleware]:
    """Get the singleton instance if already loaded."""
    return _instance
