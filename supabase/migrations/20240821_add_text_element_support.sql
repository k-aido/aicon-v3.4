-- Add support for text elements in canvas_elements table
-- The 'text' type is already supported in the type enum based on the existing schema

-- Ensure the canvas_elements table can handle text-specific properties
-- The properties JSONB field will store: title, content, lastModified

-- Add index for better performance when querying text elements
CREATE INDEX IF NOT EXISTS idx_canvas_elements_type_text 
ON canvas_elements(workspace_id, type) 
WHERE type = 'text';

-- Add a comment to document the text element structure
COMMENT ON TABLE canvas_elements IS 'Stores all canvas elements including content, chat, folder, and text elements. For text elements, the properties field contains: {title: string, content: string, lastModified: timestamp}';