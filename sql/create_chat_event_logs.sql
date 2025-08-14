-- Create table for chat event logs
CREATE TABLE IF NOT EXISTS chat_event_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('chat_created', 'chat_deleted')),
  chat_element_id VARCHAR(255) NOT NULL,
  canvas_id VARCHAR(255),
  user_id VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT valid_event_type CHECK (event_type IN ('chat_created', 'chat_deleted'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_event_logs_event_type ON chat_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_chat_event_logs_chat_element_id ON chat_event_logs(chat_element_id);
CREATE INDEX IF NOT EXISTS idx_chat_event_logs_canvas_id ON chat_event_logs(canvas_id);
CREATE INDEX IF NOT EXISTS idx_chat_event_logs_user_id ON chat_event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_event_logs_timestamp ON chat_event_logs(timestamp);

-- Example metadata structure (for documentation):
-- For 'chat_created' events:
-- {
--   "position": {"x": 100, "y": 200},
--   "dimensions": {"width": 800, "height": 600},
--   "model_type": "gpt-4"
-- }
-- 
-- For 'chat_deleted' events:
-- {
--   "conversation_count": 3
-- }