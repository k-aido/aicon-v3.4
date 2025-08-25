-- Migration: Fix creators table schema for multi-platform support
-- Description: Adds missing required fields for creators table

-- Add missing fields to creators table
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS profile_url TEXT;

-- Create unique constraint on platform + username combination
ALTER TABLE creators 
ADD CONSTRAINT IF NOT EXISTS creators_platform_username_unique 
UNIQUE (platform, username);

-- Create compound index for platform/handle queries
CREATE INDEX IF NOT EXISTS idx_creators_platform_username ON creators(platform, username);

-- Add composite unique constraints for handle fields per platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_unique_instagram_handle 
ON creators(instagram_handle) WHERE instagram_handle IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_unique_youtube_handle 
ON creators(youtube_handle) WHERE youtube_handle IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_unique_tiktok_handle 
ON creators(tiktok_handle) WHERE tiktok_handle IS NOT NULL;

-- Add unique constraint on content_url + platform combination for creator_content
ALTER TABLE creator_content 
ADD CONSTRAINT IF NOT EXISTS creator_content_url_platform_unique 
UNIQUE (content_url, platform);

-- Add comments
COMMENT ON COLUMN creators.platform IS 'Primary platform for this creator record';
COMMENT ON COLUMN creators.username IS 'Username on the primary platform';
COMMENT ON COLUMN creators.profile_url IS 'Full URL to creator profile on primary platform';