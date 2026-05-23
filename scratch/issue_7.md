## 🏆 Critical Bounty Description

Service Level Agreements (SLAs) are the cornerstone of enterprise customer and IT support. If a critical ticket is ignored or unresolved for too long, it causes business disruptions.

We are launching a **Critical Bounty Task** to implement a robust, fully automated SLA Breach & Multi-Channel Escalation Engine. This requires building an active background worker or cron checker that scans for breaches and sends notifications automatically.

---

## 🛠️ Requirements & Tech Stack

### 1. SLA Rules & Configurations
* Extend the ticketing schema to support SLA metrics:
  * `sla_breach_at` (TIMESTAMPTZ, required on ticket save, representing calculated target deadline).
  * `sla_status` (VARCHAR: `ACTIVE`, `WARNING`, `BREACHED`).
  * `escalation_level` (INTEGER, default 0).
* Define SLA response/resolution deadlines based on ticket priority:
  * `CRITICAL`: 1 hour response / 4 hours resolution.
  * `HIGH`: 4 hours response / 12 hours resolution.
  * `MEDIUM`: 8 hours response / 24 hours resolution.
  * `LOW`: 24 hours response / 72 hours resolution.

### 2. Automated Background Escalation Cron (FastAPI & PostgreSQL)
* Set up a background worker task (using FastAPI `BackgroundTasks`, `APScheduler`, or a serverless cron job) that runs every 5 minutes:
  * Query all active tickets whose `sla_breach_at` is past the current time and status is not `Resolved`/`Closed`.
  * Update ticket status to `sla_status = 'BREACHED'`.
  * Increment `escalation_level` and trigger multi-channel escalation notifications (e.g. log critical alerts, prepare emails, or push to Slack/Discord webhooks).
  * Automatically log the escalation in `audit_logs`.

### 3. Frontend SLA Dashboard Widgets
* Create a dedicated **"SLA Compliance"** widgets board inside the Admin Dashboard:
  * Render an interactive countdown timer showing hours/minutes left before SLA breach for critical tickets.
  * Draw visual indicators (e.g., green/yellow/red circles) representing active SLA status.

---

## 🚀 Suggested Implementation Steps

1. **Database Migration**:
   * Add SLA status columns to the `tickets` table.
2. **Background Cron Worker**:
   * Create `backend/services/sla_service.py` to handle SLA validation and background checks.
   * Register scheduler inside FastAPI startup events.
3. **Frontend Integration**:
   * Add warning countdown timers to `TicketTracking.jsx` and the admin analytics panels.
   * Confirm everything compiles:
     ```powershell
     npm run build
     ```

---

## ⚠️ Guidelines for GSSoC '26 Bounty Hunt
* **Level**: `level:critical` 🔴 (Critical S-Tier Bounty!)
* **Branch Rule**: All PRs must target the `gssoc` branch, NOT `main`.
* **Parallel Work**: Multiple contributors are welcome to work in parallel. First complete, fully passing PR will be merged!
