# Database Schema Summary

## Quick Reference

### Tables Created

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `datasets` | User-uploaded files | File metadata, processed data (JSONB), extraction confirmation |
| `analyses` | Analysis runs | **Versioning support** (v1, v2, v3...), status tracking, LLM suggestions |
| `analysis_details` | Bias detection results | Statistical results (JSONB), LLM reports, limitations |
| `chat_messages` | Chatbot conversations | Linked to analysis versions, re-analysis tracking |
| `audit_logs` | Event tracking | Audit trail for all important actions |

### Relationships

```
auth.users (Supabase)
    │
    ├── datasets (1:N)
    │       │
    │       └── analyses (1:N versions)
    │               │
    │               ├── analysis_details (1:1)
    │               └── chat_messages (1:N)
    │
    └── audit_logs (1:N)
```

## Key Features

### ✅ Row-Level Security (RLS)
- **All tables** have RLS enabled
- Users can **only access their own data**
- Anonymous users have **NO access**
- Enforced via `auth.uid() = user_id` policies

### ✅ Versioned Analyses
- Each re-analysis creates a **new version** (v1, v2, v3...)
- Automatic version increment via trigger
- Unique constraint on `(dataset_id, version)`
- Chat messages linked to specific versions

### ✅ JSONB Flexibility
- `processed_data` - Flexible storage for CSV/PDF/Image data
- `statistical_results` - Deterministic calculations
- `bias_signals` - Aggregated findings
- `limitations` - Array of caveats

### ✅ Audit Trail
- All important events logged in `audit_logs`
- Re-analysis actions tracked
- Chat interactions recorded

## Security Guarantees

| Requirement | Implementation |
|-------------|----------------|
| Authentication required | RLS policies check `auth.uid()` |
| Data isolation | `user_id` foreign key + RLS |
| No anonymous access | All policies require authenticated user |
| API keys protected | Not stored in database |
| User data separation | RLS enforced at database level |

## Important Constraints

### LLM Usage Boundaries

| Column | LLM Allowed? | Purpose |
|--------|--------------|---------|
| `inferred_domain` | ✅ Yes | Interpretation only |
| `suggested_sensitive_attributes` | ✅ Yes | Suggestions (user confirms) |
| `statistical_results` | ❌ **NO** | Deterministic calculations ONLY |
| `llm_report` | ✅ Yes | Explanation of existing results |
| `bias_signals` | ❌ **NO** | Aggregated from calculations |

### Data Flow

```
1. User uploads file → datasets table
2. System processes file → processed_data (JSONB)
3. LLM suggests domain → inferred_domain (user confirms)
4. Deterministic analysis → statistical_results (NO LLM)
5. LLM explains results → llm_report (explanation only)
6. User chats → chat_messages
7. User requests re-analysis → new analyses row (version++)
```

## Files Created

1. **`database/schema.sql`** - Complete SQL schema with:
   - Table definitions
   - Indexes
   - RLS policies
   - Triggers and functions
   - Comments

2. **`database/README.md`** - Comprehensive documentation with:
   - Table explanations
   - Relationship diagrams
   - JSONB structure examples
   - Usage examples
   - Security guarantees

3. **`database/SUMMARY.md`** (this file) - Quick reference

## Next Steps

1. **Set up Supabase project**
   - Create new project at supabase.com
   - Note the database URL and anon key

2. **Run migration**
   ```sql
   -- In Supabase SQL Editor
   -- Copy and paste schema.sql
   ```

3. **Verify RLS**
   - Test that users can only see their own data
   - Verify anonymous users cannot access anything

4. **Configure Storage**
   - Create bucket for file uploads
   - Set up RLS policies for storage

5. **Test schema**
   - Insert test data
   - Verify versioning works
   - Test RLS policies

## Commands to Run Schema

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `schema.sql`
3. Click "Run"

### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

### Option 3: Direct PostgreSQL
```bash
psql -h your-db-host -U postgres -d postgres -f database/schema.sql
```

## Verification Queries

### Check RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All should show rowsecurity = true
```

### Check policies exist
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
-- Should show 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
```

### Test versioning
```sql
-- Insert first analysis
INSERT INTO analyses (dataset_id, user_id) 
VALUES ('test-dataset-id', auth.uid());
-- Check version = 1

-- Insert second analysis (re-analysis)
INSERT INTO analyses (dataset_id, user_id) 
VALUES ('test-dataset-id', auth.uid());
-- Check version = 2
```

## Schema Statistics

- **Tables**: 5 (+ auth.users from Supabase)
- **RLS Policies**: 17 total
- **Triggers**: 2 (updated_at, auto-version)
- **Functions**: 2 (update timestamp, set version)
- **Indexes**: 15 for performance
- **Foreign Keys**: 11 for referential integrity

## PRD Compliance Checklist

- ✅ PostgreSQL / Supabase compatible
- ✅ References `auth.users` (not recreated)
- ✅ Supports versioned analyses (v1, v2, v3...)
- ✅ Chat messages linked to analysis versions
- ✅ Anonymous users cannot write to database
- ✅ RLS policies enforce data isolation
- ✅ JSON columns for flexible bias results
- ✅ No OpenAI logic in schema
- ✅ No bias detection logic in schema
- ✅ Database design only (as requested)
