import requests
import json

url = "http://127.0.0.1:8000/ai/analyze-v3"
payload = {
    "text": "I need help with my login, it is not working correctly.",
    "image_base64": ""
}

try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
