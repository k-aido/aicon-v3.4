// Platform types
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'unknown';

// Element types
export type ElementType = 'content' | 'chat' | 'collection';

// Base element interface
export interface BaseElement {
  id: number;
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

// Collection element interface
export interface CollectionElement extends BaseElement {
  type: 'collection';
  name?: string;
  description?: string;
  color?: string;
  contentIds?: (string | number)[];
  tags?: string[];
  isExpanded?: boolean;
  viewMode?: 'grid' | 'list' | 'compact';
  sortOrder?: 'manual' | 'date' | 'popularity' | 'alphabetical';
}

// Union type for all elements
export type CanvasElement = ContentElement | ChatElement | CollectionElement;

// Message interface
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

// Connection interface
export interface Connection {
  id: number;
  from: number;
  to: number;
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