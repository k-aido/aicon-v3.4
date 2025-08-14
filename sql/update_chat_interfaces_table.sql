-- Update existing chat interfaces table to include project_id field
-- This assumes your existing table is called 'chat_interfaces' or similar

-- Add project_id field to store canvas ID
ALTER TABLE chat_interfaces 
ADD COLUMN IF NOT EXISTS project_id VARCHAR(255);

-- Add index for project_id for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_project_id ON chat_interfaces(project_id);

-- Add comment to document the field
COMMENT ON COLUMN chat_interfaces.project_id IS 'Canvas ID where this chat interface is located';

-- Verify the update
DO $$
BEGIN
    RAISE NOTICE 'Updated chat_interfaces table with project_id field';
    RAISE NOTICE 'project_id will store the canvas ID for each chat interface';
END
$$;