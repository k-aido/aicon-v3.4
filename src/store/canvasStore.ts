import { create } from 'zustand';

interface Element {
  id: string | number;  // Accept both string and number IDs for compatibility
  type: 'content' | 'chat' | 'folder' | 'text';
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
  // Text-specific fields
  content?: string;
  lastModified?: Date | string;
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
  
  // Clear all elements and connections
  clearCanvas: () => void;
  
  // Load complete canvas data
  loadCanvasData: (elements: Element[], connections: Connection[]) => void;
  
  // Get connected content for a chat element
  getConnectedContent: (chatId: string | number) => Element[];
}

// Helper function to check for duplicate connections
const isDuplicateConnection = (connections: Connection[], from: string | number, to: string | number): boolean => {
  return connections.some(conn => 
    (String(conn.from) === String(from) && String(conn.to) === String(to)) || 
    (String(conn.from) === String(to) && String(conn.to) === String(from))
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
      // Check if element with this ID already exists
      const existingElement = state.elements.find(el => String(el.id) === String(element.id));
      if (existingElement) {
        console.warn(`[CanvasStore] Element with ID ${element.id} already exists, skipping add`);
        return state;
      }
      
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
      
      // Debug: Check if element exists
      const elementExists = state.elements.some(el => el.id === id);
      const elementExistsString = state.elements.some(el => String(el.id) === String(id));
      
      console.log('🔧 [canvasStore] updateElement - element lookup:', {
        searchingForId: id,
        idType: typeof id,
        elementExists,
        elementExistsString,
        allIds: state.elements.map(el => ({ id: el.id, type: typeof el.id }))
      });
      
      const updatedElements = state.elements.map(el => 
        // Use loose comparison to handle string/number ID mismatch
        String(el.id) === String(id) ? { ...el, ...updates } : el
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
      const filteredElements = state.elements.filter(el => String(el.id) !== String(id));
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
          String(conn.from) !== String(id) && String(conn.to) !== String(id)
        ),
        selectedElement: state.selectedElement && String(state.selectedElement.id) === String(id) ? null : state.selectedElement
      };
    });
  },
  
  setSelectedElement: (element) => {
    set({ selectedElement: element });
  },
  
  addConnection: (connection) => {
    set((state) => {
      // Check if connection with this ID already exists
      const existingConnection = state.connections.find(conn => String(conn.id) === String(connection.id));
      if (existingConnection) {
        console.warn(`[CanvasStore] Connection with ID ${connection.id} already exists, skipping add`);
        return state;
      }
      
      // Check for duplicate connection between same elements
      if (isDuplicateConnection(state.connections, connection.from, connection.to)) {
        console.warn('Duplicate connection prevented: These components are already connected');
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
      connections: state.connections.filter(conn => String(conn.id) !== String(id))
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
    const validViewport = {
      x: isNaN(viewport.x) || !isFinite(viewport.x) ? 0 : viewport.x,
      y: isNaN(viewport.y) || !isFinite(viewport.y) ? 0 : viewport.y,
      zoom: isNaN(viewport.zoom) || !isFinite(viewport.zoom) || viewport.zoom <= 0 ? 1 : viewport.zoom
    };
    set({ viewport: validViewport });
  },
  
  clearCanvas: () => {
    set({
      elements: [],
      connections: [],
      selectedElement: null,
      connecting: null
    });
  },
  
  loadCanvasData: (elements, connections) => {
    set({
      elements: elements,
      connections: connections,
      selectedElement: null,
      connecting: null
    });
  },
  
  getConnectedContent: (chatId) => {
    const state = get();
    const connectedIds = state.connections
      .filter(conn => String(conn.to) === String(chatId))
      .map(conn => conn.from);
    
    const connectedElements = state.elements.filter(el => 
      connectedIds.some(id => String(id) === String(el.id)) && (el.type === 'content' || el.type === 'text')
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