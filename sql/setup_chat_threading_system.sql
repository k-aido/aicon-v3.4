-- Complete chat threading system setup
-- This creates the relationship: chat_interfaces → chat_threads → thread_messages

-- Table for chat threads (multiple threads per chat interface)
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_interface_id UUID NOT NULL, -- Links to chat_interfaces table
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to chat_interfaces (if you have this table with UUID ids)
  CONSTRAINT fk_chat_threads_interface 
    FOREIGN KEY (chat_interface_id) 
    REFERENCES chat_interfaces(id)
    ON DELETE CASCADE
);

-- Table for messages within threads
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL,
  message_id VARCHAR(255) NOT NULL, -- Frontend message ID for deduplication
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model VARCHAR(100), -- AI model used for assistant messages
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to thread
  CONSTRAINT fk_thread_messages_thread 
    FOREIGN KEY (thread_id) 
    REFERENCES chat_threads(id)
    ON DELETE CASCADE
);

-- Create indexes for performance
-- Chat threads indexes
CREATE INDEX IF NOT EXISTS idx_chat_threads_interface_id ON chat_threads(chat_interface_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_by_user_id ON chat_threads(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_at ON chat_threads(created_at);

-- Thread messages indexes
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_role ON thread_messages(role);
CREATE INDEX IF NOT EXISTS idx_thread_messages_model ON thread_messages(model);
CREATE INDEX IF NOT EXISTS idx_thread_messages_created_at ON thread_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_thread_messages_message_id ON thread_messages(message_id);

-- Unique constraint to prevent duplicate messages per thread
CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_messages_unique_message ON thread_messages(message_id, thread_id);

-- Trigger for updating updated_at timestamp on threads
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_threads_updated_at 
    BEFORE UPDATE ON chat_threads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add table and column comments
COMMENT ON TABLE chat_threads IS 'Individual conversation threads within chat interfaces';
COMMENT ON COLUMN chat_threads.id IS 'Unique thread ID';
COMMENT ON COLUMN chat_threads.chat_interface_id IS 'ID of the chat interface this thread belongs to';
COMMENT ON COLUMN chat_threads.title IS 'Display title of the thread (auto-generated from first message)';
COMMENT ON COLUMN chat_threads.created_by_user_id IS 'ID of the user who created this thread';

COMMENT ON TABLE thread_messages IS 'Individual messages within conversation threads';
COMMENT ON COLUMN thread_messages.thread_id IS 'ID of the thread this message belongs to';
COMMENT ON COLUMN thread_messages.message_id IS 'Frontend message ID for deduplication';
COMMENT ON COLUMN thread_messages.role IS 'Who sent the message: user or assistant';
COMMENT ON COLUMN thread_messages.content IS 'The actual message content';
COMMENT ON COLUMN thread_messages.model IS 'AI model used (for assistant messages)';
COMMENT ON COLUMN thread_messages.timestamp IS 'When the message was sent (from frontend)';

-- Sample verification queries
DO $$
BEGIN
    RAISE NOTICE 'Chat threading system created successfully!';
    RAISE NOTICE 'Data hierarchy: chat_interfaces → chat_threads → thread_messages';
    RAISE NOTICE 'Verification queries:';
    RAISE NOTICE '1. SELECT COUNT(*) FROM chat_threads;';
    RAISE NOTICE '2. SELECT COUNT(*) FROM thread_messages;';
    RAISE NOTICE '3. SELECT ct.title, COUNT(tm.id) as message_count FROM chat_threads ct LEFT JOIN thread_messages tm ON ct.id = tm.thread_id GROUP BY ct.id, ct.title;';
END
$$;