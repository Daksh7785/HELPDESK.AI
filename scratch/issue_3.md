## 🎯 Feature Description

Currently, support agents must manually refresh their dashboard to see new incoming tickets, state updates, or assignee changes. To provide a modern, enterprise-grade ticketing experience, we want to integrate real-time reactive streams so updates flash instantly on the agent dashboard without manual reloads.

---

## 🛠️ Requirements & Tech Stack

### 1. Database Realtime Configuration (Supabase)
* Enable the `supabase_realtime` publication channel for the `tickets` table in the database schema.
* Restrict subscription replication to listen strictly for updates matching the agent's associated `company_id`.

### 2. Frontend React Integration
* Utilize the Supabase JS Client `.channel()` subscription API inside your React state manager or a custom hook (`useTicketsRealtime.js`).
* Listen for `INSERT`, `UPDATE`, and `DELETE` events:
  * On `INSERT`: Append the new ticket to the local Zustand list if it matches the current filter settings.
  * On `UPDATE`: Instantly patch the corresponding ticket in the list (e.g. status change from `Open` to `In Progress`).
  * On `DELETE`: Filter out the removed ticket cleanly with a smooth exit transition.
* Expose real-time reactive counts/badges in the sidebar navigation.

---

## 🚀 Suggested Implementation Steps

1. **Supabase Replication Migration**:
   * Add database SQL migration enabling realtime publication on the `tickets` table.
2. **Implement React Custom Hook**:
   * Create `Frontend/src/hooks/useTicketsRealtime.js` to handle subscription channel lifetime (subscribe on mount, unsubscribe/clean up on unmount).
3. **Connect to Zustand Store**:
   * Trigger state updates inside `useTicketStore` dynamically upon receiving database events.
4. **Visual Indicators**:
   * Add brief, subtle highlight animations (e.g., flash of brand color) on rows that receive real-time updates to alert agents.

---

## ⚠️ Guidelines for GSSoC '26 Contributors
* **Level**: `level:advanced` 🔴
* **Branch Rule**: All PRs must target the `gssoc` branch, NOT `main`.
* **Parallel Work**: Multiple contributors are welcome to work in parallel. First complete, fully passing PR will be merged!
