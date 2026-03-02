import os
import sys
import torch

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.classifier_service import ClassifierService
from backend.services.ner_service import NERService

def test_models():
    print("Pre-checks:")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA Device: {torch.cuda.get_device_name(0)}")
    
    print("\nLoading Classifier Service...")
    classifier = ClassifierService()
    try:
        classifier.load()
        print("Classifier loaded successfully!")
        result = classifier.predict("My laptop screen is flickering")
        print(f"Prediction result: {result}")
    except Exception as e:
        print(f"Classifier failed: {e}")

    print("\nLoading NER Service...")
    ner = NERService()
    try:
        ner.load()
        print("NER loaded successfully!")
        entities = ner.extract_entities("My laptop screen is flickering")
        print(f"Entities result: {entities}")
    except Exception as e:
        print(f"NER failed: {e}")

if __name__ == "__main__":
    test_models()
