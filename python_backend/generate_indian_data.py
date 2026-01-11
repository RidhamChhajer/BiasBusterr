import pandas as pd
import numpy as np
import random

# Seed for reproducibility
np.random.seed(42)
random.seed(42)

# Indian names database
first_names = [
    "Amit", "Priya", "Rahul", "Anjali", "Vijay", "Sneha", "Arjun", "Kavya",
    "Rajesh", "Pooja", "Suresh", "Neha", "Arun", "Divya", "Karthik", "Swati",
    "Mohammed", "Fatima", "Arshad", "Ayesha", "Akbar", "Zainab", "Imran", "Nazia",
    "Gurpreet", "Harpreet", "Manpreet", "Simran", "Jaspreet", "Navjot",
    "John", "Mary", "Joseph", "Sarah", "Thomas", "Elizabeth"
]

last_names = [
    "Sharma", "Kumar", "Singh", "Patel", "Reddy", "Nair", "Iyer", "Pillai",
    "Khan", "Ahmed", "Ali", "Sheikh", "Ansari", "Qureshi",
    "Kaur", "Singh",
    "D'Souza", "Fernandes", "Joseph", "Thomas"
]

# Generate 1000 rows
n_rows = 1000

data = {
    "Applicant_Name": [],
    "Caste_Category": [],
    "Religion": [],
    "Credit_Score": [],
    "Loan_Approved": []
}

# Distribution weightings
caste_categories = ["General", "SC", "ST", "OBC"]
caste_weights = [0.35, 0.25, 0.15, 0.25]

religions = ["Hindu", "Muslim", "Sikh", "Christian"]
religion_weights = [0.60, 0.20, 0.10, 0.10]

for i in range(n_rows):
    # Generate name
    first = random.choice(first_names)
    last = random.choice(last_names)
    name = f"{first} {last}"
    
    # Generate caste and religion
    caste = np.random.choice(caste_categories, p=caste_weights)
    religion = np.random.choice(religions, p=religion_weights)
    
    # Generate credit score (300-850 range, like CIBIL)
    credit_score = np.random.randint(300, 851)
    
    # BIAS INJECTION LOGIC
    # Base approval probability based on credit score
    if credit_score >= 750:
        base_approval_prob = 0.90
    elif credit_score >= 650:
        base_approval_prob = 0.70
    elif credit_score >= 550:
        base_approval_prob = 0.40
    else:
        base_approval_prob = 0.15
    
    # Apply bias: Reduce approval rate for SC/ST and Muslim
    if caste in ["SC", "ST"]:
        base_approval_prob -= 0.15  # 15% penalty
    
    if religion == "Muslim":
        base_approval_prob -= 0.15  # 15% penalty
    
    # Ensure probability stays in [0, 1]
    base_approval_prob = max(0, min(1, base_approval_prob))
    
    # Determine approval
    loan_approved = 1 if np.random.random() < base_approval_prob else 0
    
    # Add to data
    data["Applicant_Name"].append(name)
    data["Caste_Category"].append(caste)
    data["Religion"].append(religion)
    data["Credit_Score"].append(credit_score)
    data["Loan_Approved"].append(loan_approved)

# Create DataFrame
df = pd.DataFrame(data)

# Save to CSV
output_file = "indian_loans.csv"
df.to_csv(output_file, index=False)

print(f"✅ Generated {n_rows} rows of Indian loan data")
print(f"📄 Saved to: {output_file}")
print("\nDataset Summary:")
print(df.head(10))
print("\nApproval Rates by Caste Category:")
for caste in caste_categories:
    rate = df[df['Caste_Category'] == caste]['Loan_Approved'].mean()
    print(f"  {caste}: {rate*100:.1f}%")

print("\nApproval Rates by Religion:")
for rel in religions:
    rate = df[df['Religion'] == rel]['Loan_Approved'].mean()
    print(f"  {rel}: {rate*100:.1f}%")
