
import pandas as pd
import numpy as np
import shap
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
import io
import warnings
warnings.filterwarnings("ignore")

def detect_columns_debug(df):
    columns = df.columns.tolist()
    target_col = None
    protected_attr = None
    
    # Target
    for col in columns:
        if col.lower() in ['loan_status', 'status', 'approved', 'target', 'churn', 'risk', 'loan_approved']:
            target_col = col
            break
            
    # Protected
    for col in columns:
        if any(key in col.lower() for key in ['caste', 'gender', 'sex', 'race', 'religion']):
            protected_attr = col
            break
            
    return target_col, protected_attr

def run_debug():
    print("Loading csv...")
    try:
        df = pd.read_csv('indian_loans.csv')
    except:
        print("Could not read indian_loans.csv")
        return
    
    print(f"Columns: {df.columns.tolist()}")
    
    df = df.dropna()
    target, protected = detect_columns_debug(df)
    
    if not target:
        target = df.columns[-1] # Fallback
    if not protected:
        protected = df.columns[1] # Fallback
        
    print(f"Target: {target}, Protected: {protected}")

    # Encode categorical data
    label_encoders = {}
    for col in df.columns:
        if df[col].dtype == 'object' or df[col].dtype.name == 'category':
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le

    # Drop Identifier Columns 
    cols_to_drop = [target]
    for col in df.columns:
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in ['name', 'email', 'phone']):
            if col != target and col != protected:
                cols_to_drop.append(col)
                print(f"Dropping identifier: {col}")
        elif 'id' in col_lower and not any(safe in col_lower for safe in ['valid', 'video', 'acid', 'fluid']):
            if col != target and col != protected:
                cols_to_drop.append(col)
                print(f"Dropping ID column: {col}")

    # 2. Train model
    try:
        X = df.drop(columns=cols_to_drop)
        y = df[target]
    except KeyError as e:
        print(f"Drop error: {e}")
        # manual filter
        safe_cols = [c for c in df.columns if c not in cols_to_drop]
        X = df[safe_cols]
        y = df[target]

    # Store feature names AFTER dropping identifiers
    feature_names = list(X.columns)
    print(f"Feature names (Length {len(feature_names)}): {feature_names}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    # 3. SHAP Analysis
    print("Computing SHAP...")
    explainer = shap.LinearExplainer(model, X_train)
    shap_values = explainer.shap_values(X_test)
    
    # SHAPE DEBUGGING
    if isinstance(shap_values, list):
        print(f"shap_values is list of length {len(shap_values)}")
        shap_values = np.array(shap_values[1]) if len(shap_values) > 1 else np.array(shap_values[0])
    
    shap_values = np.array(shap_values)
    print(f"shap_values shape: {shap_values.shape}")
    
    if len(shap_values.shape) > 1:
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
    else:
        mean_abs_shap = np.abs(shap_values)
        
    print(f"mean_abs_shap shape: {mean_abs_shap.shape} (Length: {len(mean_abs_shap)})")
    
    mean_abs_shap = mean_abs_shap.flatten()
    print(f"Flattened mean_abs_shap shape: {mean_abs_shap.shape}")
    
    print(f"Match? {len(feature_names)} == {len(mean_abs_shap)}")

    top_5_indices = np.argsort(mean_abs_shap)[-5:][::-1].flatten().tolist()
    print(f"top_5_indices: {top_5_indices}")

    feature_importance = []
    for idx in top_5_indices:
        # Safe handling
        if isinstance(idx, (list, tuple, np.ndarray)):
            idx = int(idx[0])
        else:
            idx = int(idx)
            
        print(f"Processing index {idx}...")
        if idx < len(feature_names):
            val = mean_abs_shap[idx]
            importance_value = val.item() if hasattr(val, 'item') else float(val)
            feature_importance.append({
                "feature": str(feature_names[idx]),
                "importance": round(importance_value, 4)
            })
        else:
            print(f"Index {idx} OUT OF BOUNDS. Max: {len(feature_names)}")

    print(f"Result: {feature_importance}")

if __name__ == "__main__":
    run_debug()
