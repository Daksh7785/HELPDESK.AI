"""
Enhanced Duplicate Detection Service — Issue #2807
Replaces semantic-only matching with hybrid similarity scoring,
real-time incremental clustering, tenant-specific threshold tuning,
and admin feedback processing.
"""

import uuid
import os
import json
import datetime
from typing import Any, Optional

from sentence_transformers import SentenceTransformer, util

from backend.services.similarity_calculator import (
    compute_hybrid_similarity,
    clamp_threshold,
    apply_feedback_adjustment,
    THRESHOLD_DEFAULT,
    THRESHOLD_MIN,
    THRESHOLD_MAX,
)
from backend.models.duplicate_group import cluster_registry, DuplicateGroup

# ---------------------------------------------------------------------------
# Default similarity threshold (semantic-only fallback)
# ---------------------------------------------------------------------------
SIMILARITY_THRESHOLD = 0.70

# DBSCAN-style parameters for incremental clustering
CLUSTER_MIN_SIMILARITY = 0.78   # minimum hybrid score to join an existing cluster
CLUSTER_LOOKBACK_DAYS  = 30     # only compare against tickets from the last N days


class DuplicateService:
    def __init__(self):
        self.model: Optional[SentenceTransformer] = None
        self._loaded = False
        self._load_failed = False
        # In-memory store: list of (ticket_id, embedding, text, created_at, category)
        self._tickets: list[tuple] = []
        self.storage_file = os.path.join(
            os.path.dirname(__file__), "..", "data", "case_history_cache.json"
        )
        # Per-tenant threshold overrides (persisted in Supabase; cached here)
        self._threshold_cache: dict[str, float] = {}
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)

    # -----------------------------------------------------------------------
    # Lifecycle
    # -----------------------------------------------------------------------
    def is_available(self) -> bool:
        return self._loaded and not self._load_failed

    def load(self):
        """Load the sentence-transformer model and saved tickets."""
        if self._loaded or self._load_failed:
            return

        print("[DuplicateService] Loading model...")
        try:
            model_path = os.environ.get("SENTENCE_TRANSFORMER_MODEL_PATH")
            if model_path and os.path.exists(model_path):
                print(f"[DuplicateService] Loading from local path: {model_path}")
                self.model = SentenceTransformer(model_path)
            else:
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self._loaded = True

            if os.path.exists(self.storage_file):
                print(f"[DuplicateService] Syncing previous ticket history…")
                try:
                    with open(self.storage_file, "r") as f:
                        data = json.load(f)
                        for item in data:
                            text = item["text"]
                            embedding = self.model.encode(text, convert_to_tensor=True)
                            self._tickets.append((
                                item["ticket_id"],
                                embedding,
                                text,
                                item.get("created_at", datetime.datetime.utcnow().isoformat() + "Z"),
                                item.get("category", "Unknown"),
                            ))
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

    # -----------------------------------------------------------------------
    # Persistence
    # -----------------------------------------------------------------------
    def save_to_disk(self, ticket_id: str, text: str, category: str = "Unknown"):
        """Append a new ticket to the JSON storage."""
        data = []
        try:
            os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)
            if os.path.exists(self.storage_file):
                with open(self.storage_file, "r") as f:
                    try:
                        data = json.load(f)
                        if not isinstance(data, list):
                            data = []
                    except Exception:
                        data = []

            data.append({
                "ticket_id":  ticket_id,
                "text":       text,
                "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                "category":   category,
            })
            with open(self.storage_file, "w") as f:
                json.dump(data, f, indent=2)
            print(f"[DuplicateService] Indexed ticket {ticket_id} to case history.")
        except Exception as e:
            print(f"[DuplicateService] Failed to save to disk: {e}")

    # -----------------------------------------------------------------------
    # Core: add ticket + clustering
    # -----------------------------------------------------------------------
    def add_ticket(
        self,
        ticket_id: str,
        text: str,
        category: str = "Unknown",
        company_id: Optional[str] = None,
    ):
        """Add a ticket to the in-memory store, persist to disk, and cluster."""
        self.load()
        if not self.is_available():
            print(f"[DuplicateService] DEGRADED: Skipping embedding for ticket {ticket_id}")
            return
        embedding = self.model.encode(text, convert_to_tensor=True)
        now = datetime.datetime.utcnow().isoformat() + "Z"
        self._tickets.append((ticket_id, embedding, text, now, category))
        self.save_to_disk(ticket_id, text, category)
        # Cluster assignment
        self._assign_to_cluster(ticket_id, embedding, text, category, company_id)

    # -----------------------------------------------------------------------
    # Embedding generation
    # -----------------------------------------------------------------------
    def generate_embedding(self, text: str) -> Optional[list[float]]:
        """Generate a 384-d embedding vector."""
        self.load()
        if not self.is_available():
            return None
        embedding = self.model.encode(text, convert_to_tensor=False, normalize_embeddings=True)
        return [float(v) for v in embedding.tolist()]

    # -----------------------------------------------------------------------
    # Hybrid similarity computation
    # -----------------------------------------------------------------------
    def _hybrid_score(self, embedding_query, stored_embedding, text_query: str, stored_text: str) -> dict:
        """Compute hybrid score combining semantic + keyword + structural."""
        semantic = float(util.cos_sim(embedding_query, stored_embedding).item())
        return compute_hybrid_similarity(semantic, text_query, stored_text)

    # -----------------------------------------------------------------------
    # Incremental DBSCAN-style clustering
    # -----------------------------------------------------------------------
    def _recent_tickets(self, days: int = CLUSTER_LOOKBACK_DAYS) -> list:
        """Return only tickets created within the lookback window."""
        cutoff = (
            datetime.datetime.utcnow() - datetime.timedelta(days=days)
        ).isoformat() + "Z"
        return [t for t in self._tickets if t[3] >= cutoff]

    def _assign_to_cluster(
        self,
        ticket_id: str,
        embedding,
        text: str,
        category: str,
        company_id: Optional[str],
    ):
        """
        Assign a new ticket to an existing cluster or create a new one.
        Uses incremental DBSCAN heuristic: join if hybrid score >= CLUSTER_MIN_SIMILARITY.
        """
        recent = self._recent_tickets()
        best_cluster: Optional[DuplicateGroup] = None
        best_score = 0.0

        for (tid, emb, stored_text, created_at, cat) in recent:
            if tid == ticket_id:
                continue
            scores = self._hybrid_score(embedding, emb, text, stored_text)
            if scores["hybrid_score"] >= CLUSTER_MIN_SIMILARITY:
                # Find which cluster this stored ticket belongs to
                existing_cluster = cluster_registry.get_cluster_for_ticket(tid)
                if existing_cluster and existing_cluster.company_id == company_id:
                    if scores["hybrid_score"] > best_score:
                        best_score = scores["hybrid_score"]
                        best_cluster = existing_cluster
                elif scores["hybrid_score"] > best_score:
                    best_score = scores["hybrid_score"]
                    # We'll create a new cluster pairing this + tid
                    best_cluster = None  # signal to create new

        if best_cluster:
            cluster_registry.add_ticket_to_cluster(
                best_cluster.cluster_id,
                ticket_id,
                best_score,
                semantic_score=best_score,
                keyword_score=0.0,
                structural_score=0.0,
            )
            print(f"[Cluster] Ticket {ticket_id} → cluster {best_cluster.cluster_id} (score={best_score:.3f})")
        else:
            # Check if we found a candidate partner ticket to start a new cluster
            if best_score >= CLUSTER_MIN_SIMILARITY:
                new_group = cluster_registry.create_cluster(
                    primary_ticket=ticket_id,
                    category=category,
                    company_id=company_id,
                )
                new_group.add_member(ticket_id, 1.0)
                print(f"[Cluster] New cluster {new_group.cluster_id} for ticket {ticket_id}")
            # else: ticket is noise / no cluster

    # -----------------------------------------------------------------------
    # Duplicate check (legacy-compatible + hybrid)
    # -----------------------------------------------------------------------
    def _build_result(self, *, is_duplicate: bool, duplicate_ticket_id: Optional[str], similarity: float, scores: Optional[dict] = None) -> dict:
        result = {
            "is_duplicate":          is_duplicate,
            "duplicate_ticket_id":   duplicate_ticket_id,
            "parent_ticket_id":      duplicate_ticket_id,
            "is_potential_duplicate": is_duplicate,
            "similarity":            round(similarity, 4),
        }
        if scores:
            result["similarity_breakdown"] = scores
        return result

    def check_duplicate(self, text: str, threshold: Optional[float] = None) -> dict:
        """
        Check if text is a duplicate using HYBRID similarity against all stored tickets.
        Maintains backward-compatible return shape.
        """
        self.load()
        if not self.is_available():
            print("[DuplicateService] DEGRADED: Duplicate check skipped")
            return {"is_duplicate": False, "duplicate_ticket_id": None, "similarity": 0.0}

        active_threshold = threshold if threshold is not None else SIMILARITY_THRESHOLD
        if not self._tickets:
            return {"is_duplicate": False, "duplicate_ticket_id": None, "similarity": 0.0}

        query_emb = self.model.encode(text, convert_to_tensor=True)
        best_score = 0.0
        best_id    = None
        best_breakdown = None

        for (ticket_id, stored_emb, stored_text, *_) in self._tickets:
            scores = self._hybrid_score(query_emb, stored_emb, text, stored_text)
            h = scores["hybrid_score"]
            if h > best_score:
                best_score = h
                best_id    = ticket_id
                best_breakdown = scores

        is_dup = best_score >= active_threshold
        return self._build_result(
            is_duplicate=is_dup,
            duplicate_ticket_id=best_id if is_dup else None,
            similarity=best_score,
            scores=best_breakdown,
        )

    def find_semantic_duplicate(
        self,
        text: str,
        *,
        threshold: Optional[float] = None,
        company_id: Optional[str] = None,
        supabase_client: Any = None,
        match_count: int = 1,
    ) -> dict:
        """Find best duplicate using Supabase vector search with local hybrid fallback."""
        self.load()
        active_threshold = threshold if threshold is not None else SIMILARITY_THRESHOLD
        embedding = self.generate_embedding(text)

        if embedding and supabase_client and company_id:
            try:
                response = supabase_client.rpc(
                    "match_tickets",
                    {
                        "query_vector":    embedding,
                        "match_threshold": float(active_threshold),
                        "match_count":     match_count,
                        "tenant_company_id": company_id,
                    },
                ).execute()
                rows = response.data or []
                if rows:
                    best = rows[0]
                    # Re-score with hybrid on the stored ticket text
                    semantic_sim = float(best.get("similarity", 0.0))
                    stored_text  = best.get("summary", "")
                    scores = compute_hybrid_similarity(semantic_sim, text, stored_text)
                    hybrid_sim = scores["hybrid_score"]
                    ticket_identifier = best.get("ticket_id") or best.get("id")
                    return self._build_result(
                        is_duplicate=hybrid_sim >= active_threshold,
                        duplicate_ticket_id=str(ticket_identifier) if ticket_identifier else None,
                        similarity=hybrid_sim,
                        scores=scores,
                    )
            except Exception as error:
                print(f"[DuplicateService] Supabase vector search failed, falling back: {error}")

        result = self.check_duplicate(text, threshold=active_threshold)
        result["parent_ticket_id"]      = result.get("duplicate_ticket_id")
        result["is_potential_duplicate"] = result.get("is_duplicate", False)
        return result

    # -----------------------------------------------------------------------
    # Threshold tuning
    # -----------------------------------------------------------------------
    def get_threshold(self, company_id: Optional[str]) -> float:
        if company_id and company_id in self._threshold_cache:
            return self._threshold_cache[company_id]
        return THRESHOLD_DEFAULT

    def update_threshold(self, company_id: str, new_threshold: float) -> float:
        clamped = clamp_threshold(new_threshold)
        self._threshold_cache[company_id] = clamped
        return clamped

    def process_feedback(self, company_id: str, feedback_type: str) -> dict:
        """
        Process admin feedback to auto-tune the threshold.
        feedback_type: "false_positive" | "missed_duplicate"
        """
        current = self.get_threshold(company_id)
        new_val = apply_feedback_adjustment(current, feedback_type)
        self._threshold_cache[company_id] = new_val
        return {
            "feedback_type":    feedback_type,
            "previous_threshold": round(current, 4),
            "new_threshold":    round(new_val, 4),
            "company_id":       company_id,
        }

    # -----------------------------------------------------------------------
    # Cluster query helpers
    # -----------------------------------------------------------------------
    def get_clusters(self, company_id: Optional[str] = None) -> list[dict]:
        return [g.to_dict() for g in cluster_registry.all_clusters(company_id)]

    def get_cluster_analytics(self, company_id: Optional[str] = None) -> dict:
        return cluster_registry.analytics_summary(company_id)

    def set_primary_ticket(self, cluster_id: str, ticket_id: str) -> Optional[dict]:
        group = cluster_registry.get_cluster(cluster_id)
        if not group:
            return None
        group.set_primary(ticket_id)
        return group.to_dict()
