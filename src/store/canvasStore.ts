import { create } from 'zustand';

interface Element {
  id: string | number;  // Accept both string and number IDs for compatibility
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
  childIds?: (string | number)[];  // Also accept mixed ID types
  isExpanded?: boolean;
}

interface Connection {
  id: number;
  from: string | number;  // Support mixed ID types in connections
  to: string | number;    // Support mixed ID types in connections
}

interface CanvasState {
  elements: Element[];
  connections: Connection[];
  selectedElement: Element | null;
  connecting: string | number | null;  // Support mixed ID types
  canvasTitle: string;
  workspaceId: string | null;
  viewport: { x: number; y: number; zoom: number };
  
  // Actions
  addElement: (element: Element) => void;
  updateElement: (id: string | number, updates: Partial<Element>) => void;
  deleteElement: (id: string | number) => void;
  setSelectedElement: (element: Element | null) => void;
  
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: number) => void;
  setConnecting: (elementId: string | number | null) => void;
  
  // Canvas title and workspace
  setCanvasTitle: (title: string) => void;
  setWorkspaceId: (id: string | null) => void;
  
  // Viewport
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Get connected content for a chat element
  getConnectedContent: (chatId: string | number) => Element[];
}

// Helper function to check for duplicate connections
const isDuplicateConnection = (connections: Connection[], from: string | number, to: string | number): boolean => {
  return connections.some(conn => 
    (conn.from === from && conn.to === to) || 
    (conn.from === to && conn.to === from)
  );
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  connections: [],
  selectedElement: null,
  connecting: null,
  canvasTitle: 'Canvas Title',
  workspaceId: null,
  viewport: { x: 0, y: 0, zoom: 1.0 },
  
  addElement: (element) => {
    set((state) => {
      const beforeElements = state.elements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      const newElements = [...state.elements, element];
      const afterElements = newElements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      
      console.log('➕ [canvasStore] addElement operation:', { 
        addingElement: { id: element.id, type: element.type, title: element.title || 'N/A' },
        beforeElements, 
        afterElements,
        elementsCount: { before: beforeElements.length, after: afterElements.length }
      });
      
      return {
        elements: newElements
      };
    });
  },
  
  updateElement: (id, updates) => {
    set((state) => {
      const beforeElements = state.elements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      const updatedElements = state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      );
      const afterElements = updatedElements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      
      console.log('🔧 [canvasStore] updateElement map operation:', { 
        updatingId: id, 
        updates, 
        beforeElements, 
        afterElements,
        elementsCount: { before: beforeElements.length, after: afterElements.length }
      });
      
      return {
        elements: updatedElements
      };
    });
  },
  
  deleteElement: (id) => {
    set((state) => {
      const beforeElements = state.elements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      const filteredElements = state.elements.filter(el => el.id !== id);
      const afterElements = filteredElements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      
      console.log('🗑️ [canvasStore] deleteElement filter operation:', { 
        deletingId: id, 
        beforeElements, 
        afterElements,
        elementsRemoved: beforeElements.length - afterElements.length
      });
      
      return {
        elements: filteredElements,
        connections: state.connections.filter(conn => 
          conn.from !== id && conn.to !== id
        ),
        selectedElement: state.selectedElement?.id === id ? null : state.selectedElement
      };
    });
  },
  
  setSelectedElement: (element) => {
    set({ selectedElement: element });
  },
  
  addConnection: (connection) => {
    set((state) => {
      // Check for duplicate connection
      if (isDuplicateConnection(state.connections, connection.from, connection.to)) {
        console.warn('Duplicate connection prevented: These components are already connected');
        // In a real app, you would show a toast notification here
        // toast.error('These components are already connected');
        return state; // Return unchanged state
      }
      
      // No duplicate, add the connection
      return {
        connections: [...state.connections, connection]
      };
    });
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
    
    const connectedElements = state.elements.filter(el => 
      connectedIds.includes(el.id) && el.type === 'content'
    );
    
    console.log('🔗 [canvasStore] getConnectedContent filter operation:', { 
      chatId, 
      connectedIds, 
      totalElements: state.elements.length,
      connectedElements: connectedElements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' })),
      connectedCount: connectedElements.length
    });
    
    return connectedElements;
  }
}));