-- Create table for chat messages (events)
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('chat_created', 'chat_deleted')),
  chat_element_id VARCHAR(255) NOT NULL,
  canvas_id VARCHAR(255),
  user_id VARCHAR(255),
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER,
  height INTEGER,
  model_type VARCHAR(100),
  conversation_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_event_type ON chat_messages(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_element_id ON chat_messages(chat_element_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_canvas_id ON chat_messages(canvas_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_model_type ON chat_messages(model_type);

-- Add constraint to ensure valid event types
ALTER TABLE chat_messages 
ADD CONSTRAINT valid_event_type CHECK (event_type IN ('chat_created', 'chat_deleted'));

-- Optional: Add comments for documentation
COMMENT ON TABLE chat_messages IS 'Logs chat interface creation and deletion events';
COMMENT ON COLUMN chat_messages.event_type IS 'Type of event: chat_created or chat_deleted';
COMMENT ON COLUMN chat_messages.chat_element_id IS 'Unique identifier for the chat element';
COMMENT ON COLUMN chat_messages.canvas_id IS 'ID of the canvas/workspace containing the chat';
COMMENT ON COLUMN chat_messages.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN chat_messages.position_x IS 'X coordinate of chat element (for created events)';
COMMENT ON COLUMN chat_messages.position_y IS 'Y coordinate of chat element (for created events)';
COMMENT ON COLUMN chat_messages.width IS 'Width of chat element (for created events)';
COMMENT ON COLUMN chat_messages.height IS 'Height of chat element (for created events)';
COMMENT ON COLUMN chat_messages.model_type IS 'AI model type used in the chat (e.g., gpt-4, claude-4)';
COMMENT ON COLUMN chat_messages.conversation_count IS 'Number of conversations in chat (for deleted events)';
COMMENT ON COLUMN chat_messages.created_at IS 'Timestamp when the event occurred';