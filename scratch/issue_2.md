## 🎯 Feature Description

In our ticketing system, support agents and users frequently query hundreds or thousands of tickets across multiple companies. To maintain security, high performance, and rapid search, we need to optimize our Supabase PostgreSQL indexes and add Full-Text Search (FTS) capabilities.

---

## 🛠️ Requirements & Tech Stack

### 1. Database Schema & Indexing (Supabase / Postgres SQL)
* Optimize indexing on multi-tenant foreign keys:
  * Ensure the `tickets` table has a composite index on `(company_id, created_at)` to enable extremely fast pagination and isolation checks.
  * Create optimized indexes on `priority`, `status`, and `category` fields to speed up admin analytics.
* **Security Checks (Row Level Security - RLS)**:
  * Verify and optimize Supabase RLS policies to guarantee that users can search and view *only* tickets belonging to their authenticated `company_id`.

### 2. Postgres Full-Text Search Integration
* Add a Postgres full-text search index (`gin` index on `to_tsvector`) combining `title` and `description` of support tickets.
* Expose an optimized `/tickets/search` API endpoint in the FastAPI backend which utilizes the Supabase python client's full-text search capability (`.search()` or `.textSearch()`).
* Ensure search queries are filtered strictly by `company_id` first to maintain tenant safety!

---

## 🚀 Suggested Implementation Steps

1. **Supabase Schema Migration**:
   * Create a new migration file under `supabase/migrations/` containing:
     * Composite indices for tenant queries.
     * `gin` index for Full-Text Search (`english` language vector fallback).
2. **Backend API Integration**:
   * Implement the search route in `backend/main.py`.
   * Add test queries to verify index usage and query performance.
3. **Frontend UI Search Field**:
   * Expose a debounced global search bar in the user and admin dashboard to trigger the new `/tickets/search` endpoint cleanly.

---

## ⚠️ Guidelines for GSSoC '26 Contributors
* **Level**: `level:advanced` 🔴
* **Branch Rule**: All PRs must target the `gssoc` branch, NOT `main`.
* **Parallel Work**: Multiple contributors are welcome to work in parallel. First complete, fully passing PR will be merged!
