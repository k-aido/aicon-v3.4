-- Migration: Fix creator_content table schema
-- Description: Adds missing fields that the creator search API expects

-- Add missing fields to creator_content table
ALTER TABLE creator_content 
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', 'carousel')),
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';

-- Add index for media_type for filtering
CREATE INDEX IF NOT EXISTS idx_creator_content_media_type ON creator_content(media_type);

-- Add GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_creator_content_hashtags ON creator_content USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_creator_content_mentions ON creator_content USING GIN(mentions);

-- Add comments
COMMENT ON COLUMN creator_content.media_type IS 'Type of media content: image, video, or carousel';
COMMENT ON COLUMN creator_content.hashtags IS 'Array of hashtags extracted from content';
COMMENT ON COLUMN creator_content.mentions IS 'Array of user mentions extracted from content';