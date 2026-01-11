import requests

# Test Python backend directly
url = "http://127.0.0.1:8000/process_csv"

with open("indian_loans.csv", "rb") as f:
    files = {"file": ("indian_loans.csv", f, "text/csv")}
    
    try:
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        
        if response.ok:
            print("✅ SUCCESS! Python backend is working")
            result = response.json()
            print(f"Fairness Score: {result.get('fairness_score')}")
            print(f"Protected Attribute: {result.get('details', {}).get('protected_attribute')}")
        else:
            print(f"❌ ERROR: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
