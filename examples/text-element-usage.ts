/**
 * Example: How to programmatically create and use Text Elements
 */

import { useCanvasStore } from '@/store/canvasStore';

// Example 1: Creating a text element
const createTextElement = () => {
  const store = useCanvasStore.getState();
  
  // Create element conforming to the store's Element interface
  const newTextElement = {
    id: Date.now(), // Using number ID as expected by the store
    type: 'text' as const,
    x: 300,
    y: 200,
    width: 400,
    height: 300,
    title: 'Project Notes',
    content: 'Important context for the AI assistant...',
    lastModified: new Date(),
    // Optional properties from the Element interface
    metadata: {
      zIndex: 1,
      isVisible: true,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
  
  store.addElement(newTextElement);
};

// Example 2: Updating text content
const updateTextContent = (elementId: number | string, newContent: string) => {
  const store = useCanvasStore.getState();
  
  store.updateElement(elementId, {
    content: newContent,
    lastModified: new Date()
  });
};

// Example 3: Connecting text to a chat element
const connectTextToChat = (textElementId: number | string, chatElementId: number | string) => {
  const store = useCanvasStore.getState();
  
  const connection = {
    id: Date.now(),
    from: textElementId,
    to: chatElementId
  };
  
  store.addConnection(connection);
};

// Example 4: Getting all text elements
const getAllTextElements = () => {
  const store = useCanvasStore.getState();
  return store.elements.filter(el => el.type === 'text');
};

// Example 5: Text element in chat context
// When a chat element has connected text elements, they appear in the AI context as:
// 
// Additional Context:
// Project Notes: Important context for the AI assistant...
//
// This happens automatically when text elements are connected to chat elements.

export {
  createTextElement,
  updateTextContent,
  connectTextToChat,
  getAllTextElements
};