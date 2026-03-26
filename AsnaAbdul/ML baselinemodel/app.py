import pickle
import json
import re
import scipy.sparse as sp

# Load models
try:
    category_model = pickle.load(open("category_model.pkl", "rb"))
    priority_model = pickle.load(open("priority_model.pkl", "rb"))
    vectorizer = pickle.load(open("vectorizer.pkl", "rb"))
except FileNotFoundError:
    print("Models not found. Please run train.py first.")
    exit()

# Re-use the same urgency extractor logic from training
def priority_score(text):
    text = str(text).lower()
    high_words = ["urgent","critical","immediately","down","failed","cannot"]
    medium_words = ["error","issue","problem","slow"]
    low_words = ["request","update","change","install"]

    score = 0
    for word in high_words:
        if word in text:
            score += 2
    for word in medium_words:
        if word in text:
            score += 1
    for word in low_words:
        if word in text:
            score -= 1
    return score

# Rule-based (Regex) Named Entity Recognition (NER)
def extract_entities(text):
    entities = {}
    
    # Extract Email / Username
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = re.findall(email_pattern, text)
    if emails:
        entities['user_contact'] = emails[0]
        
    # Extract Error Codes (e.g., ERR-404, Error 500, CODE 123)
    error_pattern = r'(?i)(?:error|err|code)[\s-]*(\d{3,5}|[A-Z0-9]{4,8})'
    errors = re.findall(error_pattern, text)
    if errors:
        entities['error_code'] = "ERR-" + str(errors[0]).upper()
        
    # Extract Machine Names (e.g., PC-1029, SERVER-ALPHA, Mac-01)
    machine_pattern = r'(?i)(?:pc|server|mac|host|vm)[\s-]*([a-zA-Z0-9]{3,8})'
    machines = re.findall(machine_pattern, text)
    if machines:
        entities['machine_name'] = str(machines[0]).upper()
        
    return entities

def create_ticket(text):
    # 1. Preprocessing & Feature Extraction
    vec = vectorizer.transform([text])
    urgency_score = priority_score(text)
    
    # 2. Prediction Models
    # Category uses just TF-IDF
    category = category_model.predict(vec)[0]
    
    # Priority uses TF-IDF + Urgency feature
    combined_features = sp.hstack((vec, [[urgency_score]]))
    priority = priority_model.predict(combined_features)[0]
    
    # 3. NER Extraction (Regex-based ML alternative)
    entities = extract_entities(text)
    
    # 4. Generate Structured JSON Output
    ticket = {
        "title": text[:50] + "..." if len(text) > 50 else text,
        "description": text,
        "category": category,
        "priority": priority,
        "extracted_entities": entities,
        "urgency_score": urgency_score
    }
    
    ticket_json = json.dumps(ticket, indent=4)
    print("\n" + "="*40)
    print("🎫 STRUCTURED TICKET GENERATED")
    print("="*40)
    print(ticket_json)
    print("="*40 + "\n")
    
    return ticket_json

if __name__ == "__main__":
    print("AI Support Ticket Engine (Pure ML/Regex Mode)")
    print("Type 'exit' or 'quit' to stop.\n")
    while True:
        try:
            user_input = input("Enter ticket description: ")
        except EOFError:
            break
            
        if user_input.lower() in ['exit', 'quit']:
            break
        if user_input.strip() == "":
            continue
            
        create_ticket(user_input)
