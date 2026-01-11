import requests

url = "http://127.0.0.1:8000/counterfactual_check"

print("="*80)
print("TESTING COUNTERFACTUAL ANALYSIS (What-If Tool)")
print("="*80)

# Test with Indian loans dataset
print("\nTest: What if applicant was from different caste/religion?")
print("-"*80)

with open("indian_loans.csv", "rb") as f:
    files = {"file": ("indian_loans.csv", f, "text/csv")}
    data = {
        "row_index": 5,  # Test row 5
        "protected_attribute": "Caste_Category"
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        
        if response.ok:
            result = response.json()
            print(f"\n✅ SUCCESS!")
            print(f"\n{result['message']}")
            print(f"\n📊 Details:")
            print(f"  Original Group: {result['original_group']}")
            print(f"  Original Outcome: {result['original_outcome_label']} (prob: {result['original_probability']:.2%})")
            print(f"\n  → Flipped Group: {result['flipped_group']}")
            print(f"  → Flipped Outcome: {result['flipped_outcome_label']} (prob: {result['flipped_probability']:.2%})")
            print(f"\n  Bias Confirmed: {'YES ⚠️' if result['bias_confirmed'] else 'NO ✓'}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

print("\n" + "="*80)
print("TEST COMPLETE")
print("="*80)
