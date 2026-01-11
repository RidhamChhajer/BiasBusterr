import requests
import json

url_base = "http://127.0.0.1:8000"

print("="*80)
print("TESTING ALL ENDPOINTS")
print("="*80)

# Test 1: /explain endpoint
print("\n" + "="*80)
print("TEST 1: /explain (SHAP Analysis - Developer View)")
print("="*80)

with open("test_hiring.csv", "rb") as f:
    files = {"file": ("test_hiring.csv", f, "text/csv")}
    
    response = requests.post(f"{url_base}/explain", files=files)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Success!")
        print(f"\nTop 5 Biased Features:")
        for i, feature in enumerate(result['top_features'], 1):
            print(f"  {i}. {feature['feature']}: {feature['importance']}")
        
        with open("explain_results.json", "w") as out:
            json.dump(result, out, indent=2)
        print("\n📄 Full results saved to explain_results.json")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

# Test 2: /mitigate endpoint
print("\n" + "="*80)
print("TEST 2: /mitigate (Auto-Fix with Balancing)")
print("="*80)

with open("test_hiring.csv", "rb") as f:
    files = {"file": ("test_hiring.csv", f, "text/csv")}
    
    response = requests.post(f"{url_base}/mitigate", files=files)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Success!")
        print(f"\n📊 Before vs After:")
        print(f"  Original Fairness Score: {result['original_score']}")
        print(f"  Mitigated Fairness Score: {result['mitigated_score']}")
        print(f"  Improvement: +{result['improvement']}")
        print(f"\n🔍 Details:")
        print(f"  Samples Added: {result['details']['samples_added']}")
        print(f"  Original Disparate Impact: {result['details']['original_disparate_impact']}")
        print(f"  Mitigated Disparate Impact: {result['details']['mitigated_disparate_impact']}")
        
        with open("mitigate_results.json", "w") as out:
            json.dump(result, out, indent=2)
        print("\n📄 Full results saved to mitigate_results.json")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

# Test 3: /generate_certificate endpoint
print("\n" + "="*80)
print("TEST 3: /generate_certificate (PDF Generation)")
print("="*80)

data = {
    "fairness_score": 85.5,
    "accuracy": 0.92,
    "dataset_name": "Hiring Dataset Test",
    "company_name": "BiasBusterr Demo Corp"
}

response = requests.post(f"{url_base}/generate_certificate", data=data)

if response.status_code == 200:
    print(f"\n✅ Success!")
    
    # Save the PDF
    with open("test_certificate.pdf", "wb") as pdf_file:
        pdf_file.write(response.content)
    
    print(f"📄 Certificate PDF generated and saved to test_certificate.pdf")
    print(f"   File size: {len(response.content)} bytes")
else:
    print(f"❌ Error: {response.status_code}")
    print(response.text)

print("\n" + "="*80)
print("ALL TESTS COMPLETE")
print("="*80)
