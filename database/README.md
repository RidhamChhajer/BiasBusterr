# Bias Buster v1 - Database Schema Documentation

## Overview

This document explains the database schema for Bias Buster v1, designed for PostgreSQL and Supabase compatibility.

## Core Principles

1. **Row-Level Security (RLS)**: All tables enforce RLS to ensure users can only access their own data
2. **Versioned Analyses**: Support for re-analysis with version tracking (v1, v2, v3...)
3. **Deterministic Storage**: Statistical results are stored as calculated, never modified by LLMs
4. **Audit Trail**: All important actions are logged for transparency

## Tables

### 1. `datasets`

**Purpose**: Stores user-uploaded datasets (CSV, PDF, Image files)

**Key Columns**:
- `id` - Unique identifier
- `user_id` - References Supabase `auth.users` table
- `filename` - Original filename
- `file_type` - Type: 'csv', 'pdf', or 'image'
- `file_path` - Storage path (e.g., Supabase Storage bucket)
- `system_description` - User-provided description of what the data represents
- `processed_data` - JSONB containing parsed/extracted data
- `extraction_confirmed` - Boolean flag for PDF/Image confirmation

**Relationships**:
- One dataset can have many analyses (one-to-many)
- Belongs to one user (many-to-one)

**RLS Policies**:
- Users can SELECT, INSERT, UPDATE, DELETE only their own datasets
- Anonymous users have NO access

---

### 2. `analyses`

**Purpose**: Tracks analysis runs with version support for re-analysis

**Key Columns**:
- `id` - Unique identifier
- `dataset_id` - References datasets table
- `user_id` - References auth.users
- `version` - Auto-incremented version number (1, 2, 3...)
- `status` - 'pending', 'processing', 'completed', or 'failed'
- `inferred_domain` - LLM-suggested domain (e.g., 'healthcare', 'hiring')
- `suggested_sensitive_attributes` - JSONB array of LLM suggestions
- `user_confirmed_attributes` - JSONB array of user-confirmed attributes
- `analysis_config` - JSONB storing analysis settings

**Versioning**:
- Each re-analysis creates a new row with incremented version
- Trigger `auto_set_analysis_version` automatically sets the version
- Unique constraint on (dataset_id, version)

**Relationships**:
- Belongs to one dataset (many-to-one)
- Has one analysis_details record (one-to-one)
- Can have many chat_messages (one-to-many)

**RLS Policies**:
- Users can SELECT, INSERT, UPDATE, DELETE only their own analyses

---

### 3. `analysis_details`

**Purpose**: Stores detailed bias detection results and LLM-generated reports

**Key Columns**:
- `id` - Unique identifier
- `analysis_id` - References analyses table
- `user_id` - References auth.users
- `statistical_results` - JSONB containing deterministic calculations
- `rule_based_findings` - JSONB containing rule-based check results
- `bias_signals` - JSONB with aggregated bias indicators
- `llm_report` - Natural language explanation (LLM-generated)
- `limitations` - JSONB array of caveats and limitations

**JSONB Structure Examples**:

```json
// statistical_results
{
  "statistical_parity": {
    "value": 0.15,
    "threshold": 0.1,
    "violated": true,
    "confidence_interval": [0.12, 0.18]
  },
  "disparate_impact": {
    "ratio": 0.72,
    "threshold": 0.8,
    "violated": true
  }
}

// bias_signals
{
  "overall_risk": "high",
  "detected_biases": ["gender", "age"],
  "uncertainty_level": "medium",
  "sample_size_adequate": true
}

// limitations
[
  "Small sample size for subgroup X",
  "Missing data in column Y",
  "Correlation does not imply causation"
]
```

**Important**: 
- `statistical_results` contains ONLY deterministic calculations
- `llm_report` is for explanation, NOT detection
- LLMs never modify the statistical results

**Relationships**:
- Belongs to one analysis (one-to-one)

**RLS Policies**:
- Users can SELECT, INSERT, UPDATE, DELETE only their own analysis details

---

### 4. `chat_messages`

**Purpose**: Stores chatbot conversations linked to specific analysis versions

**Key Columns**:
- `id` - Unique identifier
- `analysis_id` - References analyses table (specific version)
- `user_id` - References auth.users
- `role` - 'user' or 'assistant'
- `content` - Message text
- `triggered_reanalysis` - Boolean flag if message led to re-analysis
- `reanalysis_id` - References new analysis version if triggered

**Chat Behavior**:
- Chatbot explains existing results from `analysis_details`
- Can accept user corrections/clarifications
- May trigger re-analysis (creates new analysis version)
- All interactions are logged

**Relationships**:
- Belongs to one analysis version (many-to-one)
- May reference a new analysis if re-analysis was triggered

**RLS Policies**:
- Users can SELECT, INSERT, DELETE only their own chat messages

---

### 5. `audit_logs` (Optional but Recommended)

**Purpose**: Audit trail for all important system events

**Key Columns**:
- `id` - Unique identifier
- `user_id` - References auth.users
- `event_type` - Type of event (e.g., 'dataset_uploaded', 'reanalysis_triggered')
- `dataset_id` - Optional reference to dataset
- `analysis_id` - Optional reference to analysis
- `event_data` - JSONB for event-specific data

**Event Types**:
- `dataset_uploaded`
- `analysis_started`
- `analysis_completed`
- `reanalysis_triggered`
- `chat_interaction`
- `user_correction_applied`

**RLS Policies**:
- Users can SELECT, INSERT only their own audit logs

---

## Relationships Diagram

```
auth.users (Supabase managed)
    ↓
datasets (1:N)
    ↓
analyses (1:N versions)
    ↓
    ├── analysis_details (1:1)
    └── chat_messages (1:N)
```

## Key Features

### 1. Versioning Support

Re-analysis creates a new `analyses` row with incremented version:

```sql
-- First analysis
INSERT INTO analyses (dataset_id, user_id) VALUES (...);
-- version = 1 (auto-set by trigger)

-- Re-analysis
INSERT INTO analyses (dataset_id, user_id) VALUES (...);
-- version = 2 (auto-set by trigger)
```

### 2. Row-Level Security

All tables have RLS policies using `auth.uid()`:

```sql
-- Example policy
CREATE POLICY "Users can view their own datasets"
  ON datasets
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Anonymous users cannot**:
- Read any data
- Write any data
- Access any analysis results

### 3. JSONB Flexibility

JSONB columns allow flexible storage while maintaining structure:
- `processed_data` - Varies by file type
- `statistical_results` - Different metrics per analysis
- `bias_signals` - Extensible bias indicators
- `limitations` - Variable number of caveats

### 4. Automatic Triggers

- `update_datasets_updated_at` - Auto-updates `updated_at` timestamp
- `auto_set_analysis_version` - Auto-increments version number

## Security Guarantees

✅ **Authentication Required**: All operations require authenticated user  
✅ **Data Isolation**: Users can only access their own data via RLS  
✅ **No Anonymous Access**: Anonymous users cannot read or write  
✅ **Audit Trail**: All re-analysis actions are logged  
✅ **Referential Integrity**: Foreign keys ensure data consistency  

## Usage Examples

### Upload Dataset

```sql
INSERT INTO datasets (user_id, filename, file_type, file_size_bytes, file_path, system_description)
VALUES (auth.uid(), 'hiring_data.csv', 'csv', 1024000, 'uploads/abc123.csv', 'Hiring decisions from 2023');
```

### Start Analysis

```sql
INSERT INTO analyses (dataset_id, user_id, status)
VALUES ('dataset-uuid', auth.uid(), 'processing');
-- version is auto-set to 1
```

### Store Results

```sql
INSERT INTO analysis_details (analysis_id, user_id, statistical_results, bias_signals, llm_report)
VALUES (
  'analysis-uuid',
  auth.uid(),
  '{"statistical_parity": {...}}'::jsonb,
  '{"overall_risk": "high"}'::jsonb,
  'The analysis found significant disparities...'
);
```

### Chat Message

```sql
INSERT INTO chat_messages (analysis_id, user_id, role, content)
VALUES ('analysis-uuid', auth.uid(), 'user', 'Why is gender flagged as biased?');
```

### Trigger Re-analysis

```sql
-- Create new analysis version
INSERT INTO analyses (dataset_id, user_id, version, status)
VALUES ('dataset-uuid', auth.uid(), 2, 'processing');

-- Update chat message to link to re-analysis
UPDATE chat_messages
SET triggered_reanalysis = true, reanalysis_id = 'new-analysis-uuid'
WHERE id = 'chat-message-uuid';
```

## Migration and Setup

### For Supabase

1. Run the schema SQL in Supabase SQL Editor
2. RLS is automatically enforced
3. `auth.users` table already exists
4. Use Supabase Storage for file uploads

### For Self-Hosted PostgreSQL

1. Set up authentication system that populates `auth.users`
2. Enable RLS extension
3. Run the schema SQL
4. Configure file storage separately

## Next Steps

After creating the schema:
1. Set up Supabase project
2. Run migration SQL
3. Configure Supabase Storage buckets
4. Test RLS policies
5. Implement API endpoints that use these tables
