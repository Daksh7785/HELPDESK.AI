from backend.services.classifier_service import ClassifierService

def test_classifier_initialization():
    classifier = ClassifierService()
    assert classifier._loaded == False
    assert classifier.model is None
    assert classifier.tokenizer is None

def test_classifier_predict_without_load():
    classifier = ClassifierService()
    result = classifier.predict("This is a test ticket about a password reset.")
    assert result["category"] == "General Request"
    assert result["subcategory"] == "Other"
    assert result["confidence"] == 0.0

def test_classifier_team_routing():
    from backend.services.classifier_service import TEAM_MAP
    assert "Hardware Issue" in TEAM_MAP
    assert TEAM_MAP["Hardware Issue"] == "IT Operations"
    assert TEAM_MAP.get("Software Bug") == "Engineering"
