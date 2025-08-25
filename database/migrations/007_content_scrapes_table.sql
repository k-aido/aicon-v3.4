-- Create content_scrapes table for tracking content scraping operations
CREATE TABLE IF NOT EXISTS content_scrapes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Scraping details
    url TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Apify integration
    apify_run_id TEXT,
    apify_dataset_id TEXT,
    
    -- Scraping method tracking
    scraping_method TEXT, -- 'youtube_api', 'apify', or NULL for legacy
    
    -- Processing results
    processed_data JSONB,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    CONSTRAINT unique_project_url UNIQUE (project_id, url)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_scrapes_project_id ON content_scrapes(project_id);
CREATE INDEX IF NOT EXISTS idx_content_scrapes_user_id ON content_scrapes(user_id);
CREATE INDEX IF NOT EXISTS idx_content_scrapes_status ON content_scrapes(status);
CREATE INDEX IF NOT EXISTS idx_content_scrapes_platform ON content_scrapes(platform);
CREATE INDEX IF NOT EXISTS idx_content_scrapes_created_at ON content_scrapes(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_scrapes_updated_at 
    BEFORE UPDATE ON content_scrapes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment on table
COMMENT ON TABLE content_scrapes IS 'Tracks content scraping operations for social media platforms';
COMMENT ON COLUMN content_scrapes.scraping_method IS 'Method used for scraping: youtube_api (free), apify (paid), or NULL for legacy scrapes';