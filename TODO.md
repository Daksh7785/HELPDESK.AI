# TODO - Critical bug fixes (HELPDESK.AI)

- [ ] Fix mutable default values in Pydantic models in `backend/main.py` by switching to `Field(default_factory=...)`.
- [ ] Refactor `/ai/analyze_ticket` so OCR-enriched text is actually used (remove dead code / ensure consistent pipeline with `analyze_only`).
- [ ] Run a quick sanity check (import/startup) to ensure FastAPI still boots.

