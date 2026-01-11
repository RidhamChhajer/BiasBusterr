
import pandas as pd
import numpy as np
import random
import os

# Create output directory
output_dir = "testing_datasets"
os.makedirs(output_dir, exist_ok=True)

def generate_base_data(n_samples=1000):
    np.random.seed(42)
    data = {
        'Applicant_Name': [f"Applicant_{i}" for i in range(1, n_samples + 1)],
        'Age': np.random.randint(21, 70, n_samples),
        'Gender': np.random.choice(['Male', 'Female'], n_samples, p=[0.6, 0.4]),
        'Marital_Status': np.random.choice(['Single', 'Married', 'Divorced'], n_samples),
        'Dependents': np.random.randint(0, 5, n_samples),
        'Income': np.random.randint(20000, 200000, n_samples), # Monthly income in INR
        'Loan_Amount': np.random.randint(50000, 5000000, n_samples),
        'Credit_Score': np.random.randint(300, 900, n_samples),
        'Months_Employed': np.random.randint(0, 360, n_samples),
        'Caste_Category': np.random.choice(['General', 'OBC', 'SC', 'ST'], n_samples, p=[0.4, 0.3, 0.2, 0.1]),
        'Religion': np.random.choice(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Other'], n_samples, p=[0.7, 0.15, 0.05, 0.05, 0.05])
    }
    return pd.DataFrame(data)

def apply_approval_logic(df, logic_fn, noise_level=0.05):
    """Applies approval logic with some noise."""
    approvals = []
    for _, row in df.iterrows():
        base_approved = logic_fn(row)
        # Add noise (random flip)
        if random.random() < noise_level:
            base_approved = not base_approved
        approvals.append(1 if base_approved else 0)
    df['Loan_Approved'] = approvals
    return df

# 1. Bias: Gender (Women rejected more often)
def logic_gender_bias(row):
    # Strong bias against Female
    if row['Gender'] == 'Female':
        return row['Credit_Score'] > 750 and row['Income'] > 80000
    else:
        return row['Credit_Score'] > 600

# 2. Bias: Caste (SC/ST rejected more often)
def logic_caste_bias(row):
    if row['Caste_Category'] in ['SC', 'ST']:
        return row['Credit_Score'] > 800
    else:
        return row['Credit_Score'] > 650

# 3. Fair / Balanced (Only Credit Score & Income matter)
def logic_balanced(row):
    # Healthy DTI ratio proxy
    ratio = row['Loan_Amount'] / (row['Income'] * 12)
    return row['Credit_Score'] > 700 and ratio < 5

# 4. Bias: Age (Elderly rejected)
def logic_age_bias(row):
    if row['Age'] > 55:
        return False
    return row['Credit_Score'] > 650

# 5. Bias: Income (Rich rejected - Anomaly)
def logic_income_reverse(row):
    if row['Income'] > 150000:
        return False # Suspicious?
    return row['Credit_Score'] > 600

# 6. Strict Credit Score (Fair but harsh)
def logic_strict_credit(row):
    return row['Credit_Score'] > 800

# 7. Bias: Religion (Minority bias)
def logic_religion_bias(row):
    if row['Religion'] == 'Muslim':
        return row['Credit_Score'] > 850
    return row['Credit_Score'] > 650

# 8. Small Dataset
# (Logic: Balanced)

# 9. Large Dataset
# (Logic: Balanced)

# 10. Missing Values (Resilience Test)
# (Logic: Balanced, then poke holes)


# GENERATION LOOP
datasets = [
    ("1_gender_bias.csv", logic_gender_bias, 1000),
    ("2_caste_bias.csv", logic_caste_bias, 1000),
    ("3_fair_balanced.csv", logic_balanced, 1000),
    ("4_age_bias_elderly.csv", logic_age_bias, 1000),
    ("5_income_anomaly.csv", logic_income_reverse, 1000),
    ("6_strict_credit.csv", logic_strict_credit, 1000),
    ("7_religion_bias.csv", logic_religion_bias, 1000),
    ("8_small_dataset.csv", logic_balanced, 100),
    ("9_large_dataset.csv", logic_balanced, 5000),
]

for name, logic, size in datasets:
    df = generate_base_data(size)
    df = apply_approval_logic(df, logic)
    df.to_csv(os.path.join(output_dir, name), index=False)
    print(f"Generated {name}")

# 10. Missing Values
df_missing = generate_base_data(1000)
df_missing = apply_approval_logic(df_missing, logic_balanced)
# Introduce NaNs
for col in ['Income', 'Age', 'Credit_Score']:
    mask = np.random.choice([True, False], size=1000, p=[0.1, 0.9])
    df_missing.loc[mask, col] = np.nan
df_missing.to_csv(os.path.join(output_dir, "10_missing_values.csv"), index=False)
print("Generated 10_missing_values.csv")

print(f"All 10 datasets generated in {output_dir}/")
