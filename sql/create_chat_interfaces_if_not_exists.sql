-- Create chat_interfaces table if it doesn't exist
-- This matches the structure shown in your screenshots

CREATE TABLE IF NOT EXISTS chat_interfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  chat_history JSONB,
  connected_content JSONB,
  ai_model_preference VARCHAR(100),
  project_id VARCHAR(255), -- Canvas ID
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_project_id ON chat_interfaces(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_created_by_user_id ON chat_interfaces(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_interfaces_created_at ON chat_interfaces(created_at);

-- Add trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_interfaces_updated_at 
    BEFORE UPDATE ON chat_interfaces 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE chat_interfaces IS 'Chat interfaces placed on canvases';
COMMENT ON COLUMN chat_interfaces.project_id IS 'Canvas ID where this chat interface is located';

-- Test the table works
DO $$
BEGIN
    RAISE NOTICE 'chat_interfaces table created/verified successfully';
    RAISE NOTICE 'You can now test inserting chat interface records';
END
$$;

-- Example test insert (commented out - uncomment to test)
/*
INSERT INTO chat_interfaces (
  name, 
  position_x, 
  position_y, 
  width, 
  height, 
  project_id,
  ai_model_preference
) VALUES (
  'Test Chat', 
  100, 
  200, 
  800, 
  600, 
  'test-canvas-id',
  'gpt-5-mini'
);
*/