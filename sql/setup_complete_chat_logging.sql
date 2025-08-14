-- Complete SQL setup for comprehensive chat logging system
-- Run this after creating the initial chat_messages table

-- Table for chat element events (creation/deletion)
-- (This should already exist from previous setup)
-- CREATE TABLE IF NOT EXISTS chat_messages (...)

-- Table for individual conversations within chat elements  
CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR(255) PRIMARY KEY,
  chat_element_id VARCHAR(255) NOT NULL,
  canvas_id VARCHAR(255),
  user_id VARCHAR(255),
  title VARCHAR(500) DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for individual messages within conversations
CREATE TABLE IF NOT EXISTS chat_conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NOT NULL, -- Frontend message ID for deduplication
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model VARCHAR(100), -- AI model used for assistant messages
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to conversation
  CONSTRAINT fk_chat_messages_conversation 
    FOREIGN KEY (conversation_id) 
    REFERENCES chat_conversations(id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
-- Chat conversations indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_element_id ON chat_conversations(chat_element_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_canvas_id ON chat_conversations(canvas_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON chat_conversations(created_at);

-- Conversation messages indexes  
CREATE INDEX IF NOT EXISTS idx_chat_conv_messages_conversation_id ON chat_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_messages_role ON chat_conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_conv_messages_model ON chat_conversation_messages(model);
CREATE INDEX IF NOT EXISTS idx_chat_conv_messages_created_at ON chat_conversation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_conv_messages_message_id ON chat_conversation_messages(message_id);

-- Unique constraint to prevent duplicate messages
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conv_messages_unique_message ON chat_conversation_messages(message_id, conversation_id);

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_conversations_updated_at 
    BEFORE UPDATE ON chat_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add table and column comments
COMMENT ON TABLE chat_conversations IS 'Individual conversations within chat elements';
COMMENT ON COLUMN chat_conversations.id IS 'Unique conversation ID (matches frontend conversation ID)';
COMMENT ON COLUMN chat_conversations.chat_element_id IS 'ID of the chat element this conversation belongs to';
COMMENT ON COLUMN chat_conversations.canvas_id IS 'ID of the canvas containing the chat';
COMMENT ON COLUMN chat_conversations.user_id IS 'ID of the user who owns this conversation';
COMMENT ON COLUMN chat_conversations.title IS 'Display title of the conversation';

COMMENT ON TABLE chat_conversation_messages IS 'Individual messages within conversations';
COMMENT ON COLUMN chat_conversation_messages.conversation_id IS 'ID of the conversation this message belongs to';
COMMENT ON COLUMN chat_conversation_messages.message_id IS 'Frontend message ID for deduplication';
COMMENT ON COLUMN chat_conversation_messages.role IS 'Who sent the message: user or assistant';
COMMENT ON COLUMN chat_conversation_messages.content IS 'The actual message content';
COMMENT ON COLUMN chat_conversation_messages.model IS 'AI model used (for assistant messages)';
COMMENT ON COLUMN chat_conversation_messages.timestamp IS 'When the message was sent (from frontend)';

-- Verification queries to check the setup
DO $$
BEGIN
    RAISE NOTICE 'Chat logging tables created successfully!';
    RAISE NOTICE 'Tables: chat_messages, chat_conversations, chat_conversation_messages';
    RAISE NOTICE 'Run the following queries to verify:';
    RAISE NOTICE '1. SELECT COUNT(*) FROM chat_messages;';
    RAISE NOTICE '2. SELECT COUNT(*) FROM chat_conversations;'; 
    RAISE NOTICE '3. SELECT COUNT(*) FROM chat_conversation_messages;';
END
$$;