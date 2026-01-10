-- =====================================================
-- FIX: Database Trigger Error
-- =====================================================
-- Problem: set_analysis_version() uses FOR UPDATE with MAX()
-- PostgreSQL Error: "FOR UPDATE is not allowed with aggregate functions"
-- 
-- Solution: Use pg_advisory_xact_lock for safe versioning
-- =====================================================

-- Step 1: Drop the existing trigger
DROP TRIGGER IF EXISTS auto_set_analysis_version ON analyses;

-- Step 2: Drop the existing function
DROP FUNCTION IF EXISTS set_analysis_version();

-- Step 3: Create the corrected function
-- Uses advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION set_analysis_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  lock_key BIGINT;
BEGIN
  -- Create a lock key from dataset_id
  -- This ensures only one transaction can increment version for this dataset at a time
  lock_key := ('x' || substr(md5(NEW.dataset_id::text), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock (automatically released at transaction end)
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Now safely get the next version (no FOR UPDATE needed)
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM analyses
  WHERE dataset_id = NEW.dataset_id;
  
  NEW.version := next_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER auto_set_analysis_version
  BEFORE INSERT ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION set_analysis_version();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the trigger was created successfully:
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_set_analysis_version';

-- Expected output:
-- trigger_name: auto_set_analysis_version
-- event_manipulation: INSERT
-- event_object_table: analyses
-- action_statement: EXECUTE FUNCTION set_analysis_version()
