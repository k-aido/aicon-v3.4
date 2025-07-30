// Canvas-specific type definitions

import { Platform, Position } from './index';

// Extended element types to include folders
export type CanvasElementType = 'content' | 'chat' | 'folder';

// Base canvas element interface
export interface BaseCanvasElement {
  id: string;
  type: CanvasElementType;
  position: Position;
  dimensions: {
    width: number;
    height: number;
  };
  zIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Content piece interface with enhanced analysis
export interface ContentPiece extends BaseCanvasElement {
  type: 'content';
  url: string;
  title: string;
  description?: string;
  thumbnail: string;
  platform: Platform;
  duration?: number; // in seconds for video content
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: Date;
  author?: {
    name: string;
    avatarUrl?: string;
    channelUrl?: string;
  };
  analysis?: ContentAnalysis;
  tags?: string[];
  transcription?: string;
}

// Content analysis data
export interface ContentAnalysis {
  id: string;
  contentId: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  topics: Array<{
    name: string;
    confidence: number;
  }>;
  entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'event' | 'product' | 'other';
    confidence: number;
  }>;
  language: string;
  readingTime?: number; // in minutes
  complexity: 'simple' | 'moderate' | 'complex';
  analyzedAt: Date;
}

// Folder data interface
export interface FolderData extends BaseCanvasElement {
  type: 'folder';
  name: string;
  description?: string;
  color: string; // hex color
  icon?: string; // icon identifier or emoji
  childIds: string[]; // IDs of contained elements
  parentId?: string; // for nested folders
  isExpanded: boolean;
  sortOrder?: 'manual' | 'alphabetical' | 'date' | 'type';
}

// Enhanced chat data interface
export interface ChatData extends BaseCanvasElement {
  type: 'chat';
  title: string;
  model: string;
  messages: ChatMessage[];
  connectedContentIds: string[]; // IDs of connected content pieces
  settings?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  status: 'idle' | 'typing' | 'processing' | 'error';
  lastMessageAt?: Date;
}

// Enhanced message interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  attachments?: Array<{
    type: 'content' | 'file' | 'image';
    id: string;
    name?: string;
  }>;
  metadata?: {
    model?: string;
    editedAt?: Date;
    isError?: boolean;
    errorMessage?: string;
  };
}

// Enhanced connection interface
export interface Connection {
  id: string;
  source: {
    elementId: string;
    anchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  };
  target: {
    elementId: string;
    anchor: 'top' | 'right' | 'bottom' | 'left' | 'center';
  };
  type: 'data' | 'reference' | 'hierarchy';
  style?: {
    color?: string;
    strokeWidth?: number;
    animated?: boolean;
    label?: string;
  };
  metadata?: Record<string, any>;
}

// Canvas state interface
export interface CanvasState {
  elements: Record<string, ContentPiece | ChatData | FolderData>;
  connections: Connection[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  selection: {
    elementIds: string[];
    connectionIds: string[];
  };
  clipboard?: {
    elements: Array<ContentPiece | ChatData | FolderData>;
    connections: Connection[];
  };
}

// Canvas workspace configuration
export interface CanvasWorkspaceConfig {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  settings: {
    gridSize: number;
    snapToGrid: boolean;
    showGrid: boolean;
    theme: 'light' | 'dark' | 'auto';
    autoSave: boolean;
    autoSaveInterval: number; // in seconds
  };
  permissions: {
    canEdit: boolean;
    canShare: boolean;
    canDelete: boolean;
    isPublic: boolean;
  };
  tags?: string[];
}

// Union type for all canvas elements
export type CanvasElement = ContentPiece | ChatData | FolderData;

// Element bounds for collision detection
export interface ElementBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Drag and drop data
export interface DragDropData {
  type: 'move' | 'copy' | 'link';
  elementIds: string[];
  sourceWorkspaceId?: string;
  offset: Position;
}

// Context menu actions
export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  dangerous?: boolean;
  handler: (elementIds: string[]) => void;
  submenu?: ContextMenuAction[];
}

// Export all types
export * from './index';