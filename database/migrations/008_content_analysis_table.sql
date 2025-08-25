-- Create content_analysis table for storing AI analysis results
CREATE TABLE IF NOT EXISTS content_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scrape_id UUID NOT NULL REFERENCES content_scrapes(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Content metadata
    title TEXT,
    description TEXT,
    transcript TEXT,
    captions TEXT,
    metrics JSONB,
    
    -- AI Analysis results
    hook_analysis TEXT,
    body_analysis TEXT,
    cta_analysis TEXT,
    key_topics TEXT[],
    engagement_tactics TEXT[],
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    complexity TEXT CHECK (complexity IN ('simple', 'moderate', 'complex')),
    
    -- AI Model tracking
    ai_model_used TEXT,
    tokens_used INTEGER,
    
    -- Timestamps
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one analysis per scrape
    CONSTRAINT unique_scrape_analysis UNIQUE (scrape_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_analysis_scrape_id ON content_analysis(scrape_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_project_id ON content_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_analyzed_at ON content_analysis(analyzed_at DESC);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_content_analysis_updated_at 
    BEFORE UPDATE ON content_analysis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment on table
COMMENT ON TABLE content_analysis IS 'Stores AI analysis results for scraped content';
COMMENT ON COLUMN content_analysis.ai_model_used IS 'The AI model used for analysis (e.g., gpt-4o-mini)';