# Chat Event Logging

This document describes the chat event logging system that tracks when users create and delete chat interfaces.

## Overview

The chat event logging system automatically captures user interactions with chat interfaces and stores them in Supabase. This provides valuable analytics and debugging information for chat usage patterns.

## Database Schema

The system uses a `chat_messages` table with the following structure:

```sql
CREATE TABLE chat_messages (
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
```

## Event Types

### `chat_created`
Logged when a new chat element is added to the canvas.

**Fields populated:**
- `position_x`, `position_y`: Coordinates where the chat was placed
- `width`, `height`: Dimensions of the chat element
- `model_type`: AI model type (e.g., 'gpt-4', 'claude-4')

### `chat_deleted`
Logged when a chat element is removed from the canvas.

**Fields populated:**
- `conversation_count`: Number of conversations that were in the deleted chat

## Implementation

### Automatic Logging
The logging is automatically triggered by the Zustand store methods:

- **Creation**: When `addElement()` is called with `type: 'chat'`
- **Deletion**: When `deleteElement()` is called on a chat element

### Logger API

The `ChatEventLogger` class provides static methods:

```typescript
import { ChatEventLogger } from '@/utils/chatEventLogger';

// Log chat creation
await ChatEventLogger.logChatCreated(
  chatElementId,
  { x: 100, y: 200 },
  { width: 800, height: 600 },
  canvasId,
  userId,
  'gpt-4' // optional model type
);

// Log chat deletion
await ChatEventLogger.logChatDeleted(
  chatElementId,
  conversationCount,
  canvasId,
  userId
);
```

## Usage in Components

The logging is integrated into the canvas store (`src/store/canvasStore.ts`):

- `addElement()`: Automatically logs chat creation events
- `deleteElement()`: Automatically logs chat deletion events

No additional code is required in components - the logging happens automatically when using the store methods.

## Error Handling

Logging errors are caught and logged to the console but don't interrupt the user experience. If Supabase is unavailable, the chat functionality continues to work normally.

## Database Setup

Run the SQL migration to create the required table:

```bash
# Execute the SQL file in your Supabase instance
psql -d your_database < sql/create_chat_messages.sql
```

## Example Queries

```sql
-- Count chat creations by day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as chats_created
FROM chat_messages 
WHERE event_type = 'chat_created'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average conversation count in deleted chats
SELECT 
  AVG(conversation_count) as avg_conversations
FROM chat_messages 
WHERE event_type = 'chat_deleted'
  AND conversation_count IS NOT NULL;

-- Chat creation positions (heatmap data)
SELECT 
  position_x, 
  position_y, 
  COUNT(*) as frequency
FROM chat_messages 
WHERE event_type = 'chat_created'
  AND position_x IS NOT NULL 
  AND position_y IS NOT NULL
GROUP BY position_x, position_y
ORDER BY frequency DESC;

-- Most popular AI models
SELECT 
  model_type, 
  COUNT(*) as usage_count
FROM chat_messages 
WHERE event_type = 'chat_created'
  AND model_type IS NOT NULL
GROUP BY model_type
ORDER BY usage_count DESC;
```