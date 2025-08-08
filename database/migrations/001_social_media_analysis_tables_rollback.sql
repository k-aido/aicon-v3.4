-- Rollback Migration: Remove social media analysis tables
-- Description: Removes tables and modifications added for social media analysis

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their account's social media jobs" ON social_media_jobs;
DROP POLICY IF EXISTS "Users can create social media jobs for their account" ON social_media_jobs;
DROP POLICY IF EXISTS "Users can update their account's social media jobs" ON social_media_jobs;
DROP POLICY IF EXISTS "Users can view their account's social media content" ON social_media_content;
DROP POLICY IF EXISTS "Users can create social media content for their account" ON social_media_content;
DROP POLICY IF EXISTS "Users can update their account's social media content" ON social_media_content;

-- Drop triggers
DROP TRIGGER IF EXISTS update_social_media_jobs_updated_at ON social_media_jobs;
DROP TRIGGER IF EXISTS update_social_media_content_updated_at ON social_media_content;

-- Drop indexes
DROP INDEX IF EXISTS idx_social_media_jobs_account_status;
DROP INDEX IF EXISTS idx_social_media_jobs_external_id;
DROP INDEX IF EXISTS idx_social_media_jobs_webhook_token;
DROP INDEX IF EXISTS idx_social_media_jobs_created_at;
DROP INDEX IF EXISTS idx_social_media_content_account_platform;
DROP INDEX IF EXISTS idx_social_media_content_job_id;
DROP INDEX IF EXISTS idx_social_media_content_platform_id;
DROP INDEX IF EXISTS idx_social_media_content_processing_status;
DROP INDEX IF EXISTS idx_social_media_content_content_piece;
DROP INDEX IF EXISTS idx_social_media_content_published_at;
DROP INDEX IF EXISTS idx_social_media_content_hashtags;
DROP INDEX IF EXISTS idx_social_media_content_raw_data;
DROP INDEX IF EXISTS idx_content_analysis_hook;
DROP INDEX IF EXISTS idx_content_analysis_body;
DROP INDEX IF EXISTS idx_content_analysis_cta;

-- Remove columns from content_analysis table
ALTER TABLE content_analysis
DROP COLUMN IF EXISTS hook_analysis,
DROP COLUMN IF EXISTS body_analysis,
DROP COLUMN IF EXISTS cta_analysis,
DROP COLUMN IF EXISTS hook_score,
DROP COLUMN IF EXISTS hook_type,
DROP COLUMN IF EXISTS primary_cta,
DROP COLUMN IF EXISTS cta_strength,
DROP COLUMN IF EXISTS content_structure;

-- Drop tables
DROP TABLE IF EXISTS social_media_content;
DROP TABLE IF EXISTS social_media_jobs;