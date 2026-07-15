"""
Anomaly Detection Service — Decentralized anomaly detection for enterprise helpdesk.

Runs as a background async loop scanning ticket data for statistical anomalies:
  - Volume spikes (Z-score on hourly ticket counts)
  - Category distribution drift (Chi-squared vs 7-day baseline)
  - Priority escalation surges (proportion test on critical/high tickets)
  - Resolution time degradation (mean comparison vs baseline)
  - Repeat offender detection (per-user frequency in 24h window)

Each detected anomaly is persisted to the `anomaly_events` table for admin review.
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args, **_kwargs):
        return False

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[AnomalyDetectionService] %(asctime)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
ANOMALY_TYPES = [
    "volume_spike",
    "category_drift",
    "priority_escalation",
    "resolution_degradation",
    "repeat_offender",
]

SEVERITY_LEVELS = ["low", "medium", "high", "critical"]

# Z-score thresholds for volume spike detection
VOLUME_SPIKE_THRESHOLDS = {
    "low": 1.5,
    "medium": 2.0,
    "high": 2.5,
    "critical": 3.0,
}

# Repeat offender: tickets per user per 24h that trigger an anomaly
REPEAT_OFFENDER_THRESHOLD = 5

# Resolution time: multiplier over baseline mean to flag degradation
RESOLUTION_DEGRADATION_MULTIPLIER = 1.5

# Priority escalation: proportion increase threshold
PRIORITY_ESCALATION_THRESHOLD = 0.15  # 15% increase in critical/high tickets


# ---------------------------------------------------------------------------
# Pure detection functions (no DB dependency, fully testable)
# ---------------------------------------------------------------------------

def detect_volume_spike(
    hourly_counts: list[int],
    current_count: int,
) -> Optional[dict]:
    """Detect if current hour ticket count is a statistical outlier.

    Args:
        hourly_counts: Historical hourly ticket counts (at least 6 values).
        current_count: Ticket count for the current hour.

    Returns:
        Anomaly dict or None if no anomaly detected.
    """
    if len(hourly_counts) < 6:
        return None

    mean = sum(hourly_counts) / len(hourly_counts)
    variance = sum((x - mean) ** 2 for x in hourly_counts) / len(hourly_counts)
    std_dev = math.sqrt(variance) if variance > 0 else 0

    if std_dev == 0:
        # All counts are identical; flag only if current deviates at all
        if current_count > mean:
            z_score = 3.0  # Treat as critical since any deviation is unusual
        else:
            return None
    else:
        z_score = (current_count - mean) / std_dev

    if z_score < VOLUME_SPIKE_THRESHOLDS["low"]:
        return None

    # Map z-score to severity
    severity = "low"
    for sev in ["critical", "high", "medium", "low"]:
        if z_score >= VOLUME_SPIKE_THRESHOLDS[sev]:
            severity = sev
            break

    deviation_pct = ((current_count - mean) / mean * 100) if mean > 0 else 0

    return {
        "anomaly_type": "volume_spike",
        "severity": severity,
        "title": f"Ticket Volume Spike Detected ({severity.upper()})",
        "description": (
            f"Current hour received {current_count} tickets, "
            f"compared to a rolling average of {mean:.1f} "
            f"(z-score: {z_score:.2f})."
        ),
        "metric_value": float(current_count),
        "baseline_value": round(mean, 2),
        "deviation_pct": round(deviation_pct, 2),
        "recommended_action": (
            "Investigate if there is an ongoing incident or outage "
            "causing elevated ticket volume."
        ),
        "metadata": {
            "z_score": round(z_score, 2),
            "std_dev": round(std_dev, 2),
            "window_size": len(hourly_counts),
        },
    }


def detect_category_drift(
    baseline_distribution: dict[str, int],
    current_distribution: dict[str, int],
) -> Optional[dict]:
    """Detect significant shift in ticket category distribution.

    Uses a simplified chi-squared-like divergence metric.

    Args:
        baseline_distribution: Category counts from baseline period.
        current_distribution: Category counts from recent period.

    Returns:
        Anomaly dict or None.
    """
    if not baseline_distribution or not current_distribution:
        return None

    baseline_total = sum(baseline_distribution.values())
    current_total = sum(current_distribution.values())

    if baseline_total == 0 or current_total == 0:
        return None

    # Compute chi-squared-like statistic
    all_categories = set(baseline_distribution.keys()) | set(current_distribution.keys())
    chi_sq = 0.0
    drifted_categories = []

    for cat in all_categories:
        expected_proportion = baseline_distribution.get(cat, 0) / baseline_total
        observed_proportion = current_distribution.get(cat, 0) / current_total

        if expected_proportion > 0:
            contribution = (
                (observed_proportion - expected_proportion) ** 2
            ) / expected_proportion
            chi_sq += contribution

            drift_pct = (
                (observed_proportion - expected_proportion) / expected_proportion * 100
            )
            if abs(drift_pct) > 30:  # 30% drift threshold per category
                drifted_categories.append(
                    {"category": cat, "drift_pct": round(drift_pct, 1)}
                )

    if not drifted_categories:
        return None

    # Map chi-squared to severity
    if chi_sq >= 0.5:
        severity = "critical"
    elif chi_sq >= 0.3:
        severity = "high"
    elif chi_sq >= 0.15:
        severity = "medium"
    else:
        severity = "low"

    top_drift = max(drifted_categories, key=lambda x: abs(x["drift_pct"]))

    return {
        "anomaly_type": "category_drift",
        "severity": severity,
        "title": "Category Distribution Drift Detected",
        "description": (
            f"Significant shift in ticket categories detected. "
            f"'{top_drift['category']}' drifted by {top_drift['drift_pct']:+.1f}% "
            f"from the 7-day baseline."
        ),
        "metric_value": round(chi_sq, 4),
        "baseline_value": 0.0,
        "deviation_pct": round(top_drift["drift_pct"], 2),
        "affected_entity": top_drift["category"],
        "recommended_action": (
            f"Review recent tickets in the '{top_drift['category']}' category "
            f"for emerging patterns or incidents."
        ),
        "metadata": {
            "chi_squared": round(chi_sq, 4),
            "drifted_categories": drifted_categories,
            "baseline_total": baseline_total,
            "current_total": current_total,
        },
    }


def detect_priority_escalation(
    baseline_high_ratio: float,
    current_high_ratio: float,
    current_total: int,
) -> Optional[dict]:
    """Detect surge in critical/high priority tickets.

    Args:
        baseline_high_ratio: Proportion of critical+high tickets in baseline.
        current_high_ratio: Proportion in current window.
        current_total: Total tickets in current window.

    Returns:
        Anomaly dict or None.
    """
    if current_total < 5:
        return None

    increase = current_high_ratio - baseline_high_ratio

    if increase < PRIORITY_ESCALATION_THRESHOLD:
        return None

    if increase >= 0.40:
        severity = "critical"
    elif increase >= 0.30:
        severity = "high"
    elif increase >= 0.20:
        severity = "medium"
    else:
        severity = "low"

    deviation_pct = (
        (increase / baseline_high_ratio * 100) if baseline_high_ratio > 0 else 100
    )

    return {
        "anomaly_type": "priority_escalation",
        "severity": severity,
        "title": "Priority Escalation Surge Detected",
        "description": (
            f"Critical/High priority tickets now represent "
            f"{current_high_ratio:.0%} of volume, "
            f"up from baseline of {baseline_high_ratio:.0%} "
            f"(+{increase:.0%} increase)."
        ),
        "metric_value": round(current_high_ratio, 4),
        "baseline_value": round(baseline_high_ratio, 4),
        "deviation_pct": round(deviation_pct, 2),
        "recommended_action": (
            "Triage the recent critical/high tickets to determine if "
            "they are related to a common root cause."
        ),
        "metadata": {
            "increase": round(increase, 4),
            "current_total": current_total,
        },
    }


def detect_resolution_degradation(
    baseline_avg_hours: float,
    current_avg_hours: float,
    sample_size: int,
) -> Optional[dict]:
    """Detect degradation in average ticket resolution time.

    Args:
        baseline_avg_hours: Average resolution hours in baseline period.
        current_avg_hours: Average resolution hours in current period.
        sample_size: Number of resolved tickets in current period.

    Returns:
        Anomaly dict or None.
    """
    if sample_size < 3 or baseline_avg_hours <= 0:
        return None

    multiplier = current_avg_hours / baseline_avg_hours

    if multiplier < RESOLUTION_DEGRADATION_MULTIPLIER:
        return None

    deviation_pct = (multiplier - 1) * 100

    if multiplier >= 3.0:
        severity = "critical"
    elif multiplier >= 2.5:
        severity = "high"
    elif multiplier >= 2.0:
        severity = "medium"
    else:
        severity = "low"

    return {
        "anomaly_type": "resolution_degradation",
        "severity": severity,
        "title": "Resolution Time Degradation Detected",
        "description": (
            f"Average resolution time is {current_avg_hours:.1f}h, "
            f"which is {multiplier:.1f}x the baseline of {baseline_avg_hours:.1f}h."
        ),
        "metric_value": round(current_avg_hours, 2),
        "baseline_value": round(baseline_avg_hours, 2),
        "deviation_pct": round(deviation_pct, 2),
        "recommended_action": (
            "Review team workload and check for blocking issues "
            "that may be slowing down resolution times."
        ),
        "metadata": {
            "multiplier": round(multiplier, 2),
            "sample_size": sample_size,
        },
    }


def detect_repeat_offenders(
    user_ticket_counts: dict[str, int],
    threshold: int = REPEAT_OFFENDER_THRESHOLD,
) -> list[dict]:
    """Detect users submitting unusually high ticket volumes.

    Args:
        user_ticket_counts: Mapping of user_id to ticket count in 24h window.
        threshold: Minimum tickets to flag a user.

    Returns:
        List of anomaly dicts (may be empty).
    """
    anomalies = []

    for user_id, count in user_ticket_counts.items():
        if count < threshold:
            continue

        if count >= threshold * 3:
            severity = "high"
        elif count >= threshold * 2:
            severity = "medium"
        else:
            severity = "low"

        anomalies.append({
            "anomaly_type": "repeat_offender",
            "severity": severity,
            "title": f"Repeat Ticket Submitter Detected",
            "description": (
                f"User submitted {count} tickets in the last 24 hours "
                f"(threshold: {threshold})."
            ),
            "metric_value": float(count),
            "baseline_value": float(threshold),
            "deviation_pct": round((count - threshold) / threshold * 100, 2),
            "affected_entity": user_id,
            "recommended_action": (
                "Review the user's recent tickets for potential abuse, "
                "duplicate submissions, or a genuine recurring issue."
            ),
            "metadata": {
                "threshold": threshold,
                "ticket_count": count,
            },
        })

    return anomalies


# ---------------------------------------------------------------------------
# Service class — orchestrates detection and persistence
# ---------------------------------------------------------------------------

class AnomalyDetectionService:
    """Background service that scans ticket data for anomalies.

    Follows the same architectural pattern as SlaEscalationService.
    """

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self._enabled = True

    def is_available(self) -> bool:
        return self.supabase is not None

    def _fetch_hourly_counts(self, company_id: str, hours: int = 24) -> list[int]:
        """Fetch ticket counts per hour for the last N hours."""
        if not self.supabase:
            return []

        try:
            now = datetime.now(timezone.utc)
            start = now - timedelta(hours=hours)

            res = (
                self.supabase.table("tickets")
                .select("created_at")
                .eq("company_id", company_id)
                .gte("created_at", start.isoformat())
                .execute()
            )

            if not res.data:
                return []

            # Bucket by hour
            counts_by_hour: dict[int, int] = {}
            for row in res.data:
                try:
                    dt = datetime.fromisoformat(
                        str(row["created_at"]).replace("Z", "+00:00")
                    )
                    hour_key = int((now - dt).total_seconds() // 3600)
                    counts_by_hour[hour_key] = counts_by_hour.get(hour_key, 0) + 1
                except (ValueError, KeyError):
                    continue

            # Fill missing hours with 0
            return [counts_by_hour.get(h, 0) for h in range(hours)]

        except Exception as e:
            logger.warning(f"Failed to fetch hourly counts: {e}")
            return []

    def _fetch_category_distributions(
        self, company_id: str
    ) -> tuple[dict[str, int], dict[str, int]]:
        """Fetch category distributions for baseline (7d) and current (24h)."""
        if not self.supabase:
            return {}, {}

        try:
            now = datetime.now(timezone.utc)
            baseline_start = now - timedelta(days=7)
            current_start = now - timedelta(hours=24)

            # Baseline: last 7 days
            baseline_res = (
                self.supabase.table("tickets")
                .select("category")
                .eq("company_id", company_id)
                .gte("created_at", baseline_start.isoformat())
                .lt("created_at", current_start.isoformat())
                .execute()
            )

            # Current: last 24h
            current_res = (
                self.supabase.table("tickets")
                .select("category")
                .eq("company_id", company_id)
                .gte("created_at", current_start.isoformat())
                .execute()
            )

            baseline = Counter(
                row.get("category", "unknown") for row in (baseline_res.data or [])
            )
            current = Counter(
                row.get("category", "unknown") for row in (current_res.data or [])
            )

            return dict(baseline), dict(current)

        except Exception as e:
            logger.warning(f"Failed to fetch category distributions: {e}")
            return {}, {}

    def _fetch_priority_ratios(
        self, company_id: str
    ) -> tuple[float, float, int]:
        """Fetch ratio of critical/high tickets for baseline vs current."""
        if not self.supabase:
            return 0.0, 0.0, 0

        try:
            now = datetime.now(timezone.utc)
            baseline_start = now - timedelta(days=7)
            current_start = now - timedelta(hours=24)

            baseline_res = (
                self.supabase.table("tickets")
                .select("priority")
                .eq("company_id", company_id)
                .gte("created_at", baseline_start.isoformat())
                .lt("created_at", current_start.isoformat())
                .execute()
            )

            current_res = (
                self.supabase.table("tickets")
                .select("priority")
                .eq("company_id", company_id)
                .gte("created_at", current_start.isoformat())
                .execute()
            )

            def high_ratio(data):
                if not data:
                    return 0.0
                high_count = sum(
                    1 for row in data
                    if str(row.get("priority", "")).lower() in ("critical", "high")
                )
                return high_count / len(data) if data else 0.0

            b_ratio = high_ratio(baseline_res.data)
            c_ratio = high_ratio(current_res.data)
            c_total = len(current_res.data or [])

            return b_ratio, c_ratio, c_total

        except Exception as e:
            logger.warning(f"Failed to fetch priority ratios: {e}")
            return 0.0, 0.0, 0

    def _fetch_resolution_times(
        self, company_id: str
    ) -> tuple[float, float, int]:
        """Fetch average resolution times for baseline vs current."""
        if not self.supabase:
            return 0.0, 0.0, 0

        try:
            now = datetime.now(timezone.utc)
            baseline_start = now - timedelta(days=7)
            current_start = now - timedelta(hours=48)

            # Fetch resolved tickets with timestamps
            baseline_res = (
                self.supabase.table("tickets")
                .select("created_at, updated_at")
                .eq("company_id", company_id)
                .in_("status", ["resolved", "closed", "auto-resolved"])
                .gte("created_at", baseline_start.isoformat())
                .lt("created_at", current_start.isoformat())
                .execute()
            )

            current_res = (
                self.supabase.table("tickets")
                .select("created_at, updated_at")
                .eq("company_id", company_id)
                .in_("status", ["resolved", "closed", "auto-resolved"])
                .gte("created_at", current_start.isoformat())
                .execute()
            )

            def avg_resolution_hours(data):
                if not data:
                    return 0.0
                hours_list = []
                for row in data:
                    try:
                        created = datetime.fromisoformat(
                            str(row["created_at"]).replace("Z", "+00:00")
                        )
                        updated = datetime.fromisoformat(
                            str(row["updated_at"]).replace("Z", "+00:00")
                        )
                        diff = (updated - created).total_seconds() / 3600
                        if diff > 0:
                            hours_list.append(diff)
                    except (ValueError, KeyError, TypeError):
                        continue
                return sum(hours_list) / len(hours_list) if hours_list else 0.0

            b_avg = avg_resolution_hours(baseline_res.data)
            c_avg = avg_resolution_hours(current_res.data)
            c_size = len(current_res.data or [])

            return b_avg, c_avg, c_size

        except Exception as e:
            logger.warning(f"Failed to fetch resolution times: {e}")
            return 0.0, 0.0, 0

    def _fetch_user_ticket_counts(self, company_id: str) -> dict[str, int]:
        """Fetch per-user ticket counts in the last 24 hours."""
        if not self.supabase:
            return {}

        try:
            now = datetime.now(timezone.utc)
            start = now - timedelta(hours=24)

            res = (
                self.supabase.table("tickets")
                .select("user_id")
                .eq("company_id", company_id)
                .gte("created_at", start.isoformat())
                .execute()
            )

            if not res.data:
                return {}

            counts: dict[str, int] = {}
            for row in res.data:
                uid = row.get("user_id")
                if uid:
                    counts[uid] = counts.get(uid, 0) + 1
            return counts

        except Exception as e:
            logger.warning(f"Failed to fetch user ticket counts: {e}")
            return {}

    def _save_anomaly(self, company_id: str, anomaly: dict) -> bool:
        """Persist a detected anomaly to the database."""
        if not self.supabase:
            return False

        try:
            record = {
                "company_id": company_id,
                "anomaly_type": anomaly["anomaly_type"],
                "severity": anomaly["severity"],
                "title": anomaly["title"],
                "description": anomaly["description"],
                "metric_value": anomaly.get("metric_value"),
                "baseline_value": anomaly.get("baseline_value"),
                "deviation_pct": anomaly.get("deviation_pct"),
                "affected_entity": anomaly.get("affected_entity"),
                "recommended_action": anomaly.get("recommended_action"),
                "metadata": anomaly.get("metadata", {}),
            }

            self.supabase.table("anomaly_events").insert(record).execute()
            return True

        except Exception as e:
            logger.error(f"Failed to save anomaly: {e}")
            return False

    def _is_duplicate_anomaly(self, company_id: str, anomaly: dict) -> bool:
        """Check if a similar anomaly was already detected in the last hour."""
        if not self.supabase:
            return False

        try:
            one_hour_ago = (
                datetime.now(timezone.utc) - timedelta(hours=1)
            ).isoformat()

            res = (
                self.supabase.table("anomaly_events")
                .select("id")
                .eq("company_id", company_id)
                .eq("anomaly_type", anomaly["anomaly_type"])
                .gte("detected_at", one_hour_ago)
                .limit(1)
                .execute()
            )

            return bool(res.data)

        except Exception:
            return False

    async def run_detection_cycle(self, company_id: str) -> list[dict]:
        """Run all anomaly detectors for a given company.

        Returns list of detected anomalies.
        """
        detected = []

        # 1. Volume spike detection
        try:
            hourly_counts = self._fetch_hourly_counts(company_id)
            if len(hourly_counts) >= 7:
                current = hourly_counts[0]
                historical = hourly_counts[1:]
                result = detect_volume_spike(historical, current)
                if result:
                    detected.append(result)
        except Exception as e:
            logger.warning(f"Volume spike detection failed: {e}")

        # 2. Category drift detection
        try:
            baseline_dist, current_dist = self._fetch_category_distributions(company_id)
            result = detect_category_drift(baseline_dist, current_dist)
            if result:
                detected.append(result)
        except Exception as e:
            logger.warning(f"Category drift detection failed: {e}")

        # 3. Priority escalation detection
        try:
            b_ratio, c_ratio, c_total = self._fetch_priority_ratios(company_id)
            result = detect_priority_escalation(b_ratio, c_ratio, c_total)
            if result:
                detected.append(result)
        except Exception as e:
            logger.warning(f"Priority escalation detection failed: {e}")

        # 4. Resolution degradation detection
        try:
            b_avg, c_avg, c_size = self._fetch_resolution_times(company_id)
            result = detect_resolution_degradation(b_avg, c_avg, c_size)
            if result:
                detected.append(result)
        except Exception as e:
            logger.warning(f"Resolution degradation detection failed: {e}")

        # 5. Repeat offender detection
        try:
            user_counts = self._fetch_user_ticket_counts(company_id)
            results = detect_repeat_offenders(user_counts)
            detected.extend(results)
        except Exception as e:
            logger.warning(f"Repeat offender detection failed: {e}")

        # Persist non-duplicate anomalies
        saved_count = 0
        for anomaly in detected:
            if not self._is_duplicate_anomaly(company_id, anomaly):
                if self._save_anomaly(company_id, anomaly):
                    saved_count += 1

        if saved_count > 0:
            logger.info(
                f"Detected {len(detected)} anomalies for company {company_id}, "
                f"saved {saved_count} new."
            )

        return detected


# ---------------------------------------------------------------------------
# Background loop runner
# ---------------------------------------------------------------------------

async def run_anomaly_detection_loop(
    service: AnomalyDetectionService,
    interval_seconds: int = 300,
):
    """Run anomaly detection on a recurring interval for all companies.

    Same pattern as ``run_sla_escalation_loop`` in sla_service.py.
    """
    logger.info(f"Anomaly detection loop started (interval: {interval_seconds}s)")

    while True:
        try:
            if service.supabase:
                # Fetch all companies that have anomaly detection enabled
                try:
                    settings_res = (
                        service.supabase.table("system_settings")
                        .select("company_id")
                        .eq("anomaly_detection_enabled", True)
                        .execute()
                    )
                    company_ids = [
                        row["company_id"] for row in (settings_res.data or [])
                    ]
                except Exception:
                    # Fallback: run for all companies
                    companies_res = (
                        service.supabase.table("companies")
                        .select("id")
                        .execute()
                    )
                    company_ids = [
                        row["id"] for row in (companies_res.data or [])
                    ]

                for cid in company_ids:
                    try:
                        await service.run_detection_cycle(cid)
                    except Exception as e:
                        logger.error(
                            f"Anomaly detection failed for company {cid}: {e}"
                        )

        except Exception as e:
            logger.error(f"Anomaly detection loop error: {e}")

        await asyncio.sleep(interval_seconds)
