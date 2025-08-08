import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UpdateBatcher } from '@/utils/performance';

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
  selectedElementIds: Set<number>;
  connecting: number | null;
  canvasTitle: string;
  viewport: { x: number; y: number; zoom: number };
  
  // Actions
  addElement: (element: Element) => void;
  addElements: (elements: Element[]) => void;
  updateElement: (id: number, updates: Partial<Element>) => void;
  updateElements: (updates: Array<{ id: number; updates: Partial<Element> }>) => void;
  deleteElement: (id: number) => void;
  deleteElements: (ids: number[]) => void;
  setSelectedElement: (element: Element | null) => void;
  setSelectedElementIds: (ids: number[]) => void;
  
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: number) => void;
  setConnecting: (elementId: number | null) => void;
  
  // Canvas
  setCanvasTitle: (title: string) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  
  // Selectors
  getElement: (id: number) => Element | undefined;
  getConnectedElements: (elementId: number) => Element[];
  getElementsByType: (type: Element['type']) => Element[];
  getVisibleElements: (bounds: { left: number; top: number; right: number; bottom: number }) => Element[];
}

// Create update batcher for bulk operations
const elementUpdateBatcher = new UpdateBatcher<{ id: number; updates: Partial<Element> }>(
  (updates) => {
    useOptimizedCanvasStore.getState().updateElements(updates);
  },
  16 // Batch updates every frame
);

export const useOptimizedCanvasStore = create<CanvasState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      elements: [],
      connections: [],
      selectedElement: null,
      selectedElementIds: new Set(),
      connecting: null,
      canvasTitle: 'Canvas Title',
      viewport: { x: 0, y: 0, zoom: 1 },
      
      // Single element operations
      addElement: (element) => {
        set((state) => {
          state.elements.push(element);
        });
      },
      
      // Batch operations for better performance
      addElements: (elements) => {
        set((state) => {
          state.elements.push(...elements);
        });
      },
      
      updateElement: (id, updates) => {
        // Use batcher for frequent updates (like dragging)
        if (updates.x !== undefined || updates.y !== undefined) {
          elementUpdateBatcher.add({ id, updates });
        } else {
          // Immediate update for other changes
          set((state) => {
            const element = state.elements.find((el: any) => el.id === id);
            if (element) {
              Object.assign(element, updates);
            }
          });
        }
      },
      
      // Batch update for multiple elements
      updateElements: (updates) => {
        set((state) => {
          const elementMap = new Map(state.elements.map((el: any) => [el.id, el]));
          
          updates.forEach(({ id, updates: elementUpdates }) => {
            const element = elementMap.get(id);
            if (element) {
              Object.assign(element, elementUpdates);
            }
          });
        });
      },
      
      deleteElement: (id) => {
        set((state) => {
          state.elements = state.elements.filter((el: any) => el.id !== id);
          state.connections = state.connections.filter(
            (conn: any) => conn.from !== id && conn.to !== id
          );
          if (state.selectedElement?.id === id) {
            state.selectedElement = null;
          }
          state.selectedElementIds.delete(id);
        });
      },
      
      deleteElements: (ids) => {
        set((state) => {
          const idSet = new Set(ids);
          state.elements = state.elements.filter((el: any) => !idSet.has(el.id));
          state.connections = state.connections.filter(
            (conn: any) => !idSet.has(conn.from) && !idSet.has(conn.to)
          );
          if (state.selectedElement && idSet.has(state.selectedElement.id)) {
            state.selectedElement = null;
          }
          ids.forEach(id => state.selectedElementIds.delete(id));
        });
      },
      
      setSelectedElement: (element) => {
        set((state) => {
          state.selectedElement = element;
          state.selectedElementIds = element ? new Set([element.id]) : new Set();
        });
      },
      
      setSelectedElementIds: (ids) => {
        set((state) => {
          state.selectedElementIds = new Set(ids);
          state.selectedElement = ids.length === 1 
            ? state.elements.find((el: any) => el.id === ids[0]) || null 
            : null;
        });
      },
      
      addConnection: (connection) => {
        set((state) => {
          state.connections.push(connection);
        });
      },
      
      deleteConnection: (id) => {
        set((state) => {
          state.connections = state.connections.filter((conn: any) => conn.id !== id);
        });
      },
      
      setConnecting: (elementId) => {
        set((state) => {
          state.connecting = elementId;
        });
      },
      
      setCanvasTitle: (title) => {
        set((state) => {
          state.canvasTitle = title;
        });
      },
      
      setViewport: (viewport) => {
        set((state) => {
          state.viewport = viewport;
        });
      },
      
      // Selectors for efficient data access
      getElement: (id) => {
        return get().elements.find(el => el.id === id);
      },
      
      getConnectedElements: (elementId) => {
        const state = get();
        const connectedIds = state.connections
          .filter(conn => conn.to === elementId || conn.from === elementId)
          .map(conn => conn.to === elementId ? conn.from : conn.to);
        
        return state.elements.filter(el => connectedIds.includes(el.id));
      },
      
      getElementsByType: (type) => {
        return get().elements.filter(el => el.type === type);
      },
      
      getVisibleElements: (bounds) => {
        return get().elements.filter(element => {
          const elementRight = element.x + element.width;
          const elementBottom = element.y + element.height;
          
          return !(
            element.x > bounds.right ||
            elementRight < bounds.left ||
            element.y > bounds.bottom ||
            elementBottom < bounds.top
          );
        });
      }
    }))
  )
);

// Subscribe to selection changes for performance monitoring
if (process.env.NODE_ENV === 'development') {
  useOptimizedCanvasStore.subscribe(
    (state) => state.elements.length,
    (elementCount) => {
      console.log(`[CanvasStore] Element count: ${elementCount}`);
    }
  );
}