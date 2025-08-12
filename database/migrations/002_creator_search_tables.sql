-- Migration: Add creator search and content tables
-- Description: Adds tables for creator search functionality, content scraping, and creator management

-- 1. Creator Searches Table
-- Tracks user searches for creators across platforms
CREATE TABLE IF NOT EXISTS creator_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Search details
    search_query TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
    search_type TEXT NOT NULL CHECK (search_type IN ('handle', 'url')),
    
    -- Results tracking
    results_count INTEGER DEFAULT 0,
    apify_run_id TEXT UNIQUE, -- Apify actor run ID for tracking
    
    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Creators Table
-- Base table for creator information across platforms
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Platform handles
    instagram_handle VARCHAR(255),
    youtube_handle VARCHAR(255),
    tiktok_handle VARCHAR(255),
    
    -- Creator profile info
    display_name VARCHAR(255),
    bio TEXT,
    profile_image_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    
    -- Follower counts (latest snapshot)
    instagram_followers INTEGER,
    youtube_subscribers INTEGER,
    tiktok_followers INTEGER,
    
    -- Scraping management
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    scrape_frequency INTEGER DEFAULT 7, -- days between scrapes
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Creator Content Table
-- Stores scraped content from creators across platforms
CREATE TABLE IF NOT EXISTS creator_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    
    -- Platform and content identification
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
    content_url TEXT NOT NULL,
    platform_content_id VARCHAR(255), -- Platform-specific ID
    
    -- Content metadata
    thumbnail_url TEXT,
    video_url TEXT,
    caption TEXT,
    
    -- Engagement metrics
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    
    -- Content details
    posted_date TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Raw scraping data
    raw_data JSONB DEFAULT '{}', -- Full Apify response
    
    -- Cache management
    cached_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Processing Queue Table
-- Generic queue for background processing tasks
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Queue details
    type TEXT NOT NULL, -- 'creator_search', 'content_analysis', etc.
    priority INTEGER DEFAULT 0,
    
    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Data payload
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Processing tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance indexes
-- Creator searches indexes
CREATE INDEX IF NOT EXISTS idx_creator_searches_user_created ON creator_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_searches_status ON creator_searches(status);
CREATE INDEX IF NOT EXISTS idx_creator_searches_apify_run ON creator_searches(apify_run_id);
CREATE INDEX IF NOT EXISTS idx_creator_searches_platform ON creator_searches(platform);

-- Creators indexes
CREATE INDEX IF NOT EXISTS idx_creators_instagram_handle ON creators(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_creators_youtube_handle ON creators(youtube_handle);
CREATE INDEX IF NOT EXISTS idx_creators_tiktok_handle ON creators(tiktok_handle);
CREATE INDEX IF NOT EXISTS idx_creators_last_scraped ON creators(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_creators_display_name ON creators(display_name);

-- Creator content indexes
CREATE INDEX IF NOT EXISTS idx_creator_content_creator_platform ON creator_content(creator_id, platform);
CREATE INDEX IF NOT EXISTS idx_creator_content_cached_until ON creator_content(cached_until);
CREATE INDEX IF NOT EXISTS idx_creator_content_posted_date ON creator_content(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_creator_content_platform_content_id ON creator_content(platform, platform_content_id);

-- Processing queue indexes
CREATE INDEX IF NOT EXISTS idx_processing_queue_type_status ON processing_queue(type, status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_scheduled_for ON processing_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_creator_content_raw_data ON creator_content USING GIN(raw_data);
CREATE INDEX IF NOT EXISTS idx_creators_metadata ON creators USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_processing_queue_payload ON processing_queue USING GIN(payload);

-- Enable Row Level Security
ALTER TABLE creator_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_searches
CREATE POLICY "Users can view their own creator searches" ON creator_searches
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own creator searches" ON creator_searches
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own creator searches" ON creator_searches
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for creators (public read, restricted write)
CREATE POLICY "All authenticated users can view creators" ON creators
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can manage creators" ON creators
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for creator_content (public read, restricted write)
CREATE POLICY "All authenticated users can view creator content" ON creator_content
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can manage creator content" ON creator_content
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for processing_queue (service role only)
CREATE POLICY "Only service role can access processing queue" ON processing_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_creator_searches_updated_at
    BEFORE UPDATE ON creator_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creators_updated_at
    BEFORE UPDATE ON creators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_content_updated_at
    BEFORE UPDATE ON creator_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at
    BEFORE UPDATE ON processing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful constraints
ALTER TABLE creators ADD CONSTRAINT creators_at_least_one_handle 
    CHECK (
        instagram_handle IS NOT NULL OR 
        youtube_handle IS NOT NULL OR 
        tiktok_handle IS NOT NULL
    );

ALTER TABLE creator_content ADD CONSTRAINT creator_content_url_not_empty 
    CHECK (content_url != '');

-- Add table comments for documentation
COMMENT ON TABLE creator_searches IS 'Tracks user searches for creators across social media platforms';
COMMENT ON TABLE creators IS 'Master table for creator profiles across platforms with scraping management';
COMMENT ON TABLE creator_content IS 'Scraped content from creators with 30-day caching';
COMMENT ON TABLE processing_queue IS 'Generic background task queue supporting creator searches and other async operations';

-- Add column comments
COMMENT ON COLUMN creator_searches.apify_run_id IS 'Apify actor execution ID for tracking scraping progress';
COMMENT ON COLUMN creators.scrape_frequency IS 'Number of days between content scrapes for this creator';
COMMENT ON COLUMN creator_content.cached_until IS 'Content expires 30 days after scraping to manage storage costs';
COMMENT ON COLUMN processing_queue.type IS 'Task type: creator_search, content_analysis, etc.';