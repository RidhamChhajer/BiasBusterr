-- =====================================================
-- Bias Buster v1 - Database Schema
-- PostgreSQL / Supabase Compatible
-- =====================================================

-- This schema is designed for Supabase and uses:
-- 1. auth.users table (managed by Supabase Auth)
-- 2. Row Level Security (RLS) for data isolation
-- 3. Versioned analyses to support re-analysis
-- 4. JSON columns for flexible bias results

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables (will be done per table below)

-- =====================================================
-- TABLE: datasets
-- =====================================================
-- Stores uploaded datasets (CSV, PDF, Image)
-- Each dataset belongs to a user and can have multiple analyses

CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File information
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('csv', 'pdf', 'image')),
  file_size_bytes INTEGER NOT NULL,
  file_path TEXT NOT NULL, -- Storage path (e.g., Supabase Storage bucket path)
  
  -- System description provided by user
  system_description TEXT NOT NULL,
  
  -- Extracted/processed data
  -- For CSV: parsed data
  -- For PDF/Image: extracted data after user confirmation
  processed_data JSONB,
  
  -- Metadata
  extraction_confirmed BOOLEAN DEFAULT false, -- For PDF/Image only
  extraction_method VARCHAR(50), -- 'direct' for CSV, 'pdf-extract', 'ocr'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  --CONSTRAINT datasets_user_id_idx CHECK (user_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_created_at ON datasets(created_at DESC);

-- Enable RLS
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for datasets
-- Users can only see their own datasets
CREATE POLICY "Users can view their own datasets"
  ON datasets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own datasets
CREATE POLICY "Users can insert their own datasets"
  ON datasets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own datasets
CREATE POLICY "Users can update their own datasets"
  ON datasets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own datasets
CREATE POLICY "Users can delete their own datasets"
  ON datasets
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: analyses
-- =====================================================
-- Stores analysis runs for each dataset
-- Supports versioning (v1, v2, v3...) for re-analysis

CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Analysis status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Domain inference (from LLM - interpretation only)
  inferred_domain VARCHAR(100), -- e.g., 'healthcare', 'hiring', 'lending'
  suggested_sensitive_attributes JSONB, -- Array of suggested attributes
  user_confirmed_attributes JSONB, -- User-confirmed sensitive attributes
  
  -- Analysis configuration
  analysis_config JSONB, -- Settings used for this analysis
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  
  -- Ensure version uniqueness per dataset
  UNIQUE(dataset_id, version)
);

-- Create indexes
CREATE INDEX idx_analyses_dataset_id ON analyses(dataset_id);
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_started_at ON analyses(started_at DESC);

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses
CREATE POLICY "Users can view their own analyses"
  ON analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON analyses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: analysis_details
-- =====================================================
-- Stores detailed bias detection results for each analysis
-- Uses JSONB for flexible storage of statistical results

CREATE TABLE analysis_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Statistical results (deterministic calculations ONLY)
  statistical_results JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "statistical_parity": {
  --     "value": 0.15,
  --     "threshold": 0.1,
  --     "violated": true,
  --     "confidence_interval": [0.12, 0.18]
  --   },
  --   "disparate_impact": {
  --     "ratio": 0.72,
  --     "threshold": 0.8,
  --     "violated": true
  --   },
  --   "equal_opportunity": { ... }
  -- }
  
  -- Rule-based findings
  rule_based_findings JSONB,
  -- Example structure:
  -- [
  --   {
  --     "rule": "four_fifths_rule",
  --     "result": "violated",
  --     "details": "..."
  --   }
  -- ]
  
  -- Aggregated bias signals
  bias_signals JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "overall_risk": "high",
  --   "detected_biases": ["gender", "age"],
  --   "uncertainty_level": "medium",
  --   "sample_size_adequate": true
  -- }
  
  -- LLM-generated report (explanation ONLY, not detection)
  llm_report TEXT,
  -- Natural language explanation of the statistical findings
  
  -- Limitations and caveats
  limitations JSONB,
  -- Example structure:
  -- [
  --   "Small sample size for subgroup X",
  --   "Missing data in column Y",
  --   "Correlation does not imply causation"
  -- ]
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE analysis_details
ADD CONSTRAINT unique_analysis_details
UNIQUE (analysis_id);


-- Create indexes
CREATE INDEX idx_analysis_details_analysis_id ON analysis_details(analysis_id);
CREATE INDEX idx_analysis_details_user_id ON analysis_details(user_id);

-- Enable RLS
ALTER TABLE analysis_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_details
CREATE POLICY "Users can view their own analysis details"
  ON analysis_details
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis details"
  ON analysis_details
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis details"
  ON analysis_details
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis details"
  ON analysis_details
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: chat_messages
-- =====================================================
-- Stores chatbot conversations linked to specific analysis versions
-- Chatbot explains existing results, does NOT create new findings

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata
  -- Track if message triggered a re-analysis
  triggered_reanalysis BOOLEAN DEFAULT false,
  reanalysis_id UUID REFERENCES analyses(id), -- Links to new analysis version if triggered
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure messages are ordered
  CONSTRAINT chat_messages_order CHECK (created_at IS NOT NULL)
);

-- Create indexes
CREATE INDEX idx_chat_messages_analysis_id ON chat_messages(analysis_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users typically don't update or delete individual messages
-- But we'll allow deletion for cleanup
CREATE POLICY "Users can delete their own chat messages"
  ON chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- AUDIT LOG TABLE (Optional but Recommended)
-- =====================================================
-- Tracks all re-analysis actions and important events

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event information
  event_type VARCHAR(100) NOT NULL,
  -- Examples: 'dataset_uploaded', 'analysis_started', 'analysis_completed', 
  --           'reanalysis_triggered', 'chat_interaction'
  
  -- Related entities
  dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  
  -- Event details
  event_data JSONB,
  -- Flexible storage for event-specific data
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for datasets table
CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-increment analysis version
-- Get the max version for this dataset and increment
CREATE OR REPLACE FUNCTION set_analysis_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
  INTO next_version
  FROM analyses
  WHERE dataset_id = NEW.dataset_id;

  NEW.version := next_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Trigger to auto-set version on insert
CREATE TRIGGER auto_set_analysis_version
  BEFORE INSERT ON analyses
  FOR EACH ROW
  --WHEN (NEW.version IS NULL OR NEW.version = 1)
  EXECUTE FUNCTION set_analysis_version();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE datasets IS 'Stores user-uploaded datasets with file metadata and processed data';
COMMENT ON TABLE analyses IS 'Tracks analysis runs with versioning support for re-analysis';
COMMENT ON TABLE analysis_details IS 'Stores detailed bias detection results and LLM-generated reports';
COMMENT ON TABLE chat_messages IS 'Stores chatbot conversations linked to analysis versions';
COMMENT ON TABLE audit_logs IS 'Audit trail for all important system events';

COMMENT ON COLUMN datasets.processed_data IS 'JSONB storage for parsed CSV data or confirmed PDF/OCR extractions';
COMMENT ON COLUMN analyses.version IS 'Auto-incremented version number for each re-analysis of the same dataset';
COMMENT ON COLUMN analysis_details.statistical_results IS 'Deterministic statistical calculations ONLY - no LLM involvement';
COMMENT ON COLUMN analysis_details.llm_report IS 'LLM-generated explanation of statistical findings - NOT bias detection';
COMMENT ON COLUMN chat_messages.triggered_reanalysis IS 'Tracks if this chat interaction led to a re-analysis request';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
