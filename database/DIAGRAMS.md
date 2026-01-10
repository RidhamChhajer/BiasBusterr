# Database Schema - Visual Diagram

## Entity Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--o{ DATASETS : "owns"
    AUTH_USERS ||--o{ ANALYSES : "owns"
    AUTH_USERS ||--o{ ANALYSIS_DETAILS : "owns"
    AUTH_USERS ||--o{ CHAT_MESSAGES : "owns"
    AUTH_USERS ||--o{ AUDIT_LOGS : "owns"
    
    DATASETS ||--o{ ANALYSES : "has many versions"
    ANALYSES ||--|| ANALYSIS_DETAILS : "has one"
    ANALYSES ||--o{ CHAT_MESSAGES : "has many"
    ANALYSES ||--o{ AUDIT_LOGS : "references"
    DATASETS ||--o{ AUDIT_LOGS : "references"
    
    ANALYSES ||--o{ ANALYSES : "triggers reanalysis"

    AUTH_USERS {
        uuid id PK
        string email
        timestamp created_at
    }

    DATASETS {
        uuid id PK
        uuid user_id FK
        varchar filename
        varchar file_type
        integer file_size_bytes
        text file_path
        text system_description
        jsonb processed_data
        boolean extraction_confirmed
        varchar extraction_method
        timestamp created_at
        timestamp updated_at
    }

    ANALYSES {
        uuid id PK
        uuid dataset_id FK
        uuid user_id FK
        integer version
        varchar status
        varchar inferred_domain
        jsonb suggested_sensitive_attributes
        jsonb user_confirmed_attributes
        jsonb analysis_config
        timestamp started_at
        timestamp completed_at
        text error_message
    }

    ANALYSIS_DETAILS {
        uuid id PK
        uuid analysis_id FK
        uuid user_id FK
        jsonb statistical_results
        jsonb rule_based_findings
        jsonb bias_signals
        text llm_report
        jsonb limitations
        timestamp created_at
    }

    CHAT_MESSAGES {
        uuid id PK
        uuid analysis_id FK
        uuid user_id FK
        varchar role
        text content
        boolean triggered_reanalysis
        uuid reanalysis_id FK
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar event_type
        uuid dataset_id FK
        uuid analysis_id FK
        jsonb event_data
        timestamp created_at
    }
```

## Data Flow Diagram

```mermaid
flowchart TD
    A[User Uploads File] --> B[datasets table]
    B --> C{File Type?}
    C -->|CSV| D[Direct Parse]
    C -->|PDF| E[Extract + Confirm]
    C -->|Image| F[OCR + Confirm]
    
    D --> G[processed_data JSONB]
    E --> G
    F --> G
    
    G --> H[User Provides System Description]
    H --> I[Create Analysis v1]
    I --> J[analyses table]
    
    J --> K[LLM Suggests Domain]
    K --> L[User Confirms Attributes]
    L --> M[Run Deterministic Analysis]
    
    M --> N[Statistical Tests]
    M --> O[Rule-Based Checks]
    
    N --> P[statistical_results]
    O --> Q[rule_based_findings]
    
    P --> R[Aggregate Signals]
    Q --> R
    R --> S[bias_signals]
    
    S --> T[LLM Generates Report]
    T --> U[analysis_details table]
    
    U --> V[User Views Results]
    V --> W[User Chats]
    W --> X[chat_messages table]
    
    X --> Y{Re-analysis Needed?}
    Y -->|Yes| Z[Create Analysis v2]
    Y -->|No| AA[Continue Chat]
    
    Z --> J
    
    style M fill:#90EE90
    style N fill:#90EE90
    style O fill:#90EE90
    style P fill:#90EE90
    style Q fill:#90EE90
    style R fill:#90EE90
    style K fill:#FFB6C1
    style T fill:#FFB6C1
    
    classDef deterministic fill:#90EE90,stroke:#006400
    classDef llm fill:#FFB6C1,stroke:#8B0000
```

**Legend:**
- 🟢 Green boxes = Deterministic (no LLM)
- 🔴 Pink boxes = LLM (interpretation/explanation only)

## Versioning Flow

```mermaid
sequenceDiagram
    participant U as User
    participant D as datasets
    participant A as analyses
    participant AD as analysis_details
    participant C as chat_messages
    
    U->>D: Upload dataset
    D-->>U: dataset_id
    
    U->>A: Start analysis
    Note over A: version = 1 (auto)
    A->>AD: Store results
    AD-->>U: Show report
    
    U->>C: Ask question
    C-->>U: Chatbot explains
    
    U->>C: Request correction
    Note over C: triggered_reanalysis = true
    
    U->>A: Trigger re-analysis
    Note over A: version = 2 (auto)
    A->>AD: Store new results
    AD-->>U: Show updated report
    
    U->>C: Continue chat
    Note over C: Linked to v2
```

## RLS Security Model

```mermaid
flowchart LR
    A[User Request] --> B{Authenticated?}
    B -->|No| C[DENY ALL]
    B -->|Yes| D[Get auth.uid]
    
    D --> E{Query Type?}
    
    E -->|SELECT| F[Filter: user_id = auth.uid]
    E -->|INSERT| G[Check: user_id = auth.uid]
    E -->|UPDATE| H[Check: user_id = auth.uid]
    E -->|DELETE| I[Check: user_id = auth.uid]
    
    F --> J[Return Only User's Data]
    G --> K{Valid?}
    H --> K
    I --> K
    
    K -->|Yes| L[ALLOW]
    K -->|No| M[DENY]
    
    style C fill:#FF6B6B
    style M fill:#FF6B6B
    style L fill:#51CF66
    style J fill:#51CF66
```

## JSONB Structure Examples

### statistical_results

```json
{
  "statistical_parity": {
    "value": 0.15,
    "threshold": 0.1,
    "violated": true,
    "confidence_interval": [0.12, 0.18],
    "groups_compared": ["male", "female"]
  },
  "disparate_impact": {
    "ratio": 0.72,
    "threshold": 0.8,
    "violated": true,
    "four_fifths_rule": "failed"
  },
  "equal_opportunity": {
    "difference": 0.08,
    "threshold": 0.05,
    "violated": true,
    "true_positive_rates": {
      "group_a": 0.85,
      "group_b": 0.77
    }
  }
}
```

### bias_signals

```json
{
  "overall_risk": "high",
  "risk_score": 0.78,
  "detected_biases": [
    {
      "attribute": "gender",
      "severity": "high",
      "metrics_violated": ["statistical_parity", "disparate_impact"]
    },
    {
      "attribute": "age",
      "severity": "medium",
      "metrics_violated": ["equal_opportunity"]
    }
  ],
  "uncertainty_level": "medium",
  "sample_size_adequate": true,
  "data_quality_score": 0.85
}
```

### limitations

```json
[
  "Sample size for age group 65+ is small (n=45), reducing statistical power",
  "Missing data in 'education' column (12% of records) may affect results",
  "Correlation does not imply causation - observed disparities may have legitimate explanations",
  "Analysis assumes binary gender classification - may not capture full diversity",
  "Historical data may not reflect current decision-making processes"
]
```

### processed_data (CSV example)

```json
{
  "columns": [
    {"name": "applicant_id", "type": "string"},
    {"name": "age", "type": "integer"},
    {"name": "gender", "type": "string"},
    {"name": "decision", "type": "boolean"}
  ],
  "row_count": 1500,
  "sample_rows": [
    {"applicant_id": "A001", "age": 32, "gender": "F", "decision": true},
    {"applicant_id": "A002", "age": 45, "gender": "M", "decision": false}
  ],
  "statistics": {
    "age": {"min": 18, "max": 72, "mean": 38.5},
    "gender": {"F": 720, "M": 780},
    "decision": {"true": 890, "false": 610}
  }
}
```

## Table Size Estimates

Assuming 1000 active users:

| Table | Rows per User | Total Rows | Storage per Row | Total Storage |
|-------|---------------|------------|-----------------|---------------|
| datasets | 10 | 10,000 | ~50 KB | ~500 MB |
| analyses | 30 (3 versions × 10 datasets) | 30,000 | ~2 KB | ~60 MB |
| analysis_details | 30 | 30,000 | ~20 KB | ~600 MB |
| chat_messages | 150 (5 msgs × 30 analyses) | 150,000 | ~500 B | ~75 MB |
| audit_logs | 100 | 100,000 | ~1 KB | ~100 MB |

**Total estimated storage**: ~1.3 GB for 1000 users

## Performance Considerations

### Indexes Created

- `datasets`: user_id, created_at
- `analyses`: dataset_id, user_id, status, started_at
- `analysis_details`: analysis_id, user_id
- `chat_messages`: analysis_id, user_id, created_at
- `audit_logs`: user_id, event_type, created_at

### Query Optimization Tips

1. **Always filter by user_id first** (RLS does this automatically)
2. **Use indexes for sorting** (created_at, started_at)
3. **JSONB queries**: Use GIN indexes if needed
   ```sql
   CREATE INDEX idx_statistical_results_gin ON analysis_details USING GIN (statistical_results);
   ```
4. **Pagination**: Use LIMIT/OFFSET with created_at ordering

## Backup and Maintenance

### Recommended Policies

- **Backups**: Daily automated backups (Supabase provides this)
- **Retention**: Keep analysis history for 1 year
- **Archival**: Move old datasets to cold storage after 6 months
- **Cleanup**: Soft delete with `deleted_at` timestamp (optional)

### Cleanup Queries

```sql
-- Find old datasets (>1 year)
SELECT id, filename, created_at 
FROM datasets 
WHERE created_at < NOW() - INTERVAL '1 year'
AND user_id = auth.uid();

-- Archive old analyses
UPDATE analyses 
SET status = 'archived' 
WHERE completed_at < NOW() - INTERVAL '6 months'
AND user_id = auth.uid();
```
