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
  
  // Actions
  addElement: (element: Element) => void;
  updateElement: (id: number, updates: Partial<Element>) => void;
  deleteElement: (id: number) => void;
  setSelectedElement: (element: Element | null) => void;
  
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: number) => void;
  setConnecting: (elementId: number | null) => void;
  
  // Canvas title
  setCanvasTitle: (title: string) => void;
  
  // Clear all elements and connections
  clearCanvas: () => void;
  
  // Load complete canvas data
  loadCanvasData: (elements: Element[], connections: Connection[]) => void;
  
  // Get connected content for a chat element
  getConnectedContent: (chatId: number) => Element[];
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  connections: [],
  selectedElement: null,
  connecting: null,
  canvasTitle: 'Canvas Title',
  
  addElement: (element) => {
    set((state) => {
      // Check if element with this ID already exists
      const existingElement = state.elements.find(el => el.id === element.id);
      if (existingElement) {
        console.warn(`[CanvasStore] Element with ID ${element.id} already exists, skipping add`);
        return state;
      }
      return {
        elements: [...state.elements, element]
      };
    });
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
    set((state) => {
      // Check if connection with this ID already exists
      const existingConnection = state.connections.find(conn => conn.id === connection.id);
      if (existingConnection) {
        console.warn(`[CanvasStore] Connection with ID ${connection.id} already exists, skipping add`);
        return state;
      }
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
      .filter(conn => conn.to === chatId)
      .map(conn => conn.from);
    
    return state.elements.filter(el => 
      connectedIds.includes(el.id) && el.type === 'content'
    );
  }
}));