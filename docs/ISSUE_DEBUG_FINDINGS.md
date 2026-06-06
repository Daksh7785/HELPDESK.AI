# Issue: frontend manifest is invalid JSON and backend package import fails in smoke tests

## Summary

The current checkout has two reproducible breakpoints that block normal contributor workflows:

1. `Frontend/package.json` is not valid JSON, so `npm` tooling cannot reliably parse the frontend manifest.
2. `backend.main` fails to import under package-style loading because it uses
   top-level imports for local modules before adjusting `sys.path`.

These failures are enough to block frontend build/test commands through `npm` and
cause backend smoke tests to fail before API setup is complete.

## Environment

- OS: Windows
- Date checked: 2026-06-06
- Python: 3.11
- Node: 24.12.0
- Repo path: `C:\Users\win\OneDrive\Documents\GitHub\HELPDESK.AI`

## Reproduction

### 1. Frontend manifest parse failure

Run:

```powershell
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('Frontend/package.json','utf8')); console.log('ok')"
```

Actual result:

```text
SyntaxError: Expected ',' or '}' after property value in JSON at position 2637 (line 83 column 5)
```

Relevant source:

- `Frontend/package.json:12` and `Frontend/package.json:15` both define `test`
- `Frontend/package.json:82-83` are missing a comma before a second `cypress` entry

### 2. Backend smoke test import failure

Run:

```powershell
pytest backend\tests\test_import_smoke.py -q
```

Actual result:

```text
ModuleNotFoundError: No module named 'pii_redaction'
```

The failure is triggered while importing `backend.main`.

Relevant source:

- `backend/main.py:30` imports `from encryption import ...`
- `backend/main.py:31` imports `from pii_redaction import ...`
- `backend/main.py:115-118` modifies `sys.path`, but that happens after the failing imports

Validation:

```powershell
python -c "import importlib.util; print(importlib.util.find_spec('backend.pii_redaction')); print(importlib.util.find_spec('pii_redaction')); print(importlib.util.find_spec('backend.encryption')); print(importlib.util.find_spec('encryption'))"
```

Observed:

- `backend.pii_redaction` resolves
- `pii_redaction` does not resolve
- `backend.encryption` resolves
- `encryption` does not resolve

## Expected Behavior

- `Frontend/package.json` should parse as valid JSON, with unique keys and valid commas.
- `backend.main` should import successfully when loaded as `backend.main` from tests or other package consumers.
- `backend/tests/test_import_smoke.py` should reach its actual assertions instead of failing during module import.

## Actual Impact

- Frontend contributors cannot trust `npm run ...` commands because the manifest is malformed.
- Backend smoke tests fail immediately, so CI/local verification does not reach service import checks.
- Any tooling that imports the backend as a package, including tests and generated scripts, breaks before runtime.

## Probable Root Cause

### Frontend

`Frontend/package.json` appears to contain a bad manual merge/edit:

- duplicate `test` script keys
- duplicate `cypress` dependency keys
- missing comma between `vitest` and the second `cypress`

### Backend

`backend.main` mixes package imports and top-level local imports. When imported
as `backend.main`, Python resolves `backend.encryption` and `backend.pii_redaction`,
but the current code asks for top-level `encryption` and `pii_redaction`,
which do not exist on `sys.path` at import time.

## Suggested Fix

### Frontend

- Remove duplicate keys from `Frontend/package.json`
- Keep a single `test` script
- Remove the duplicated `cypress` entry
- Add the missing comma or regenerate the manifest cleanly with npm

### Backend

- Replace:

```python
from encryption import encrypt_pii, decrypt_pii, is_encrypted
from pii_redaction import redact_pii, redact_pii_dict, set_pii_redaction_enabled, is_pii_redaction_enabled
```

- With package-safe imports:

```python
from backend.encryption import encrypt_pii, decrypt_pii, is_encrypted
from backend.pii_redaction import (
    redact_pii,
    redact_pii_dict,
    set_pii_redaction_enabled,
    is_pii_redaction_enabled,
)
```

- Avoid relying on late `sys.path` mutation for local module resolution.

## Notes

- The existing `docs/ISSUE_DEBUG_FINDINGS.md` in the repository described a different
  state and did not match the current checkout. This file has been refreshed to
  reflect the actual failures observed on 2026-06-06.
