// Platform types
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'unknown';

// Element types
export type ElementType = 'content' | 'chat' | 'text';

// Base element interface
export interface BaseElement {
  id: string | number;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Content element interface
export interface ContentElement extends BaseElement {
  type: 'content';
  url: string;
  title: string;
  thumbnail: string;
  platform: Platform;
}

// Chat element interface
export interface ChatElement extends BaseElement {
  type: 'chat';
  messages: Message[];
}

// Text element interface
export interface TextElement extends BaseElement {
  type: 'text';
  title: string;
  content: string;
  lastModified: Date;
}

// Union type for all elements
export type CanvasElement = ContentElement | ChatElement | TextElement;

// Message interface
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp?: Date;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    credits_used?: number;
  };
}

// Connection interface
export interface Connection {
  id: number;
  from: string | number;
  to: string | number;
}

// Viewport interface
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Position interface
export interface Position {
  x: number;
  y: number;
}

// Model interface
export interface Model {
  id: string;
  name: string;
}

// Content info interface
export interface ContentInfo {
  title: string;
  thumbnail: string;
  platform: Platform;
}

// API response types
export interface ChatApiRequest {
  messages: Message[];
  model: string;
  connectedContent: ContentElement[];
}

export interface ChatApiResponse {
  content: string;
  error?: string;
}

export interface ContentApiRequest {
  url: string;
}

export interface ContentApiResponse extends ContentInfo {
  error?: string;
}

// Re-export canvas types
export * from './canvas';