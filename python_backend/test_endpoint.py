import requests
import json

# Test the /process_csv endpoint
url = "http://127.0.0.1:8000/process_csv"

# Open and send the CSV file
with open("test_hiring.csv", "rb") as f:
    files = {"file": ("test_hiring.csv", f, "text/csv")}
    
    # Test 1: Automatic detection
    print("=" * 60)
    print("TEST 1: Automatic Column Detection")
    print("=" * 60)
    response = requests.post(url, files=files)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Success!")
        print(f"\nFairness Score: {result['fairness_score']}")
        print(f"Accuracy: {result['accuracy']}")
        print(f"\nDetails:")
        print(f"  - Disparate Impact: {result['details']['disparate_impact']}")
        print(f"  - Demographic Parity Difference: {result['details']['demographic_parity_difference']}")
        print(f"  - Target Column: {result['details']['target_column']}")
        print(f"  - Protected Attribute: {result['details']['protected_attribute']}")
        print(f"  - Groups Compared: {result['details']['groups_compared']}")
        print(f"  - Confusion Matrix:\n{result['details']['confusion_matrix']}")
        
        # Save full result to file
        with open("test_results.json", "w") as out:
            json.dump(result, out, indent=2)
        print("\n📄 Full results saved to test_results.json")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

print("\n" + "=" * 60)
print("TEST 2: Explicit Column Specification")
print("=" * 60)

# Test 2: Explicit columns
with open("test_hiring.csv", "rb") as f:
    files = {"file": ("test_hiring.csv", f, "text/csv")}
    data = {
        "target_column": "outcome",
        "protected_attribute": "gender"
    }
    response = requests.post(url, files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Success!")
        print(f"\nFairness Score: {result['fairness_score']}")
        print(f"Accuracy: {result['accuracy']}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
