## 🏆 Critical Bounty Description

We are launching a **Critical Bounty Task** to implement a fully AI-driven duplicate ticket detection engine. In high-volume enterprise environments, users often submit duplicate reports for the same incident (e.g. "WiFi is down" and "Can't connect to office internet"). 

To optimize operations, we need a semantic analysis pipeline that flags duplicate tickets automatically using text embeddings and cosine similarity.

---

## 🛠️ Requirements & Tech Stack

### 1. Vector Search & Semantic Similarity (FastAPI & Supabase Vector)
* **Embeddings**: Generate dense 384-dimensional text vectors using a SentenceTransformer model (e.g. `all-MiniLM-L6-v2`) inside the ticket creation stream.
* **Vector Database Setup**:
  * Enable the `vector` extension in Supabase (`pgvector`).
  * Add a `description_vector` column to the `tickets` table of type `vector(384)`.
* **Cosine Similarity Query**:
  * Create a Postgres RPC function `match_tickets(query_vector vector(384), match_threshold float, match_count int, tenant_company_id uuid)` that returns matching tickets belonging strictly to the same company, sorted by cosine distance (`<=>` operator).

### 2. FastAPI Pipeline & Real-Time Alerting
* Integrate duplicate verification inside the ticket creation flow (`/tickets/save` and `/ai/analyze_ticket`).
* If a similar ticket exists with similarity score > `duplicate_sensitivity` (fetched dynamically from `system_settings`), flag the incoming ticket as `is_potential_duplicate: true` and link the `parent_ticket_id`.

### 3. Frontend UI Warning Banner
* Display a beautiful, animated warning card on the ticket creation confirmation screen informing the employee: *"A similar issue was recently reported by your teammate. Would you like to subscribe to updates on the existing ticket instead of creating a duplicate?"*

---

## 🚀 Suggested Implementation Steps

1. **Supabase Migration**:
   * Enable `vector` extension, add column, and create similarity search RPC function.
2. **Backend API Logic**:
   * Add text embedding generation in `/tickets/save`.
   * Call `rpc("match_tickets")` to scan for duplicates.
3. **Frontend Integration**:
   * Update forms to display duplicate warning cards with clickable link to parent ticket.
   * Verify compile:
     ```powershell
     npm run build
     ```

---

## ⚠️ Guidelines for GSSoC '26 Bounty Hunt
* **Level**: `level:critical` 🔴 (Critical S-Tier Bounty!)
* **Branch Rule**: All PRs must target the `gssoc` branch, NOT `main`.
* **Parallel Work**: Multiple contributors are welcome to work in parallel. First complete, fully passing PR will be merged!
