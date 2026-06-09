"""
Train All — Runs classifier and NER training in sequence.
Usage:
    python backend/train_all.py        (from project root)
    python train_all.py                (from backend/ directory)
"""


from backend.logger import get_logger
logger = get_logger(__name__)
import os
import sys
import time

# Ensure project root is on the path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.training.classifier_trainer import train_classifier
from backend.training.ner_trainer import train_ner


def main():
    logger.info("╔" + "═" * 58 + "╗")
    logger.info("║" + "  AI HELPDESK — FULL MODEL TRAINING".center(58) + "║")
    logger.info("╚" + "═" * 58 + "╝")
    logger.info()

    overall_start = time.time()

    # ── Step 1: Classifier ────────────────────────────────────
    logger.info("[1/2] Training Classifier Model …\n")
    t0 = time.time()
    try:
        train_classifier()
    except Exception as e:
        logger.error(f"\n[ERROR] Classifier training failed: {e}")
        raise
    t1 = time.time()
    logger.info(f"\n[1/2] Classifier training completed in {t1 - t0:.1f}s\n")

    # ── Step 2: NER ───────────────────────────────────────────
    logger.info("[2/2] Training NER Model …\n")
    t0 = time.time()
    try:
        train_ner()
    except Exception as e:
        logger.error(f"\n[ERROR] NER training failed: {e}")
        raise
    t1 = time.time()
    logger.info(f"\n[2/2] NER training completed in {t1 - t0:.1f}s\n")

    total = time.time() - overall_start
    logger.info("╔" + "═" * 58 + "╗")
    logger.info("║" + f"  ALL TRAINING COMPLETE — {total:.1f}s total".center(58) + "║")
    logger.info("╚" + "═" * 58 + "╝")


if __name__ == "__main__":
    main()
