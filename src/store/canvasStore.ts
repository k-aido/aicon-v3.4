import { create } from 'zustand';

interface Element {
  id: number;
  type: 'content' | 'chat' | 'folder';
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  url?: string;
  platform?: string;
  thumbnail?: string;
  messages?: any[];
  conversations?: any[];
  metadata?: Record<string, any>;
  analysis?: any;
  // Folder-specific fields
  name?: string;
  description?: string;
  color?: string;
  childIds?: number[];
  isExpanded?: boolean;
}

interface Connection {
  id: number;
  from: number;
  to: number;
}

interface CanvasState {
  elements: Element[];
  connections: Connection[];
  selectedElement: Element | null;
  connecting: number | null;
  canvasTitle: string;
  workspaceId: string | null;
  viewport: { x: number; y: number; zoom: number };
  
  // Actions
  addElement: (element: Element) => void;
  updateElement: (id: number, updates: Partial<Element>) => void;
  deleteElement: (id: number) => void;
  setSelectedElement: (element: Element | null) => void;
  
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: number) => void;
  setConnecting: (elementId: number | null) => void;
  
  // Canvas title and workspace
  setCanvasTitle: (title: string) => void;
  setWorkspaceId: (id: string | null) => void;
  
  // Viewport
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Get connected content for a chat element
  getConnectedContent: (chatId: number) => Element[];
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  connections: [],
  selectedElement: null,
  connecting: null,
  canvasTitle: 'Canvas Title',
  workspaceId: null,
  viewport: { x: 0, y: 0, zoom: 1.0 },
  
  addElement: (element) => {
    set((state) => ({
      elements: [...state.elements, element]
    }));
  },
  
  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }));
  },
  
  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter(el => el.id !== id),
      connections: state.connections.filter(conn => 
        conn.from !== id && conn.to !== id
      ),
      selectedElement: state.selectedElement?.id === id ? null : state.selectedElement
    }));
  },
  
  setSelectedElement: (element) => {
    set({ selectedElement: element });
  },
  
  addConnection: (connection) => {
    set((state) => ({
      connections: [...state.connections, connection]
    }));
  },
  
  deleteConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter(conn => conn.id !== id)
    }));
  },
  
  setConnecting: (elementId) => {
    set({ connecting: elementId });
  },
  
  setCanvasTitle: (title) => {
    set({ canvasTitle: title });
  },
  
  setWorkspaceId: (id) => {
    set({ workspaceId: id });
  },
  
  setViewport: (viewport) => {
    set({ viewport });
  },
  
  getConnectedContent: (chatId) => {
    const state = get();
    const connectedIds = state.connections
      .filter(conn => conn.to === chatId)
      .map(conn => conn.from);
    
    return state.elements.filter(el => 
      connectedIds.includes(el.id) && el.type === 'content'
    );
  }
}));