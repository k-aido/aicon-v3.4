-- Ensure the canvas_elements table supports 'text' type
-- First, check if the type column needs to be updated to include 'text'

-- If using an enum type, add 'text' to it
DO $$ 
BEGIN
    -- Check if canvas_element_type enum exists and add 'text' if not present
    IF EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = 'canvas_element_type'
    ) THEN
        -- Add 'text' to the enum if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_enum 
            WHERE enumlabel = 'text' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'canvas_element_type')
        ) THEN
            ALTER TYPE canvas_element_type ADD VALUE IF NOT EXISTS 'text';
        END IF;
    END IF;
END $$;

-- If the type column is just text/varchar, ensure it can accept 'text' value
-- This is likely already the case, but we ensure the constraint if any
ALTER TABLE canvas_elements 
DROP CONSTRAINT IF EXISTS canvas_elements_type_check;

-- Add a check constraint that includes 'text' as a valid type
ALTER TABLE canvas_elements 
ADD CONSTRAINT canvas_elements_type_check 
CHECK (type IN ('content', 'chat', 'folder', 'note', 'text'));

-- Ensure the properties JSONB column exists (it should already exist)
ALTER TABLE canvas_elements 
ALTER COLUMN properties TYPE jsonb USING properties::jsonb;

-- Add comment to document text element structure
COMMENT ON TABLE canvas_elements IS 'Stores all canvas elements. For text elements: type=''text'', properties={title, content, lastModified}';

-- Create index for text elements if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_canvas_elements_text_type 
ON canvas_elements(workspace_id) 
WHERE type = 'text';

-- Grant necessary permissions (adjust based on your RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON canvas_elements TO authenticated;