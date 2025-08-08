-- Migration: Add social media analysis tables
-- Description: Adds tables for Make.com webhook jobs and social media content analysis

-- 1. Social Media Jobs Table
-- Tracks Make.com webhook jobs for social media content processing
CREATE TABLE IF NOT EXISTS social_media_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Job identification
    external_job_id VARCHAR(255) UNIQUE, -- Make.com scenario execution ID
    webhook_token VARCHAR(255) NOT NULL, -- For webhook authentication
    
    -- Job details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'facebook')),
    content_url TEXT NOT NULL,
    job_type VARCHAR(50) DEFAULT 'content_import' CHECK (job_type IN ('content_import', 'bulk_import', 'scheduled_import')),
    
    -- Job status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    
    -- Processing details
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Webhook data from Make.com
    webhook_payload JSONB DEFAULT '{}',
    webhook_headers JSONB DEFAULT '{}',
    webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Results and errors
    result_data JSONB DEFAULT '{}',
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Social Media Content Table
-- Stores raw social media data before processing into content_pieces
CREATE TABLE IF NOT EXISTS social_media_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    social_media_job_id UUID REFERENCES social_media_jobs(id) ON DELETE CASCADE,
    
    -- Content identification
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'facebook')),
    platform_content_id VARCHAR(255), -- Platform-specific ID (video ID, post ID, etc.)
    content_url TEXT NOT NULL,
    
    -- Content type and format
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'image', 'text', 'carousel', 'story', 'reel', 'short')),
    media_urls JSONB DEFAULT '[]', -- Array of media URLs
    
    -- Content metadata
    title TEXT,
    description TEXT,
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    mentions TEXT[] DEFAULT '{}',
    
    -- Author information
    author_username VARCHAR(255),
    author_name VARCHAR(255),
    author_profile_url TEXT,
    author_avatar_url TEXT,
    author_metadata JSONB DEFAULT '{}',
    
    -- Engagement metrics
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    save_count BIGINT DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    
    -- Content details
    duration_seconds INTEGER, -- For videos
    thumbnail_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'raw' CHECK (processing_status IN ('raw', 'analyzing', 'processed', 'failed')),
    content_piece_id UUID REFERENCES content_pieces(id) ON DELETE SET NULL, -- Link to processed content
    
    -- Raw data from platform
    raw_data JSONB DEFAULT '{}', -- Complete API response
    
    -- AI Analysis preparation
    transcript TEXT, -- For videos
    extracted_text TEXT, -- OCR or extracted text
    detected_language VARCHAR(10),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Extend content_analysis table with new analysis fields
ALTER TABLE content_analysis
ADD COLUMN IF NOT EXISTS hook_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS body_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cta_analysis JSONB DEFAULT '{}';

-- Add structured analysis columns for better querying
ALTER TABLE content_analysis
ADD COLUMN IF NOT EXISTS hook_score DECIMAL(3,2) CHECK (hook_score >= 0 AND hook_score <= 1),
ADD COLUMN IF NOT EXISTS hook_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS primary_cta VARCHAR(255),
ADD COLUMN IF NOT EXISTS cta_strength VARCHAR(20) CHECK (cta_strength IN ('strong', 'moderate', 'weak', 'none')),
ADD COLUMN IF NOT EXISTS content_structure VARCHAR(50) CHECK (content_structure IN ('problem-solution', 'storytelling', 'educational', 'entertainment', 'testimonial', 'comparison', 'other'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_media_jobs_account_status ON social_media_jobs(account_id, status);
CREATE INDEX IF NOT EXISTS idx_social_media_jobs_external_id ON social_media_jobs(external_job_id);
CREATE INDEX IF NOT EXISTS idx_social_media_jobs_webhook_token ON social_media_jobs(webhook_token);
CREATE INDEX IF NOT EXISTS idx_social_media_jobs_created_at ON social_media_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_media_content_account_platform ON social_media_content(account_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_media_content_job_id ON social_media_content(social_media_job_id);
CREATE INDEX IF NOT EXISTS idx_social_media_content_platform_id ON social_media_content(platform, platform_content_id);
CREATE INDEX IF NOT EXISTS idx_social_media_content_processing_status ON social_media_content(processing_status);
CREATE INDEX IF NOT EXISTS idx_social_media_content_content_piece ON social_media_content(content_piece_id);
CREATE INDEX IF NOT EXISTS idx_social_media_content_published_at ON social_media_content(published_at DESC);

-- Create GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_social_media_content_hashtags ON social_media_content USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_social_media_content_raw_data ON social_media_content USING GIN(raw_data);
CREATE INDEX IF NOT EXISTS idx_content_analysis_hook ON content_analysis USING GIN(hook_analysis);
CREATE INDEX IF NOT EXISTS idx_content_analysis_body ON content_analysis USING GIN(body_analysis);
CREATE INDEX IF NOT EXISTS idx_content_analysis_cta ON content_analysis USING GIN(cta_analysis);

-- Enable Row Level Security
ALTER TABLE social_media_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_media_jobs
CREATE POLICY "Users can view their account's social media jobs" ON social_media_jobs
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create social media jobs for their account" ON social_media_jobs
    FOR INSERT WITH CHECK (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their account's social media jobs" ON social_media_jobs
    FOR UPDATE USING (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );

-- RLS Policies for social_media_content
CREATE POLICY "Users can view their account's social media content" ON social_media_content
    FOR SELECT USING (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create social media content for their account" ON social_media_content
    FOR INSERT WITH CHECK (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their account's social media content" ON social_media_content
    FOR UPDATE USING (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_media_jobs_updated_at
    BEFORE UPDATE ON social_media_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_content_updated_at
    BEFORE UPDATE ON social_media_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE social_media_jobs IS 'Tracks Make.com webhook jobs for importing social media content';
COMMENT ON TABLE social_media_content IS 'Stores raw social media content data before processing into content_pieces';
COMMENT ON COLUMN content_analysis.hook_analysis IS 'Detailed AI analysis of content hooks including effectiveness, type, and recommendations';
COMMENT ON COLUMN content_analysis.body_analysis IS 'AI analysis of main content body including structure, flow, and key points';
COMMENT ON COLUMN content_analysis.cta_analysis IS 'Analysis of calls-to-action including placement, strength, and effectiveness';