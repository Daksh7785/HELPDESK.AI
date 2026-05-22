## 🎯 Feature Description

In enterprise IT environments, understanding exactly *who* modified a ticket, *when* a priority was changed, and *why* status transitioned is critical for security and operations. Furthermore, if a ticket remains unanswered or unassigned for too long, we need a mechanism to automatically log escalation activities.

---

## 🛠️ Requirements & Tech Stack

### 1. Database Schema & Logging Engine (Supabase / PostgreSQL)
* Create an `audit_logs` database table in Supabase.
* Suggested schema:
  * `id` (UUID, primary key)
  * `ticket_id` (UUID, FKey referencing `tickets.id` on delete cascade)
  * `company_id` (UUID, FKey referencing `companies.id`)
  * `performed_by` (UUID, FKey referencing authenticated `profiles.id`)
  * `action` (VARCHAR, e.g. `STATUS_CHANGED`, `PRIORITY_ESCALATED`, `TICKET_ASSIGNED`)
  * `old_value` (TEXT or JSONB)
  * `new_value` (TEXT or JSONB)
  * `created_at` (TIMESTAMPTZ)
* **Auto-Logger Triggers**:
  * Set up database triggers or backend hooks to automatically log entries to the `audit_logs` table whenever `tickets` is updated.

### 2. Frontend React Integration
* Create a glassmorphic **"Audit Log Timeline"** section inside the Ticket Details view (`TicketTracking.jsx` or similar admin detail view).
* Render a chronological history of changes, highlighting critical transitions (e.g. priority escalation) with clear labels and tooltips.

---

## 🚀 Suggested Implementation Steps

1. **Supabase Migration**:
   * Add SQL migration to create `audit_logs` and the audit triggers on the `tickets` table.
2. **Backend API Extension**:
   * Expose `/tickets/{id}/audit_logs` API endpoint returning sorted history.
3. **Frontend Integration**:
   * Add timeline UI components showing change logs dynamically.
   * Add test suites to verify that logs are securely separated per company.

---

## ⚠️ Guidelines for GSSoC '26 Contributors
* **Level**: `level:advanced` 🔴
* **Branch Rule**: All PRs must target the `gssoc` branch, NOT `main`.
* **Parallel Work**: Multiple contributors are welcome to work in parallel. First complete, fully passing PR will be merged!
