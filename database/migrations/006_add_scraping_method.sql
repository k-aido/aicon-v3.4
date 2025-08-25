-- Add scraping_method column to track which method was used for scraping
ALTER TABLE content_scrapes
ADD COLUMN IF NOT EXISTS scraping_method TEXT;

-- Add comment explaining the values
COMMENT ON COLUMN content_scrapes.scraping_method IS 'Method used for scraping: youtube_api (free), apify (paid), or NULL for legacy scrapes';

-- Update existing YouTube scrapes to assume they used Apify
UPDATE content_scrapes
SET scraping_method = 'apify'
WHERE platform = 'youtube' 
  AND scraping_method IS NULL
  AND apify_run_id IS NOT NULL;