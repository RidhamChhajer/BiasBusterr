import requests
import io
import pandas as pd

url_base = "http://127.0.0.1:8000"

print("="*80)
print("ROBUSTNESS TESTING SUITE")
print("="*80)

# Test 1: Empty File
print("\n" + "="*80)
print("TEST 1: Empty File (0 bytes)")
print("="*80)

empty_file = io.BytesIO(b'')
files = {"file": ("empty.csv", empty_file, "text/csv")}

try:
    response = requests.post(f"{url_base}/process_csv", files=files)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 400:
        print(f"✅ PASS - Server returned HTTP 400 (Bad Request)")
        print(f"Response: {response.json()}")
    elif response.status_code == 500:
        print(f"❌ FAIL - Server returned HTTP 500 (Internal Server Error)")
        print(f"Response: {response.text}")
    else:
        print(f"⚠️  Unexpected status code: {response.status_code}")
except Exception as e:
    print(f"❌ Connection error: {str(e)}")

# Test 2: The "Singularity" - All rows identical
print("\n" + "="*80)
print("TEST 2: The Singularity (All rows identical)")
print("="*80)

singularity_data = {
    "gender": ["Male"] * 10,
    "age": [30] * 10,
    "outcome": [1] * 10
}
singularity_df = pd.DataFrame(singularity_data)
singularity_csv = io.BytesIO()
singularity_df.to_csv(singularity_csv, index=False)
singularity_csv.seek(0)

files = {"file": ("singularity.csv", singularity_csv, "text/csv")}

try:
    response = requests.post(f"{url_base}/process_csv", files=files)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 400:
        print(f"✅ PASS - Server returned HTTP 400 (Bad Request)")
        print(f"Response: {response.json()}")
    elif response.status_code == 500:
        print(f"❌ FAIL - Server returned HTTP 500 (Internal Server Error)")
        print(f"Response: {response.text[:200]}")
    else:
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Connection error: {str(e)}")

# Test 3: Missing Columns
print("\n" + "="*80)
print("TEST 3: Missing Target Column")
print("="*80)

missing_col_data = {
    "gender": ["Male", "Female"] * 5,
    "age": [25, 30, 35, 40, 45] * 2
    # No target column!
}
missing_df = pd.DataFrame(missing_col_data)
missing_csv = io.BytesIO()
missing_df.to_csv(missing_csv, index=False)
missing_csv.seek(0)

files = {"file": ("missing_columns.csv", missing_csv, "text/csv")}

try:
    response = requests.post(f"{url_base}/process_csv", files=files)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 400:
        print(f"✅ PASS - Server returned HTTP 400 (Bad Request)")
        print(f"Response: {response.json()}")
    elif response.status_code == 500:
        print(f"❌ FAIL - Server returned HTTP 500 (Internal Server Error)")
        print(f"Response: {response.text[:200]}")
    else:
        print(f"⚠️  Unexpected status code: {response.status_code}")
        print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Connection error: {str(e)}")

# Test 4: Test with Indian Loans Data
print("\n" + "="*80)
print("TEST 4: Real Indian Loans Dataset (Positive Test)")
print("="*80)

try:
    with open("indian_loans.csv", "rb") as f:
        files = {"file": ("indian_loans.csv", f, "text/csv")}
        data = {
            "target_column": "Loan_Approved",
            "protected_attribute": "Caste_Category"
        }
        
        response = requests.post(f"{url_base}/process_csv", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ SUCCESS - Processed Indian dataset")
            print(f"\nFairness Score: {result['fairness_score']}")
            print(f"Accuracy: {result['accuracy']}")
            print(f"Disparate Impact: {result['details']['disparate_impact']}")
            print(f"Demographic Parity: {result['details']['demographic_parity_difference']}")
            
            # Now test RBI compliance with this data
            print("\n" + "-"*60)
            print("Running RBI Compliance Check...")
            print("-"*60)
            
            compliance_data = {
                "disparate_impact": result['details']['disparate_impact'],
                "demographic_parity_difference": result['details']['demographic_parity_difference'],
                "protected_attribute": "Caste_Category"
            }
            
            compliance_response = requests.post(f"{url_base}/check_rbi_compliance", data=compliance_data)
            
            if compliance_response.status_code == 200:
                compliance = compliance_response.json()
                print(f"\n📋 Overall Status: {compliance['overall_status']}")
                print(f"🚨 Risk Level: {compliance['risk_level']}")
                
                for check in compliance['compliance_checks']:
                    print(f"\n  ✓ {check['regulation']}:")
                    print(f"    Status: {check['status']}")
                    print(f"    {check['details']}")
                
                if 'financial_impact' in compliance:
                    print(f"\n💰 Financial Impact:")
                    print(f"    Estimated Penalty: {compliance['financial_impact']['estimated_penalty']}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text[:200])
except FileNotFoundError:
    print("❌ indian_loans.csv not found. Run generate_indian_data.py first.")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "="*80)
print("ROBUSTNESS TESTING COMPLETE")
print("="*80)
