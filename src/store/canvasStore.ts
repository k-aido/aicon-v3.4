import { create } from 'zustand';
import { ChatEventLogger } from '../utils/chatEventLogger';

// Throttling for update events to prevent spam
const updateThrottleMap = new Map<string, number>();
const THROTTLE_DELAY = 2000; // 2 seconds between update logs

const shouldLogUpdate = (elementId: string): boolean => {
  const now = Date.now();
  const lastLog = updateThrottleMap.get(elementId) || 0;
  
  if (now - lastLog > THROTTLE_DELAY) {
    updateThrottleMap.set(elementId, now);
    return true;
  }
  return false;
};

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
      // Check if element with this ID already exists
      const existingElement = state.elements.find(el => el.id === element.id);
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

      // Create chat interface in database ONCE per element
      if (element.type === 'chat') {
        const canvasId = state.workspaceId || state.canvasTitle || 'unknown-canvas';
        console.log('🚀 [canvasStore] NEW VERSION v2 - Creating chat interface in database for element:', element.id);
        
        ChatEventLogger.logChatInterfaceCreated(
          String(element.id),
          { x: element.x, y: element.y },
          { width: element.width, height: element.height },
          canvasId, // project_id is canvas ID (required)
          undefined, // userId - can be added later if needed
          'gpt-5-mini', // default model
          `Chat ${element.id}` // name
        ).then(result => {
          if (result.success && result.chatInterfaceId) {
            console.log('✅ Chat interface created with ID:', result.chatInterfaceId);
            // Update the element with the database ID
            set((state) => ({
              elements: state.elements.map(el => 
                el.id === element.id 
                  ? { ...el, metadata: { ...el.metadata, dbId: result.chatInterfaceId } }
                  : el
              )
            }));
          }
        }).catch(err => console.error('Failed to create chat interface:', err));
      }
      
      return {
        elements: newElements
      };
    });
  },
  
  updateElement: (id, updates) => {
    set((state) => {
      const beforeElements = state.elements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      const elementToUpdate = state.elements.find(el => el.id === id);
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

      // Log position/dimension updates for chat interfaces (THROTTLED to prevent spam)
      if (elementToUpdate?.type === 'chat' && shouldLogUpdate(String(id))) {
        const canvasId = state.workspaceId || state.canvasTitle || 'unknown-canvas';
        
        // Only log significant position changes (throttled to 1 per 2 seconds)
        if (updates.x !== undefined || updates.y !== undefined) {
          const newPosition = {
            x: updates.x !== undefined ? updates.x : elementToUpdate.x,
            y: updates.y !== undefined ? updates.y : elementToUpdate.y
          };
          console.log('📍 [canvasStore] Logging THROTTLED position update for chat:', id);
          ChatEventLogger.updateChatInterfacePosition(
            String(id),
            newPosition,
            canvasId
          ).catch(err => console.error('Failed to log position update:', err));
        }

        // Only log significant dimension changes (throttled to 1 per 2 seconds)
        if (updates.width !== undefined || updates.height !== undefined) {
          const newDimensions = {
            width: updates.width !== undefined ? updates.width : elementToUpdate.width,
            height: updates.height !== undefined ? updates.height : elementToUpdate.height
          };
          console.log('📏 [canvasStore] Logging THROTTLED dimension update for chat:', id);
          ChatEventLogger.updateChatInterfaceDimensions(
            String(id),
            newDimensions,
            canvasId
          ).catch(err => console.error('Failed to log dimension update:', err));
        }
      }
      
      return {
        elements: updatedElements
      };
    });
  },
  
  deleteElement: (id) => {
    set((state) => {
      const beforeElements = state.elements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      const elementToDelete = state.elements.find(el => el.id === id);
      const filteredElements = state.elements.filter(el => el.id !== id);
      const afterElements = filteredElements.map(e => ({ id: e.id, type: e.type, title: e.title || 'N/A' }));
      
      console.log('🗑️ [canvasStore] deleteElement filter operation:', { 
        deletingId: id, 
        beforeElements, 
        afterElements,
        elementsRemoved: beforeElements.length - afterElements.length
      });

      // Log chat interface deletion event ONCE per element
      if (elementToDelete?.type === 'chat') {
        const canvasId = state.workspaceId || state.canvasTitle || 'unknown-canvas';
        console.log('🗑️ [canvasStore] Logging ONE-TIME chat interface deletion for element:', id);
        
        // Clean up throttle map
        updateThrottleMap.delete(String(id));
        
        ChatEventLogger.logChatInterfaceDeleted(
          String(id),
          canvasId
        ).catch(err => console.error('Failed to log chat interface deletion:', err));
      }
      
      // Delete Supabase content record for content elements
      if (elementToDelete?.type === 'content') {
        const metadata = (elementToDelete as any).metadata;
        const contentId = metadata?.contentId;
        
        if (contentId) {
          console.log('🗑️ [canvasStore] Deleting Supabase content record for element:', { elementId: id, contentId });
          
          // Call API to delete content record
          fetch('/api/content/delete', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contentId }),
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              console.log('✅ [canvasStore] Successfully deleted Supabase content record:', contentId);
            } else {
              console.error('❌ [canvasStore] Failed to delete Supabase content record:', data.error);
            }
          })
          .catch(err => {
            console.error('❌ [canvasStore] Error deleting Supabase content record:', err);
          });
        } else {
          console.log('ℹ️ [canvasStore] Content element has no contentId, skipping Supabase deletion');
        }
      }
      
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
      // Check if connection with this ID already exists
      const existingConnection = state.connections.find(conn => conn.id === connection.id);
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
    
    let connectedElements: Element[] = [];
    
    // Process each connected element
    connectedIds.forEach(id => {
      const element = state.elements.find(el => el.id === id);
      if (!element) return;
      
      if (element.type === 'content') {
        // Direct content element
        connectedElements.push(element);
      } else if (element.type === 'folder') {
        // Folder/collection - include all its child content
        const folderContents = state.elements.filter(el => 
          element.childIds?.includes(el.id) && el.type === 'content'
        );
        connectedElements.push(...folderContents);
        console.log(`📁 [canvasStore] Collection "${element.name}" connected with ${folderContents.length} content items`);
      }
    });
    
    console.log('🔗 [canvasStore] getConnectedContent filter operation:', { 
      chatId, 
      connectedIds, 
      totalElements: state.elements.length,
      connectedElements: connectedElements.map(e => ({ id: e.id, type: e.type, title: e.title || e.name || 'N/A' })),
      connectedCount: connectedElements.length,
      foldersConnected: connectedIds.filter(id => state.elements.find(el => el.id === id)?.type === 'folder').length
    });
    
    return connectedElements;
  }
}));