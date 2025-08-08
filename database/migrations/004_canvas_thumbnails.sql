-- Migration: Add canvas thumbnail support
-- Description: Adds thumbnail field to canvas_workspaces for gallery view
-- Created: 2024-08-03

-- Add thumbnail column to canvas_workspaces
ALTER TABLE canvas_workspaces 
ADD COLUMN IF NOT EXISTS thumbnail_data TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster thumbnail queries
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_thumbnail 
ON canvas_workspaces(id) 
WHERE thumbnail_data IS NOT NULL;