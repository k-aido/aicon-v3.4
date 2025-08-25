-- Add raw_data column to content_scrapes table
-- This column stores the raw API response data for debugging and future processing

ALTER TABLE content_scrapes 
ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN content_scrapes.raw_data IS 'Raw API response data from scraping service (Apify or YouTube API)';