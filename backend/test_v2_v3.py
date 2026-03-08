import os
import torch
import sys

# Ensure backend matches structure
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.services.classifier_v2 import classifier_v2
    print("[SUCCESS] Classifier V2 loaded.")
    test_res_v2 = classifier_v2.predict("I cannot login to my account")
    print(f"V2 Test Prediction: {test_res_v2['category']['prediction']} ({test_res_v2['category']['confidence']:.2f})")
except Exception as e:
    print(f"[ERROR] V2 Load failed: {e}")

try:
    from backend.services.classifier_v3 import classifier_v3
    print("[SUCCESS] Classifier V3 loaded.")
    test_res_v3 = classifier_v3.predict("I cannot login to my account")
    print(f"V3 Test Prediction: {test_res_v3['category']['prediction']} ({test_res_v3['category']['confidence']:.2f})")
except Exception as e:
    print(f"[ERROR] V3 Load failed: {e}")
