# Text Element Feature

## Overview

The Text Element is a simple, editable text box that can be added to the canvas. Unlike content cards, text elements are lightweight note-taking components that allow users to add context, instructions, or notes that can be connected to AI chat interfaces.

## Key Features

- **Simple Text Box**: Not a content card - just a clean, editable text area
- **No Side Panel**: Text elements don't have analysis panels or detailed views
- **Connectable**: Can be connected to chat interfaces to provide context
- **Auto-save**: Content is automatically saved as you type (with debouncing)
- **Black Header**: Distinctive black header with document icon
- **Resizable**: Can be resized using the SimpleResize component

## Technical Implementation

### Database Structure

Text elements are stored in the `canvas_elements` table with:
- `type`: 'text'
- `properties`: JSONB field containing:
  - `title`: Header text
  - `content`: Main text content  
  - `lastModified`: Timestamp of last edit

### Component Structure

```typescript
// TextData type definition
interface TextData extends BaseCanvasElement {
  type: 'text';
  title: string;
  content: string;
  lastModified: Date;
}
```

### Usage in Chat

When connected to a chat interface, text elements are:
1. Automatically included in the chat context
2. Prioritized before social media content
3. Formatted as "Additional Context: [title]: [content]"

## User Workflow

1. Click the Text tool in the sidebar (black document icon)
2. A new text element appears on the canvas (400x300 default size)
3. Click the header to edit the title
4. Click the content area to add/edit text
5. Connect to chat interfaces by dragging connection lines
6. Text content is automatically included in AI conversations

## Persistence

Text elements are:
- Saved to the database via the canvas persistence service
- Included in canvas state serialization
- Restored when loading a saved canvas
- Properly handled in import/export operations