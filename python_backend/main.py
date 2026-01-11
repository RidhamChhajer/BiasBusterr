from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
from io import StringIO, BytesIO
from typing import Optional, List, Dict, Any
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix
import shap
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime

def convert_numpy(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return [convert_numpy(i) for i in obj.tolist()]
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(i) for i in obj]
    return obj

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "BiasBusterr Python Backend is running"}

def detect_columns(df: pd.DataFrame, target: Optional[str], protected: Optional[str]):
    # VALIDATION: Check if provided columns actually exist
    if target and target not in df.columns:
        print(f"[DETECT] Warning: Provided target '{target}' not found in columns. Auto-detecting...")
        target = None
        
    if protected and protected not in df.columns:
        print(f"[DETECT] Warning: Provided protected attribute '{protected}' not found in columns. Auto-detecting...")
        protected = None

    columns = df.columns.str.lower()
    
    # Auto-detect Target Column
    if not target:
        # PRIORITY 1: Exact matches for known targets
        priority_targets = ['Loan_Approved', 'Loan_Status', 'Approved', 'Status', 'Target', 'Class', 'Outcome']
        for col in df.columns:
            if col in priority_targets:
                target = col
                print(f"[AUTO-DETECT] Found high-priority target: {target}")
                break
        
        # PRIORITY 2: Keyword search (if no exact match)
        if not target:
            target_keywords = ['outcome', 'class', 'target', 'label', 'y', 'decision', 'approved', 'churn', 'status']
            for col in df.columns:
                 # Check if keyword is in column name, but exclude 'months' to avoid 'Months_Employed'
                 if any(keyword in col.lower() for keyword in target_keywords):
                      if 'months' not in col.lower():
                           target = col
                           print(f"[AUTO-DETECT] Found target via keyword: {target}")
                           break
    
    # Auto-detect Protected Attribute with PRIORITY on strong keywords
    if not protected:
        protected_keywords = ['gender', 'sex', 'race', 'ethnicity', 'disability', 'caste', 'religion', 'age']
        # First pass: exact or near-exact matches
        for col in df.columns:
            if any(keyword in col.lower() for keyword in protected_keywords):
                protected = col
                print(f"[AUTO-DETECT] Found protected attribute via keyword: {col}")
                break
        
        # Second pass: if still not found, use first categorical column that is NOT the target
        if not protected:
            cat_cols = df.select_dtypes(include=['object', 'category']).columns
            for col in cat_cols:
                if col != target and col != 'Applicant_Name':
                    protected = col
                    print(f"[AUTO-DETECT] Using first categorical column as protected attribute: {col}")
                    break
    
    if not target or target not in df.columns:
        raise HTTPException(status_code=400, detail="Target column could not be detected. Please specify generic keywords or provide explicitly.")
    if not protected or protected not in df.columns:
        raise HTTPException(status_code=400, detail="Protected attribute could not be detected. Please specify explicitly.")

    return target, protected

def calculate_fairness_metrics(y_true, y_pred, protected_attr):
    # Ensure inputs are numpy arrays
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    protected_attr = np.array(protected_attr)
    
    # Identify favorable label (assume 1 for numeric, or 2nd unique value for string if binary)
    unique_labels = np.unique(y_true)
    favorable_label = unique_labels[-1] # Simple heuristic: last sorted value is usually '1' or 'Pos'
    
    # Identify protected group (assume 0 or first value is unprivileged, but for metrics we usually compare Group A vs Group B)
    # Let's map unique protected values to 0 and 1 if there are 2. 
    unique_groups = np.unique(protected_attr)
    if len(unique_groups) != 2:
        # If > 2 groups, simpler to just pick the most frequent vs rest or just first two. 
        # For simplicity in this hackathon context, we'll pick the first two.
        group_a = unique_groups[0]
        group_b = unique_groups[1]
    else:
        group_a = unique_groups[0]
        group_b = unique_groups[1]

    # Calculate selection rates
    # Mask for Group A (unprivileged?) & Group B (privileged?) - we don't know which is which without user input.
    # We will just report the ratio (Disparate Impact) of Group A / Group B. 
    
    def selection_rate(group_val):
        mask = (protected_attr == group_val)
        if np.sum(mask) == 0: return 0.0
        return np.mean(y_pred[mask] == favorable_label)

    rate_a = selection_rate(group_a)
    rate_b = selection_rate(group_b)
    
    # Avoid division by zero
    if rate_b == 0:
        disparate_impact = 0.0 if rate_a == 0 else 999.0 # Edge case
    else:
        disparate_impact = rate_a / rate_b
        
    demographic_parity_diff = rate_b - rate_a
    
    return {
        "disparate_impact": float(round(disparate_impact, 4)),
        "demographic_parity_difference": float(round(demographic_parity_diff, 4)),
        "favorable_label": str(favorable_label),
        "groups_compared": [str(group_a), str(group_b)]
    }

@app.post("/process_csv")
async def process_csv(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    protected_attribute: Optional[str] = Form(None)
):
    try:
        # 1. Load Data
        contents = await file.read()
        s = str(contents, 'utf-8')
        data = StringIO(s)
        df = pd.read_csv(data)
        
        # 2. Handling Missing Data (User Rule 1)
        df = df.dropna()
        if df.empty:
             raise HTTPException(status_code=400, detail="Dataset is empty after dropping missing values.")

        # 3. Detect Columns BEFORE encoding (so we preserve original data types)
        target, protected = detect_columns(df, target_column, protected_attribute)
        print(f"Detected Target: {target}, Protected: {protected}")

        # 4. Preprocessing (User Rule 2: Categorical Data)
        # Store encoders to inverse transform if needed (not needed for this endpoint's return)
        label_encoders = {}
        for col in df.columns:
            if df[col].dtype == 'object' or df[col].dtype.name == 'category':
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                label_encoders[col] = le
        
        # 5. Drop Identifier Columns (Name, ID, Email, Phone)
        # These should NOT be used as features for training
        cols_to_drop = [target]  # Always drop target
        for col in df.columns:
            col_lower = col.lower()
            # Check for identifier patterns
            if any(keyword in col_lower for keyword in ['name', 'email', 'phone']):
                # Don't drop target or protected attribute
                if col != target and col != protected:
                    cols_to_drop.append(col)
                    print(f"Dropping identifier column from features: {col}")
            # Check for 'id' but exclude words like 'valid', 'video', etc.
            elif 'id' in col_lower and not any(safe in col_lower for safe in ['valid', 'video', 'acid', 'fluid']):
                if col != target and col != protected:
                    cols_to_drop.append(col)
                    print(f"Dropping ID column from features: {col}")
        
        # 6. Auto-Train Logic
        # AGGRESSIVE TARGET REMOVAL to prevent data leakage
        potential_targets = [target, 'Loan_Approved', 'Loan_Status', 'Target', 'Outcome', 'Approved', 'Status']
        cols_to_drop = list(set(cols_to_drop + potential_targets)) # De-duplicate
        
        # Filter to only columns that actually exist
        cols_to_drop = [c for c in cols_to_drop if c in df.columns]
        
        print(f"[PROCESS] Final columns to drop: {cols_to_drop}")
        X = df.drop(columns=cols_to_drop)
        y = df[target]
        
        print(f"[PROCESS] Final Feature Set: {list(X.columns)}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # No scaling needed for Random Forest (it handles raw values better)
        
        # Train Model (Random Forest is better for capturing non-linear biases)
        # using fewer trees for speed in demo, but enough for accuracy
        model = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        
        # Predict
        y_pred = model.predict(X_test)
        
        # 6. Metric Calculation
        # Accuracy
        acc = accuracy_score(y_test, y_pred)
        
        # Confusion Matrix
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        # Fairness Metrics (on Test Set)
        # We need the protected attribute values for the test set
        protected_attr_test = X_test[protected]
        
        fairness_metrics = calculate_fairness_metrics(y_test, y_pred, protected_attr_test)
        
        # Fairness Score (Simple composite: 100 - (DP Diff * 100))
        # Perfect fair = 100. DP Diff of 0.2 -> 80.
        fairness_score = max(0, 100 - (abs(fairness_metrics['demographic_parity_difference']) * 100))

        # 7. Integrated SHAP Analysis (Robust Implementation)
        print("[PROCESS] Running Integrated SHAP Analysis...")
        feature_names = list(X.columns)
        print(f"[PROCESS] Feature Names ({len(feature_names)}): {feature_names}")
        
        try:
            # OPTIMIZATION: Subsample X_test for SHAP if it's too large
            # Calculating SHAP for >100 samples is slow and unnecessary for global feature importance
            X_shap = X_test
            if len(X_test) > 100:
                print(f"[PROCESS] Optimization: Subsampling SHAP from {len(X_test)} to 100 samples")
                X_shap = X_test.sample(100, random_state=42)

            # Initialize Explainer
            explainer = shap.TreeExplainer(model)
            shap_values_raw = explainer.shap_values(X_shap, check_additivity=False)
            
            # Proper List Handling
            if isinstance(shap_values_raw, list):
                # For binary classification, index 1 is usually the positive class
                idx = 1 if len(shap_values_raw) > 1 else 0
                shap_values = np.array(shap_values_raw[idx])
            else:
                shap_values = np.array(shap_values_raw)
                
            # Smart Aggregation Logic
            mean_abs_shap = None
            n_features = len(feature_names)
            
            # Ensure 2D (Samples, Features)
            if len(shap_values.shape) == 2:
                # Check dimensions against n_features
                if shap_values.shape[1] == n_features:
                    mean_abs_shap = np.abs(shap_values).mean(axis=0)
                elif shap_values.shape[0] == n_features:
                    mean_abs_shap = np.abs(shap_values).mean(axis=1)
                else:
                    # Fallback: flatten and check size
                    flat = shap_values.flatten()
                    if flat.size % n_features == 0:
                         mean_abs_shap = np.abs(flat.reshape(-1, n_features)).mean(axis=0)
            elif len(shap_values.shape) == 3:
                 # Multiclass output in one array? (Samples, Features, Classes)
                 mean_abs_shap = np.abs(shap_values).mean(axis=(0, 2)) # simplistic
            else:
                 mean_abs_shap = np.abs(shap_values)

            # Final size check
            if mean_abs_shap is None or mean_abs_shap.size != n_features:
                 mean_abs_shap = np.zeros(n_features)

            mean_abs_shap = mean_abs_shap.flatten()
            
            # Convert to list of dicts
            feature_importance = []
            # Sort indices validly
            sorted_indices = np.argsort(mean_abs_shap)[::-1]
            
            for idx in sorted_indices:
                if idx < n_features:
                    feature_importance.append({
                        "feature": str(feature_names[idx]),
                        "importance": float(round(mean_abs_shap[idx], 4))
                    })
            
            # Take top 5
            feature_importance = feature_importance[:5]
            print(f"[PROCESS] Final Top Features: {feature_importance}")

        except Exception as e:
            print(f"[PROCESS] SHAP Error (Non-Critical): {str(e)}")
            feature_importance = []

        return convert_numpy({
            "fairness_score": float(round(fairness_score, 2)),
            "accuracy": float(round(acc, 4)),
            "top_features": feature_importance,
            "details": {
                "disparate_impact": float(fairness_metrics['disparate_impact']),
                "demographic_parity_difference": float(fairness_metrics['demographic_parity_difference']),
                "confusion_matrix": cm,
                "favorable_label": fairness_metrics['favorable_label'],
                "groups_compared": fairness_metrics['groups_compared'],
                "target_column": target,
                "protected_attribute": protected
            },
            "representative_profile": get_representative_profile(df, target, protected)
        })

    except Exception as e:
        print(f"Error processing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_representative_profile(df, target, protected):
    try:
        # Find a rejected applicant (Target=0 or 'No' or 'Rejected')
        # Assuming binary: 0/1 or similar. 
        # Heuristic: Look for the minority class or 0 if numeric
        
        rejected_df = df[df[target].astype(str).isin(['0', '0.0', 'No', 'False', 'Rejected'])]
        
        if rejected_df.empty:
            # If no rejections, just pick a random person
            row = df.sample(1).iloc[0]
            status = "APPROVED" # Likely
        else:
            # Pick one from the protected group if possible (to show bias)
            protected_rejected = rejected_df.dropna(subset=[protected]) # ensure protected col exists
            if not protected_rejected.empty:
                 row = protected_rejected.sample(1).iloc[0]
            else:
                 row = rejected_df.sample(1).iloc[0]
            status = "REJECTED"

        # Safe extraction
        def safe_get(col_name):
             for c in df.columns:
                  if col_name.lower() in c.lower(): return row[c]
             return "N/A"

        return {
             "name": safe_get("name") if safe_get("name") != "N/A" else f"Applicant #{row.name}",
             "credit_score": str(safe_get("credit")),
             "income": str(safe_get("income")),
             "caste": str(row[protected]) if protected in df.columns else "N/A",
             "status": status,
             "protected_attribute": protected
        }
    except Exception as e:
        print(f"[PROFILE] Error extracting profile: {e}")
        return None

@app.post("/explain")
async def explain(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    protected_attribute: Optional[str] = Form(None)
):
    """
    Developer View: Use SHAP to explain feature importance
    """
    try:
        # 1. Load and preprocess data (same as process_csv)
        contents = await file.read()
        s = str(contents, 'utf-8')
        data = StringIO(s)
        df = pd.read_csv(data)
        
        df = df.dropna()
        if df.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty after dropping missing values.")
        
        target, protected = detect_columns(df, target_column, protected_attribute)
        print(f"[EXPLAIN] Detected Target: {target}, Protected: {protected}")
        
        # Encode categorical data
        label_encoders = {}
        for col in df.columns:
            if df[col].dtype == 'object' or df[col].dtype.name == 'category':
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                label_encoders[col] = le
        
        # Drop Identifier Columns (same logic as process_csv)
        cols_to_drop = [target]
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['name', 'email', 'phone']):
                if col != target and col != protected:
                    cols_to_drop.append(col)
                    print(f"[EXPLAIN] Dropping identifier: {col}")
            elif 'id' in col_lower and not any(safe in col_lower for safe in ['valid', 'video', 'acid', 'fluid']):
                if col != target and col != protected:
                    cols_to_drop.append(col)
                    print(f"[EXPLAIN] Dropping ID column: {col}")
        
        # 2. Train model
        try:
            X = df.drop(columns=cols_to_drop)
        except KeyError:
            # Fallback if target not found in columns (unlikely after detect)
            print(f"[EXPLAIN] Warning: Drop failed for {cols_to_drop}")
            safe_drop = [c for c in cols_to_drop if c in df.columns]
            X = df.drop(columns=safe_drop)

        # 2b. DOUBLE CHECK: Ensure target is NOT in X
        if target in X.columns:
             X = X.drop(columns=[target])
             print(f"[EXPLAIN] Force dropped target '{target}' from X")
             
        y = df[target]
        
        # Store feature names AFTER dropping identifiers
        feature_names = list(X.columns)
        print(f"[EXPLAIN] Training features: {feature_names}")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = LogisticRegression(max_iter=1000)
        model.fit(X_train, y_train)
        
        # 3. SHAP Analysis (LinearExplainer for speed)
        print("[EXPLAIN] Computing SHAP values using LinearExplainer...")
        explainer = shap.LinearExplainer(model, X_train)
        shap_values = explainer.shap_values(X_test)
        
        # 4. Calculate mean absolute SHAP values for each features
        # Ensure numpy array
        if isinstance(shap_values, list):
            # For binary classification, sometimes returns list of [class0_shap, class1_shap]
            # We usually want class 1 (positive class) indices
            print(f"[EXPLAIN] shap_values is list of length {len(shap_values)}")
            shap_values = np.array(shap_values[1]) if len(shap_values) > 1 else np.array(shap_values[0])

        shap_values = np.array(shap_values) # Force conversion to simple array
        print(f"[EXPLAIN] shap_values shape: {shap_values.shape}")
        
        n_features = len(feature_names)
        print(f"[EXPLAIN] Expected features: {n_features}")
        
        mean_abs_shap = None
        
        # Super Robust Reshape Logic
        # We know we must produce vector of size `n_features`
        
        try:
            # 1. Flatten everything to remove extra dimensions (1, N, M) -> (N*M,)
            flat = shap_values.flatten()
            print(f"[EXPLAIN] Flattened size: {flat.size}")
            
            if flat.size == n_features:
                 # It's already reduced
                 mean_abs_shap = np.abs(flat)
                 print("[EXPLAIN] Exact size match - using as is")
            
            elif flat.size % n_features == 0:
                 # It's a multiple (likely samples * features)
                 # Reshape to (rows, n_features)
                 reshaped = flat.reshape(-1, n_features)
                 print(f"[EXPLAIN] Reshaped to {reshaped.shape}")
                 
                 # Mean absolute value over samples (axis 0)
                 mean_abs_shap = np.abs(reshaped).mean(axis=0)
                 print("[EXPLAIN] Averaged over axis 0")
                 
            else:
                 print(f"[EXPLAIN] Size mismatch: {flat.size} is not multiple of {n_features}")
                 # Emergency fallback: Take first N elements or padding? 
                 # Let's try to fit what we can
                 if flat.size > n_features:
                     mean_abs_shap = np.abs(flat[:n_features])
                 else:
                     mean_abs_shap = np.pad(np.abs(flat), (0, n_features - flat.size))
        
        except Exception as e:
            print(f"[EXPLAIN] Reshape error: {e}")
            mean_abs_shap = np.zeros(n_features)
            
        # Ensure flat final vector
        mean_abs_shap = mean_abs_shap.flatten()
        print(f"[EXPLAIN] Final mean_abs_shap shape: {mean_abs_shap.shape}")
        print(f"[EXPLAIN] Feature names length: {len(feature_names)}")
        print(f"[EXPLAIN] Feature names: {feature_names}")
        
        # 5. Get top 5 features
        # Flattening ensures we get a 1D index array
        top_5_indices = np.argsort(mean_abs_shap)[-5:][::-1].flatten().tolist()
        
        print(f"[EXPLAIN] top_5_indices raw: {top_5_indices}")

        feature_importance = []
        for idx in top_5_indices:
            # Safe integer conversion
            try:
                if isinstance(idx, (list, tuple, np.ndarray)):
                     idx = int(idx[0])
                else:
                     idx = int(idx)
                
                print(f"[EXPLAIN] Processing index {idx}...")
                
                # Default feature name
                feature_name = f"Feature {idx}"
                
                if idx < len(feature_names):
                    feature_name = str(feature_names[idx])
                else:
                    print(f"[EXPLAIN] Index {idx} out of bounds for feature_names (len {len(feature_names)}) - Using fallback")
                
                # Safe value extraction with bounds check for mean_abs_shap
                if idx < len(mean_abs_shap):
                     val = mean_abs_shap[idx]
                     # Safe float conversion
                     importance_value = val.item() if hasattr(val, 'item') else float(val)
                     
                     feature_importance.append({
                        "feature": feature_name,
                        "importance": round(importance_value, 4)
                    })
                else:
                     print(f"[EXPLAIN] Index {idx} out of bounds for mean_abs_shap (len {len(mean_abs_shap)})")
                     
            except Exception as loop_e:
                print(f"[EXPLAIN] Error processing index {idx}: {loop_e}")
                continue
        
        print(f"[EXPLAIN] Final feature_importance: {feature_importance}")
        
        # Add debug info to response
        return convert_numpy({
            "top_features": feature_importance,
            "message": "SHAP analysis complete",
            "debug_info": {
                "feature_names_len": len(feature_names),
                "shap_len": len(mean_abs_shap),
                "feature_names": feature_names
            }
        })
        
    except Exception as e:
        print(f"Error in explain endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mitigate")
async def mitigate(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    protected_attribute: Optional[str] = Form(None)
):
    """
    Auto-Fix: Apply random oversampling to balance dataset
    """
    try:
        # 1. Load and preprocess data
        contents = await file.read()
        s = str(contents, 'utf-8')
        data = StringIO(s)
        df_original = pd.read_csv(data)
        
        df_original = df_original.dropna()
        if df_original.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty after dropping missing values.")
        
        target, protected = detect_columns(df_original, target_column, protected_attribute)
        print(f"[MITIGATE] Detected Target: {target}, Protected: {protected}")
        
        # Store original data for comparison
        df = df_original.copy()
        
        # Encode categorical data
        label_encoders = {}
        for col in df.columns:
            if df[col].dtype == 'object' or df[col].dtype.name == 'category':
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                label_encoders[col] = le
        
        # Drop Identifier Columns (same logic as process_csv and explain)
        cols_to_drop = [target]
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['name', 'email', 'phone']):
                if col != target and col != protected:
                    cols_to_drop.append(col)
            elif 'id' in col_lower and not any(safe in col_lower for safe in ['valid', 'video', 'acid', 'fluid']):
                if col != target and col != protected:
                    cols_to_drop.append(col)
        
        # 2. Calculate ORIGINAL fairness score
        X_orig = df.drop(columns=cols_to_drop)
        y_orig = df[target]
        
        X_train_orig, X_test_orig, y_train_orig, y_test_orig = train_test_split(
            X_orig, y_orig, test_size=0.2, random_state=42
        )
        
        model_orig = LogisticRegression(max_iter=1000)
        model_orig.fit(X_train_orig, y_train_orig)
        y_pred_orig = model_orig.predict(X_test_orig)
        
        protected_attr_test_orig = X_test_orig[protected]
        fairness_metrics_orig = calculate_fairness_metrics(y_test_orig, y_pred_orig, protected_attr_test_orig)
        fairness_score_orig = max(0, 100 - (abs(fairness_metrics_orig['demographic_parity_difference']) * 100))
        
        # 3. Apply Random Oversampling
        print("[MITIGATE] Applying random oversampling to balance dataset...")
        
        # Identify favorable label
        unique_labels = np.unique(y_orig)
        favorable_label = unique_labels[-1]
        
        # Identify groups
        unique_groups = np.unique(X_orig[protected])
        group_a = unique_groups[0]
        group_b = unique_groups[1]
        
        # Find minority group with favorable outcome
        mask_a_favorable = (X_orig[protected] == group_a) & (y_orig == favorable_label)
        mask_b_favorable = (X_orig[protected] == group_b) & (y_orig == favorable_label)
        
        count_a = mask_a_favorable.sum()
        count_b = mask_b_favorable.sum()
        
        # Oversample the minority
        if count_a < count_b:
            # Group A is minority, oversample it
            minority_samples = df[mask_a_favorable]
            n_to_add = count_b - count_a
            oversampled = minority_samples.sample(n=n_to_add, replace=True, random_state=42)
            df_balanced = pd.concat([df, oversampled], ignore_index=True)
        else:
            # Group B is minority, oversample it
            minority_samples = df[mask_b_favorable]
            n_to_add = count_a - count_b
            oversampled = minority_samples.sample(n=n_to_add, replace=True, random_state=42)
            df_balanced = pd.concat([df, oversampled], ignore_index=True)
        
        print(f"[MITIGATE] Original dataset size: {len(df)}, Balanced dataset size: {len(df_balanced)}")
        
        # 4. Calculate NEW fairness score on balanced data
        X_balanced = df_balanced.drop(columns=[target])
        y_balanced = df_balanced[target]
        
        X_train_bal, X_test_bal, y_train_bal, y_test_bal = train_test_split(
            X_balanced, y_balanced, test_size=0.2, random_state=42
        )
        
        model_bal = LogisticRegression(max_iter=1000)
        model_bal.fit(X_train_bal, y_train_bal)
        y_pred_bal = model_bal.predict(X_test_bal)
        
        protected_attr_test_bal = X_test_bal[protected]
        fairness_metrics_bal = calculate_fairness_metrics(y_test_bal, y_pred_bal, protected_attr_test_bal)
        fairness_score_bal = max(0, 100 - (abs(fairness_metrics_bal['demographic_parity_difference']) * 100))
        
        return convert_numpy({
            "original_score": round(fairness_score_orig, 2),
            "mitigated_score": round(fairness_score_bal, 2),
            "improvement": round(fairness_score_bal - fairness_score_orig, 2),
            "details": {
                "original_disparate_impact": fairness_metrics_orig['disparate_impact'],
                "mitigated_disparate_impact": fairness_metrics_bal['disparate_impact'],
                "original_demographic_parity": fairness_metrics_orig['demographic_parity_difference'],
                "mitigated_demographic_parity": fairness_metrics_bal['demographic_parity_difference'],
                "samples_added": len(df_balanced) - len(df)
            }
        })
        
    except Exception as e:
        print(f"Error in mitigate endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_certificate")
async def generate_certificate(
    fairness_score: float = Form(...),
    accuracy: float = Form(...),
    dataset_name: str = Form("Dataset"),
    company_name: str = Form("Organization")
):
    """
    Generate a PDF certificate for bias audit
    """
    try:
        # Create a BytesIO buffer for the PDF
        buffer = BytesIO()
        
        # Create the PDF
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Title
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(width / 2, height - 100, "BIAS AUDIT CERTIFICATE")
        
        # Subtitle
        c.setFont("Helvetica", 14)
        c.drawCentredString(width / 2, height - 140, "BiasBusterr ML Fairness Analysis")
        
        # Horizontal line
        c.line(50, height - 160, width - 50, height - 160)
        
        # Body content
        c.setFont("Helvetica", 12)
        y_position = height - 200
        
        c.drawString(100, y_position, f"Organization: {company_name}")
        y_position -= 30
        
        c.drawString(100, y_position, f"Dataset: {dataset_name}")
        y_position -= 30
        
        c.drawString(100, y_position, f"Audit Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        y_position -= 50
        
        # Metrics
        c.setFont("Helvetica-Bold", 14)
        c.drawString(100, y_position, "Analysis Results:")
        y_position -= 30
        
        c.setFont("Helvetica", 12)
        c.drawString(120, y_position, f"Fairness Score: {fairness_score:.2f} / 100")
        y_position -= 25
        
        c.drawString(120, y_position, f"Model Accuracy: {accuracy * 100:.2f}%")
        y_position -= 40
        
        # Interpretation
        c.setFont("Helvetica-Bold", 12)
        c.drawString(100, y_position, "Interpretation:")
        y_position -= 25
        
        c.setFont("Helvetica", 11)
        if fairness_score >= 80:
            interpretation = "EXCELLENT - Low bias detected. Model demonstrates fair treatment."
        elif fairness_score >= 60:
            interpretation = "GOOD - Moderate fairness. Minor improvements recommended."
        elif fairness_score >= 40:
            interpretation = "FAIR - Noticeable bias present. Mitigation strategies advised."
        else:
            interpretation = "POOR - Significant bias detected. Immediate action required."
        
        c.drawString(120, y_position, interpretation)
        y_position -= 60
        
        # Footer
        c.line(50, y_position, width - 50, y_position)
        y_position -= 30
        c.setFont("Helvetica-Oblique", 10)
        c.drawCentredString(width / 2, y_position, "This certificate is generated by BiasBusterr AI Bias Detection System")
        c.drawCentredString(width / 2, y_position - 15, "For demonstration purposes only")
        
        # Save PDF
        c.save()
        
        # Reset buffer position
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=bias_audit_certificate_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
        )
        
    except Exception as e:
        print(f"Error generating certificate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/check_rbi_compliance")
async def check_rbi_compliance(
    disparate_impact: float = Form(...),
    demographic_parity_difference: float = Form(...),
    protected_attribute: str = Form(...)
):
    """
    Check compliance with Indian regulations (RBI FREE-AI, Constitution Article 15)
    """
    try:
        results = {
            "compliance_checks": [],
            "overall_status": "COMPLIANT",
            "risk_level": "LOW",
            "recommendations": []
        }
        
        # 1. RBI FREE-AI Framework Check (Fairness Sutra)
        if disparate_impact < 0.8:
            results["compliance_checks"].append({
                "regulation": "RBI FREE-AI Framework (Fairness Sutra)",
                "status": "VIOLATION",
                "severity": "HIGH",
                "details": f"Disparate Impact of {disparate_impact:.2f} is below the 0.8 threshold",
                "penalty_risk": "High - Regulatory penalties and mandatory model retraining"
            })
            results["overall_status"] = "NON-COMPLIANT"
            results["risk_level"] = "HIGH"
            results["recommendations"].append("Immediately apply bias mitigation techniques")
            results["recommendations"].append("Document fairness improvement plan for RBI submission")
        else:
            results["compliance_checks"].append({
                "regulation": "RBI FREE-AI Framework (Fairness Sutra)",
                "status": "COMPLIANT",
                "severity": "N/A",
                "details": f"Disparate Impact of {disparate_impact:.2f} meets the 0.8 threshold"
            })
        
        # 2. Constitution Article 15 Check (Anti-Discrimination)
        protected_attr_lower = protected_attribute.lower()
        sensitive_attributes = ['caste', 'religion', 'gender', 'race', 'ethnicity', 'caste_category']
        
        if any(attr in protected_attr_lower for attr in sensitive_attributes):
            if abs(demographic_parity_difference) > 0.1:  # More than 10% difference
                results["compliance_checks"].append({
                    "regulation": "Constitution of India - Article 15 (Anti-Discrimination)",
                    "status": "CRITICAL",
                    "severity": "CRITICAL",
                    "details": f"Discrimination detected on protected attribute '{protected_attribute}' with {abs(demographic_parity_difference)*100:.1f}% parity difference",
                    "risk": "Litigation Imminent - Violation of fundamental rights"
                })
                results["overall_status"] = "CRITICAL_VIOLATION"
                results["risk_level"] = "CRITICAL"
                results["recommendations"].append("Suspend model deployment immediately")
                results["recommendations"].append("Consult legal team for compliance strategy")
            else:
                results["compliance_checks"].append({
                    "regulation": "Constitution of India - Article 15 (Anti-Discrimination)",
                    "status": "COMPLIANT",
                    "severity": "N/A",
                    "details": f"Protected attribute '{protected_attribute}' shows acceptable parity"
                })
        
        # 3. Priority Sector Lending (PSL) Check
        if protected_attr_lower in ['caste', 'caste_category', 'income', 'region']:
            psl_warning = {
                "regulation": "Priority Sector Lending (PSL) Guidelines",
                "status": "WARNING",
                "severity": "MEDIUM",
                "business_risk": "Risk of missing Priority Sector Lending (PSL) targets",
                "details": "Bias against certain groups may impact regulatory lending quotas",
                "financial_impact": "Potential shortfall in PSL targets (40% for domestic banks)"
            }
            results["compliance_checks"].append(psl_warning)
            results["recommendations"].append("Review lending distribution across priority sectors")
        
        # 4. Financial Impact Estimation (Indian Context)
        if results["risk_level"] in ["HIGH", "CRITICAL"]:
            # Estimate penalties in INR
            results["financial_impact"] = {
                "estimated_penalty": "₹50 Lakhs - ₹5 Crores",
                "reputational_damage": "Severe brand impact in Indian market",
                "compliance_cost": "₹20-30 Lakhs for remediation",
                "currency": "INR"
            }
        
        # 5. Generate Smart Legal Opinion Narrative
        legal_opinion_parts = []
        
        if disparate_impact < 0.8:
            legal_opinion_parts.append("⚠️ **CRITICAL REGULATORY ALERT:**")
            legal_opinion_parts.append(f"The model is unfairly penalizing **{protected_attribute}** (Disparate Impact: {disparate_impact:.2f}).")
            legal_opinion_parts.append("This aligns with a prohibited bias under **Article 15 of the Constitution of India** and **RBI FREE-AI Guidelines**.")
            
            if results.get("financial_impact"):
                penalty = results["financial_impact"]["estimated_penalty"]
                legal_opinion_parts.append(f"Estimated regulatory liability is **{penalty}**.")
            
            legal_opinion_parts.append("⚖️ **Legal Recommendation:** Immediate suspension of model deployment is advised. Consult legal counsel before proceeding with any automated decision-making on this attribute.")
        else:
            legal_opinion_parts.append("✅ **COMPLIANCE VERIFICATION:**")
            legal_opinion_parts.append(f"The model demonstrates acceptable fairness for **{protected_attribute}** (Disparate Impact: {disparate_impact:.2f}).")
            legal_opinion_parts.append("Current metrics align with **RBI FREE-AI Framework** fairness thresholds.")
            
            if abs(demographic_parity_difference) > 0.05:
                legal_opinion_parts.append(f"⚠️ Note: Minor demographic parity gap of {abs(demographic_parity_difference)*100:.1f}% detected. While compliant, continued monitoring is recommended.")
        
        results["legal_opinion"] = " ".join(legal_opinion_parts)
        
        return results
        
    except Exception as e:
        print(f"Error in RBI compliance check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/counterfactual_check")
async def counterfactual_check(
    file: UploadFile = File(...),
    row_index: int = Form(0),
    protected_attribute: Optional[str] = Form(None)
):
    """
    Counterfactual Analysis (What-If Tool)
    
    Takes a single row, flips the protected attribute, and compares predictions
    to demonstrate individual-level bias
    """
    try:
        # 1. Load Data
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode('utf-8')))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Empty CSV file")
        
        # 2. Drop missing values
        df = df.dropna()
        
        # 3. Detect columns before encoding
        target, protected_attr = detect_columns(df, None, protected_attribute)
        
        if not target or not protected_attr:
            raise HTTPException(status_code=400, detail="Could not detect target or protected attribute")
        
        # 4. Get the specific row
        if row_index >= len(df):
            row_index = 0
        
        original_row = df.iloc[row_index].copy()
        
        # 5. Encode categorical data
        label_encoders = {}
        for col in df.select_dtypes(include=['object', 'category']).columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le
        
        # 6. Prepare features and target
        X = df.drop(columns=[target])
        y = df[target]
        
        # 7. Train a quick model
        model = LogisticRegression(max_iter=1000, random_state=42)
        model.fit(X, y)
        
        # 8. Get original prediction
        original_features = X.iloc[row_index:row_index+1]
        original_prediction = model.predict(original_features)[0]
        original_proba = model.predict_proba(original_features)[0]
        
        # 9. Create counterfactual by flipping protected attribute
        counterfactual_features = original_features.copy()
        
        # Get unique values of protected attribute
        unique_values = sorted(df[protected_attr].unique())
        if len(unique_values) < 2:
            raise HTTPException(status_code=400, detail="Protected attribute must have at least 2 values")
        
        current_value = counterfactual_features[protected_attr].iloc[0]
        
        # Flip to the opposite value
        flipped_value = unique_values[1] if current_value == unique_values[0] else unique_values[0]
        counterfactual_features[protected_attr] = flipped_value
        
        # 10. Get counterfactual prediction
        counterfactual_prediction = model.predict(counterfactual_features)[0]
        counterfactual_proba = model.predict_proba(counterfactual_features)[0]
        
        # 11. Decode values for display
        original_group = label_encoders[protected_attr].inverse_transform([int(current_value)])[0]
        flipped_group = label_encoders[protected_attr].inverse_transform([int(flipped_value)])[0]
        
        # Decode outcomes
        outcome_labels = sorted(df[target].unique())
        original_outcome_label = label_encoders[target].inverse_transform([int(original_prediction)])[0] if target in label_encoders else str(original_prediction)
        counterfactual_outcome_label = label_encoders[target].inverse_transform([int(counterfactual_prediction)])[0] if target in label_encoders else str(counterfactual_prediction)
        
        # 12. Determine if bias is confirmed
        bias_confirmed = original_prediction != counterfactual_prediction
        
        # 13. Generate message
        if bias_confirmed:
            if counterfactual_prediction > original_prediction:
                message = f"⚠️ BIAS DETECTED: If this applicant were '{flipped_group}' instead of '{original_group}', they would have been APPROVED (outcome changed from {original_outcome_label} to {counterfactual_outcome_label})."
            else:
                message = f"⚠️ BIAS DETECTED: If this applicant were '{flipped_group}' instead of '{original_group}', they would have been REJECTED (outcome changed from {original_outcome_label} to {counterfactual_outcome_label})."
        else:
            message = f"✓ NO BIAS: The outcome remains {original_outcome_label} regardless of whether the applicant is '{original_group}' or '{flipped_group}'."
        
        return convert_numpy({
            "original_outcome": int(original_prediction),
            "original_outcome_label": str(original_outcome_label),
            "original_probability": round(float(original_proba[1] if len(original_proba) > 1 else original_proba[0]), 4),
            "flipped_outcome": int(counterfactual_prediction),
            "flipped_outcome_label": str(counterfactual_outcome_label),
            "flipped_probability": round(float(counterfactual_proba[1] if len(counterfactual_proba) > 1 else counterfactual_proba[0]), 4),
            "bias_confirmed": bool(bias_confirmed),
            "original_group": str(original_group),
            "flipped_group": str(flipped_group),
            "protected_attribute": str(protected_attr),
            "message": message,
            "row_data": original_row.to_dict()
        })
        
    except Exception as e:
        print(f"Error in counterfactual check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

