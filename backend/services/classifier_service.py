"""
Classifier Service — Loads the trained DistilBert sequence classifier and predicts.
The model outputs combined "Category | SubCategory" labels.
Priority and other fields are derived from the category mapping.
"""

import os
import json
import time
import logging
from typing import Callable, Any

import torch
import torch.nn.functional as F
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
from prometheus_client import Counter, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics for tracking model performance
MODEL_PREDICTIONS_TOTAL = Counter(
    "model_predictions_total",
    "Total count of DistilBERT predictions",
    ["status"]
)

MODEL_PREDICTION_LATENCY = Histogram(
    "model_prediction_latency_seconds",
    "Latency of DistilBERT prediction in seconds",
    buckets=(0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 10.0)
)

CLASSIFIER_RETRY_TOTAL = Counter(
    "classifier_retry_total",
    "Total number of classifier retry attempts",
    ["provider", "status"]
)

SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "classifier")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MAX_LEN = 128

# Priority mapping based on sub-category severity
PRIORITY_MAP = {
    "Blue Screen": "Critical", "Overheating": "Critical", "Data Loss": "Critical",
    "Hardware Failure": "Critical", "Application Crash": "High",
    "Login Failure": "High", "Password Reset": "High", "VPN Connection": "High",
    "Firewall Block": "High", "DNS Problem": "High", "MFA Problem": "High",
    "Account Expired": "High", "Permission Issue": "Medium", "Access Request": "Medium",
    "Software Install": "Medium", "Update Problem": "Medium", "Compatibility": "Medium",
    "Configuration": "Medium", "License Issue": "Medium", "Performance": "Medium",
    "Internet Slow": "Medium", "WiFi Issue": "Medium", "Remote Access": "Medium",
    "Proxy Error": "Medium", "Network Drive": "Medium", "Role Change": "Medium",
    "Account Unlock": "Low", "Keyboard/Mouse": "Low", "Monitor Problem": "Low",
    "Printer Error": "Low", "Battery Issue": "Low", "Laptop Issue": "Low",
}

# Team assignment based on category
TEAM_MAP = {
    "Access": "IAM Team",
    "Network": "Network Support",
    "Software": "Application Support",
    "Hardware": "Hardware Support",
}

# Auto-resolve: simple issues that can be auto-resolved
AUTO_RESOLVE_SUBS = {
    "Password Reset", "Account Unlock", "Software Install",
    "WiFi Issue", "Printer Error", "Monitor Problem",
}

# ---------------------------------------------------------------------------
# Retry helpers
# ---------------------------------------------------------------------------

_RETRYABLE_EXCEPTIONS = (ConnectionError, TimeoutError, OSError)

_MAX_RETRIES: int = 3
_BASE_DELAY_S: float = 0.1  # 100 ms


def _is_retryable(exc: BaseException) -> bool:
    """Return True for transient errors that are safe to retry."""
    return isinstance(exc, _RETRYABLE_EXCEPTIONS)


def _backoff_delay(attempt: int) -> float:
    """Exponential backoff: 100 ms * 2^attempt (attempt is 1-based)."""
    return _BASE_DELAY_S * (2 ** attempt)


def _retry_call(
    fn: Callable[[], Any],
    *,
    provider: str = "classifier",
    max_retries: int = _MAX_RETRIES,
) -> Any:
    """
    Execute *fn* and retry on transient failures with exponential backoff.

    Retry policy:
      - Connection / timeout errors   → retry up to *max_retries* times.
      - Validation / value errors     → fail immediately (not retryable).
      - Exponential delay schedule    → 100 ms, 200 ms, 400 ms …

    Metrics are emitted to Prometheus for each retry attempt and the final
    outcome (success / failure).

    Args:
        fn: Zero-argument callable that performs the operation.
        provider: Label used in Prometheus metrics and log entries.
        max_retries: Maximum number of additional attempts after the first.

    Returns:
        The return value of *fn* on success.

    Raises:
        The last exception if all retry attempts are exhausted.
    """
    attempt = 0
    while True:
        try:
            result = fn()
            if attempt > 0:
                CLASSIFIER_RETRY_TOTAL.labels(provider=provider, status="success").inc()
                logger.info(
                    "[RetryAnalytics] %s succeeded after %d retries",
                    provider,
                    attempt,
                )
            return result
        except Exception as exc:
            if not _is_retryable(exc) or attempt >= max_retries:
                if attempt > 0:
                    CLASSIFIER_RETRY_TOTAL.labels(provider=provider, status="failure").inc()
                    logger.error(
                        "[RetryAnalytics] %s failed after %d retries: %s",
                        provider,
                        attempt,
                        exc,
                    )
                raise

            attempt += 1
            wait = _backoff_delay(attempt)
            CLASSIFIER_RETRY_TOTAL.labels(provider=provider, status="retrying").inc()
            logger.warning(
                "[RetryAnalytics] event=classifier_retry provider=%s attempt=%d "
                "success=pending wait_ms=%.0f reason=%s",
                provider,
                attempt,
                wait * 1000,
                type(exc).__name__,
            )
            time.sleep(wait)


# ---------------------------------------------------------------------------
# Classifier service
# ---------------------------------------------------------------------------


class ClassifierService:
    def __init__(self) -> None:
        self.model = None
        self.tokenizer = None
        self.id2label = None
        self.label2id = None
        self._loaded = False

    def load(self) -> None:
        """Load model, tokenizer, and label mappings from disk."""
        if self._loaded:
            return

        abs_dir = os.path.abspath(SAVE_DIR)
        safetensors_path = os.path.join(abs_dir, "model.safetensors")

        if not os.path.exists(safetensors_path):
            raise FileNotFoundError(
                f"Classifier model not found at {abs_dir}. "
                "Please ensure model files are present."
            )

        with open(safetensors_path, "rb") as f:
            header = f.read(512)
        if (
            b"version https://git-lfs.github.com/spec" in header
            or b"oid sha256:" in header
        ):
            raise FileNotFoundError(
                f"Classifier model at {abs_dir} is a Git LFS placeholder, not the actual model. "
                "Please pull the LFS assets."
            )

        # Load label mappings
        with open(os.path.join(abs_dir, "id2label.json"), "r") as f:
            self.id2label = json.load(f)
        with open(os.path.join(abs_dir, "label2id.json"), "r") as f:
            self.label2id = json.load(f)

        # Load tokenizer
        self.tokenizer = DistilBertTokenizerFast.from_pretrained(abs_dir)

        # Load model
        self.model = DistilBertForSequenceClassification.from_pretrained(abs_dir)
        self.model.to(DEVICE)
        self.model.eval()

        self._loaded = True
        print("Classifier loaded successfully")

    def _run_inference(self, text: str) -> dict:
        """
        Execute a single forward pass through the classifier model.

        This method is intentionally kept separate so that *_retry_call* can
        wrap it without capturing the surrounding metrics context.
        """
        self.load()

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=MAX_LEN,
            return_tensors="pt",
        )
        input_ids = encoding["input_ids"].to(DEVICE)
        attention_mask = encoding["attention_mask"].to(DEVICE)

        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            probs = F.softmax(logits, dim=1)
            confidence, pred_idx = torch.max(probs, dim=1)

        pred_idx = pred_idx.item()
        confidence = round(confidence.item(), 4)

        # Decode the combined label "Category | SubCategory"
        combined_label = self.id2label.get(str(pred_idx), "Unknown | Unknown")
        parts = combined_label.split(" | ", 1)
        category = parts[0].strip() if len(parts) > 0 else "Unknown"
        subcategory = parts[1].strip() if len(parts) > 1 else "Unknown"

        # Derive priority
        priority = PRIORITY_MAP.get(subcategory, "Medium")

        # Derive assigned team
        assigned_team = TEAM_MAP.get(category, "General Support")

        # Derive auto_resolve
        auto_resolve = subcategory in AUTO_RESOLVE_SUBS

        # --- Regex Override Layer (Boost for Technical Keywords) ---
        tech_keywords = {
            "Network": ["IP address", "hostname", "connection", "network", "bandwidth", "DNS", "firewall", "VPN", "Connectivity", "Latency", "Routing", "Spikes"],
            "Software": ["crash", "load", "website", "application", "error", "bug", "failing", "software", "SQL", "Cluster", "Database", "Production", "Latency"],
            "Access": ["login", "password", "access", "authentication", "account", "permission", "MFA", "OAuth"]
        }

        lower_text = text.lower()
        for cat, keywords in tech_keywords.items():
            if any(k.lower() in lower_text for k in keywords):
                # If current prediction is generic, or we have a high-value technical keyword
                if category == "General" or confidence < 0.9:
                    category = cat
                    assigned_team = TEAM_MAP.get(cat, "General Support")
                    # Boost confidence significantly for verified technical signals
                    confidence = max(confidence, 0.92)
                    break

        return {
            "category": category,
            "subcategory": subcategory,
            "priority": priority,
            "auto_resolve": auto_resolve,
            "assigned_team": assigned_team,
            "confidence": confidence,
        }

    def predict(self, text: str) -> dict:
        """
        Predict category, subcategory, priority, auto_resolve, assigned_team, and confidence.

        Transient failures (connection errors, timeouts, OS-level I/O errors) are
        automatically retried with exponential backoff up to MAX_RETRIES times.
        Validation errors propagate immediately without retrying.
        """
        start_time = time.time()
        try:
            result = _retry_call(
                lambda: self._run_inference(text),
                provider="classifier",
            )
            MODEL_PREDICTIONS_TOTAL.labels(status="success").inc()
            return result
        except Exception as e:
            MODEL_PREDICTIONS_TOTAL.labels(status="failure").inc()
            raise e
        finally:
            duration = time.time() - start_time
            MODEL_PREDICTION_LATENCY.observe(duration)
