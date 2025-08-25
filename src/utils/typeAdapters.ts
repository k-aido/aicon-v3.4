/**
 * Type adapter utilities to convert between simple and complex type systems
 */

import { 
  CanvasElement as ComplexCanvasElement,
  ContentPiece,
  ChatData,
  TextData,
  BaseCanvasElement,
  Connection as ComplexConnection
} from '@/types/canvas';
import { 
  CanvasElement as SimpleCanvasElement,
  ContentElement,
  ChatElement,
  TextElement,
  Connection as SimpleConnection
} from '@/types';

/**
 * Convert simple element to complex element format
 */
export function simpleToComplexElement(element: SimpleCanvasElement): ComplexCanvasElement {
  const base: Partial<BaseCanvasElement> = {
    id: element.id.toString(),
    position: { x: element.x, y: element.y },
    dimensions: { width: element.width, height: element.height },
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  switch (element.type) {
    case 'content': {
      const content = element as ContentElement;
      return {
        ...base,
        type: 'content',
        url: content.url,
        title: content.title,
        thumbnail: content.thumbnail,
        platform: content.platform,
      } as ContentPiece;
    }
    
    case 'chat': {
      const chat = element as ChatElement;
      return {
        ...base,
        type: 'chat',
        title: 'AI Chat',
        model: 'gpt-4',
        messages: chat.messages.map(m => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          timestamp: new Date()
        })),
        connectedContentIds: [],
        status: 'idle'
      } as ChatData;
    }
    
    case 'text': {
      const text = element as TextElement;
      return {
        ...base,
        type: 'text',
        title: text.title,
        content: text.content,
        lastModified: text.lastModified
      } as TextData;
    }
    
    default:
      throw new Error(`Unknown element type: ${(element as any).type}`);
  }
}

/**
 * Convert complex element to simple element format
 */
export function complexToSimpleElement(element: ComplexCanvasElement): SimpleCanvasElement {
  const base = {
    id: parseInt(element.id) || Date.now(),
    x: element.position.x,
    y: element.position.y,
    width: element.dimensions.width,
    height: element.dimensions.height
  };

  switch (element.type) {
    case 'content': {
      const content = element as ContentPiece;
      return {
        ...base,
        type: 'content',
        url: content.url,
        title: content.title,
        thumbnail: content.thumbnail,
        platform: content.platform
      } as ContentElement;
    }
    
    case 'chat': {
      const chat = element as ChatData;
      return {
        ...base,
        type: 'chat',
        messages: chat.messages.map(m => ({
          id: parseInt(m.id) || Date.now(),
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      } as ChatElement;
    }
    
    case 'text': {
      const text = element as TextData;
      return {
        ...base,
        type: 'text',
        title: text.title,
        content: text.content,
        lastModified: text.lastModified
      } as TextElement;
    }
    
    default:
      // Handle folder or other types by converting to content
      return {
        ...base,
        type: 'content',
        url: '',
        title: element.type,
        thumbnail: '',
        platform: 'unknown'
      } as ContentElement;
  }
}

/**
 * Check if using complex type system (has position/dimensions objects)
 */
export function isComplexElement(element: any): element is ComplexCanvasElement {
  return element.position && element.dimensions && typeof element.id === 'string';
}

/**
 * Check if using simple type system (has direct x/y/width/height)
 */
export function isSimpleElement(element: any): element is SimpleCanvasElement {
  return typeof element.x === 'number' && typeof element.y === 'number' && 
         typeof element.width === 'number' && typeof element.height === 'number';
}

/**
 * Create a properly typed TextData element
 */
export function createTextElement(params: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string;
  content?: string;
}): TextData {
  const id = Date.now().toString();
  return {
    id,
    type: 'text',
    position: { x: params.x, y: params.y },
    dimensions: { 
      width: params.width || 320, 
      height: params.height || 240 
    },
    title: params.title || 'Text Info',
    content: params.content || '',
    lastModified: new Date(),
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Create a properly typed ChatData element
 */
export function createChatElement(params: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  welcomeMessage?: string;
}): ChatData {
  const id = Date.now().toString();
  const welcomeMsg = params.welcomeMessage || 
    "👋 Hello! I'm your AI assistant. I can help you analyze content, answer questions, and provide insights.";
  
  return {
    id,
    type: 'chat',
    position: { x: params.x, y: params.y },
    dimensions: { 
      width: params.width || 800, 
      height: params.height || 900 
    },
    title: 'AI Chat',
    model: 'gpt-4',
    messages: [{
      id: Date.now().toString(),
      role: 'assistant',
      content: welcomeMsg,
      timestamp: new Date()
    }],
    connectedContentIds: [],
    status: 'idle',
    zIndex: 2,
    isVisible: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Create a properly typed ContentPiece element
 */
export function createContentElement(params: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  platform: string;
  title: string;
  url: string;
  thumbnail?: string;
}): ContentPiece {
  const id = Date.now().toString();
  return {
    id,
    type: 'content',
    position: { x: params.x, y: params.y },
    dimensions: { 
      width: params.width || 300, 
      height: params.height || 350 
    },
    url: params.url,
    title: params.title,
    thumbnail: params.thumbnail || 'https://via.placeholder.com/300x200',
    platform: params.platform as any,
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Convert complex connection to simple connection format
 */
export function complexToSimpleConnection(connection: ComplexConnection): SimpleConnection {
  return {
    id: parseInt(connection.id) || Date.now(),
    from: parseInt(connection.source.elementId) || 0,
    to: parseInt(connection.target.elementId) || 0
  };
}

/**
 * Convert simple connection to complex connection format
 */
export function simpleToComplexConnection(connection: SimpleConnection): ComplexConnection {
  return {
    id: connection.id.toString(),
    source: {
      elementId: connection.from.toString(),
      anchor: 'right'
    },
    target: {
      elementId: connection.to.toString(),
      anchor: 'left'
    },
    type: 'data'
  };
}

/**
 * Convert array of complex connections to simple connections
 */
export function complexToSimpleConnections(connections: ComplexConnection[]): SimpleConnection[] {
  return connections.map(complexToSimpleConnection);
}

/**
 * Convert array of simple connections to complex connections
 */
export function simpleToComplexConnections(connections: SimpleConnection[]): ComplexConnection[] {
  return connections.map(simpleToComplexConnection);
}