# Chat Interface Supabase Logging

This document describes the updated chat interface logging system that records chat interfaces directly in your existing Supabase `chat_interfaces` table with `project_id` as the canvas ID.

## Overview

The system now logs chat interface events directly to your existing `chat_interfaces` table structure, treating the canvas ID as the `project_id`. This provides a direct mapping between canvases and their chat interfaces.

## Database Integration

### Table Structure
Uses your existing `chat_interfaces` table with these key fields:
- `name` - Chat interface identifier (e.g., "Chat 12345")
- `position_x`, `position_y` - Chat position on canvas
- `width`, `height` - Chat dimensions
- `project_id` - **Canvas ID** (this is the key mapping)
- `ai_model_preference` - AI model used (e.g., 'gpt-5-mini')
- `chat_history` - JSON field for chat data
- `connected_content` - JSON field for connected content
- `created_by_user_id` - User who created the chat
- `created_at`, `updated_at` - Timestamps

### Required SQL Update
Run this SQL to add the `project_id` field if it doesn't exist:
```sql
ALTER TABLE chat_interfaces 
ADD COLUMN IF NOT EXISTS project_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_chat_interfaces_project_id ON chat_interfaces(project_id);
```

## Logging Events

### 1. Chat Interface Creation
**When**: A new chat element is added to the canvas
**Data Logged**:
- `name`: "Chat {elementId}"
- `position_x`, `position_y`: Chat coordinates
- `width`, `height`: Chat dimensions
- `project_id`: Canvas ID (workspace ID or canvas title)
- `ai_model_preference`: Default 'gpt-5-mini'
- `created_at`: Current timestamp

### 2. Chat Interface Deletion
**When**: A chat element is removed from the canvas
**Action**: Removes the corresponding record from `chat_interfaces` table

### 3. Position Updates
**When**: Chat is moved on the canvas
**Data Updated**: `position_x`, `position_y`, `updated_at`

### 4. Dimension Updates  
**When**: Chat is resized
**Data Updated**: `width`, `height`, `updated_at`

## Implementation Details

### Canvas Store Integration
The logging is automatically triggered by the Zustand canvas store:
- `addElement()` → logs chat interface creation
- `updateElement()` → logs position/dimension updates
- `deleteElement()` → logs chat interface deletion

### Project ID Mapping
The `project_id` field uses this priority:
1. `workspaceId` (if available)
2. `canvasTitle` (fallback)
3. `'unknown-canvas'` (last resort)

### Error Handling
- All logging operations are non-blocking
- Errors are logged to console but don't interrupt chat functionality
- If Supabase is unavailable, the system continues working normally

## Usage Examples

### Query Chats by Canvas
```sql
-- Get all chat interfaces for a specific canvas
SELECT * FROM chat_interfaces 
WHERE project_id = 'your-canvas-id'
ORDER BY created_at DESC;
```

### Chat Analytics
```sql
-- Count chats per canvas
SELECT 
  project_id, 
  COUNT(*) as chat_count,
  AVG(width) as avg_width,
  AVG(height) as avg_height
FROM chat_interfaces 
GROUP BY project_id 
ORDER BY chat_count DESC;
```

### Recent Activity
```sql
-- Most recently created chats across all canvases
SELECT 
  name,
  project_id,
  position_x,
  position_y,
  created_at
FROM chat_interfaces 
ORDER BY created_at DESC 
LIMIT 10;
```

## Benefits

1. **Direct Canvas Mapping**: Each chat interface is directly linked to its canvas via `project_id`
2. **Real-time Tracking**: Position and size changes are logged immediately
3. **Canvas Analytics**: Easy to analyze chat usage patterns per canvas
4. **Data Integrity**: Automatic cleanup when chats are deleted
5. **Performance**: Uses existing table structure with proper indexing

## Integration Points

The logging integrates with your existing chat system:
- Works alongside the conversation and message logging system
- Complements the `chat_conversations` and `chat_conversation_messages` tables
- Provides the foundational chat interface records that conversations can reference

This creates a complete hierarchical logging system:
```
chat_interfaces (canvas-level chat tracking)
    ↓ 
chat_conversations (conversations within chats)
    ↓
chat_conversation_messages (individual messages)
```