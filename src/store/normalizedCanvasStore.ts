import { create } from 'zustand';
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
interface NormalizedElement {
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

interface NormalizedConnection {
  id: number;
  from: number;
  to: number;
}

// Normalized state interfaces
interface ElementsState {
  byId: Record<number, NormalizedElement>;
  allIds: number[];
}

interface ConnectionsState {
  byId: Record<number, NormalizedConnection>;
  allIds: number[];
}

interface UIState {
  selectedIds: Set<number>;
  hoveredId: number | null;
  connectingId: number | null;
  draggedIds: Set<number>;
  isMultiSelecting: boolean;
  selectionBox: { x: number; y: number; width: number; height: number } | null;
}

interface CanvasMetadata {
  title: string;
  lastModified: number;
  createdAt: number;
  viewport: { x: number; y: number; zoom: number };
}

// Store interfaces
interface ElementsStore {
  elements: ElementsState;
  
  // Actions
  addElement: (element: NormalizedElement) => void;
  addElements: (elements: NormalizedElement[]) => void;
  updateElement: (id: number, updates: Partial<NormalizedElement>) => void;
  updateElements: (updates: Array<{ id: number; updates: Partial<NormalizedElement> }>) => void;
  deleteElement: (id: number) => void;
  deleteElements: (ids: number[]) => void;
  
  // Selectors
  getElementById: (id: number) => NormalizedElement | undefined;
  getElementsByIds: (ids: number[]) => NormalizedElement[];
  getElementsByType: (type: NormalizedElement['type']) => NormalizedElement[];
  getVisibleElements: (bounds: { left: number; top: number; right: number; bottom: number }) => NormalizedElement[];
}

interface ConnectionsStore {
  connections: ConnectionsState;
  
  // Actions
  addConnection: (connection: NormalizedConnection) => void;
  deleteConnection: (id: number) => void;
  deleteConnectionsByElement: (elementId: number) => void;
  
  // Selectors
  getConnectionById: (id: number) => NormalizedConnection | undefined;
  getConnectionsByElement: (elementId: number) => NormalizedConnection[];
  getConnectedElementIds: (elementId: number) => number[];
}

interface UIStore {
  ui: UIState;
  
  // Actions
  setSelectedIds: (ids: number[]) => void;
  addSelectedId: (id: number) => void;
  removeSelectedId: (id: number) => void;
  clearSelection: () => void;
  setHoveredId: (id: number | null) => void;
  setConnectingId: (id: number | null) => void;
  setDraggedIds: (ids: number[]) => void;
  setMultiSelecting: (isSelecting: boolean) => void;
  setSelectionBox: (box: UIState['selectionBox']) => void;
}

interface CanvasMetadataStore {
  metadata: CanvasMetadata;
  
  // Actions
  setTitle: (title: string) => void;
  setViewport: (viewport: CanvasMetadata['viewport']) => void;
  updateLastModified: () => void;
}

// Create focused stores
export const useElementsStore = create<ElementsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        elements: {
          byId: {},
          allIds: []
        },
        
        addElement: (element) => {
          set((state) => {
            state.elements.byId[element.id] = element;
            state.elements.allIds.push(element.id);
          });
        },
        
        addElements: (elements) => {
          set((state) => {
            elements.forEach(element => {
              state.elements.byId[element.id] = element;
              if (!state.elements.allIds.includes(element.id)) {
                state.elements.allIds.push(element.id);
              }
            });
          });
        },
        
        updateElement: (id, updates) => {
          set((state) => {
            if (state.elements.byId[id]) {
              Object.assign(state.elements.byId[id], updates);
            }
          });
        },
        
        updateElements: (updates) => {
          set((state) => {
            updates.forEach(({ id, updates: elementUpdates }) => {
              if (state.elements.byId[id]) {
                Object.assign(state.elements.byId[id], elementUpdates);
              }
            });
          });
        },
        
        deleteElement: (id) => {
          set((state) => {
            delete state.elements.byId[id];
            state.elements.allIds = state.elements.allIds.filter((elId: string) => elId !== id.toString());
          });
        },
        
        deleteElements: (ids) => {
          set((state) => {
            ids.forEach(id => delete state.elements.byId[id]);
            state.elements.allIds = state.elements.allIds.filter((id: string) => !ids.includes(parseInt(id)));
          });
        },
        
        getElementById: (id) => {
          return get().elements.byId[id];
        },
        
        getElementsByIds: (ids) => {
          const { byId } = get().elements;
          return ids.map(id => byId[id]).filter(Boolean);
        },
        
        getElementsByType: (type) => {
          const { byId, allIds } = get().elements;
          return allIds
            .map(id => byId[id])
            .filter(el => el && el.type === type);
        },
        
        getVisibleElements: (bounds) => {
          const { byId, allIds } = get().elements;
          return allIds
            .map(id => byId[id])
            .filter(element => {
              if (!element) return false;
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
      })),
      {
        name: 'canvas-elements',
        partialize: (state) => ({ elements: state.elements })
      }
    ),
    { name: 'ElementsStore' }
  )
);

export const useConnectionsStore = create<ConnectionsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        connections: {
          byId: {},
          allIds: []
        },
        
        addConnection: (connection) => {
          set((state) => {
            state.connections.byId[connection.id] = connection;
            state.connections.allIds.push(connection.id);
          });
        },
        
        deleteConnection: (id) => {
          set((state) => {
            delete state.connections.byId[id];
            state.connections.allIds = state.connections.allIds.filter((connId: string) => connId !== id.toString());
          });
        },
        
        deleteConnectionsByElement: (elementId) => {
          set((state) => {
            const toDelete = state.connections.allIds.filter((id: string) => {
              const conn = state.connections.byId[id];
              return conn && (conn.from === elementId || conn.to === elementId);
            });
            
            toDelete.forEach((id: string) => delete state.connections.byId[id]);
            state.connections.allIds = state.connections.allIds.filter((id: string) => !toDelete.includes(id));
          });
        },
        
        getConnectionById: (id) => {
          return get().connections.byId[id];
        },
        
        getConnectionsByElement: (elementId) => {
          const { byId, allIds } = get().connections;
          return allIds
            .map(id => byId[id])
            .filter(conn => conn && (conn.from === elementId || conn.to === elementId));
        },
        
        getConnectedElementIds: (elementId) => {
          const connections = get().getConnectionsByElement(elementId);
          return connections.map(conn => 
            conn.from === elementId ? conn.to : conn.from
          );
        }
      })),
      {
        name: 'canvas-connections',
        partialize: (state) => ({ connections: state.connections })
      }
    ),
    { name: 'ConnectionsStore' }
  )
);

export const useUIStore = create<UIStore>()(
  devtools(
    immer((set) => ({
      ui: {
        selectedIds: new Set(),
        hoveredId: null,
        connectingId: null,
        draggedIds: new Set(),
        isMultiSelecting: false,
        selectionBox: null
      },
      
      setSelectedIds: (ids) => {
        set((state) => {
          state.ui.selectedIds = new Set(ids);
        });
      },
      
      addSelectedId: (id) => {
        set((state) => {
          state.ui.selectedIds.add(id);
        });
      },
      
      removeSelectedId: (id) => {
        set((state) => {
          state.ui.selectedIds.delete(id);
        });
      },
      
      clearSelection: () => {
        set((state) => {
          state.ui.selectedIds.clear();
        });
      },
      
      setHoveredId: (id) => {
        set((state) => {
          state.ui.hoveredId = id;
        });
      },
      
      setConnectingId: (id) => {
        set((state) => {
          state.ui.connectingId = id;
        });
      },
      
      setDraggedIds: (ids) => {
        set((state) => {
          state.ui.draggedIds = new Set(ids);
        });
      },
      
      setMultiSelecting: (isSelecting) => {
        set((state) => {
          state.ui.isMultiSelecting = isSelecting;
        });
      },
      
      setSelectionBox: (box) => {
        set((state) => {
          state.ui.selectionBox = box;
        });
      }
    })),
    { name: 'UIStore' }
  )
);

export const useCanvasMetadataStore = create<CanvasMetadataStore>()(
  devtools(
    persist(
      immer((set) => ({
        metadata: {
          title: 'Canvas Title',
          lastModified: Date.now(),
          createdAt: Date.now(),
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        
        setTitle: (title) => {
          set((state) => {
            state.metadata.title = title;
            state.metadata.lastModified = Date.now();
          });
        },
        
        setViewport: (viewport) => {
          set((state) => {
            state.metadata.viewport = viewport;
          });
        },
        
        updateLastModified: () => {
          set((state) => {
            state.metadata.lastModified = Date.now();
          });
        }
      })),
      {
        name: 'canvas-metadata',
        partialize: (state) => ({ metadata: state.metadata })
      }
    ),
    { name: 'CanvasMetadataStore' }
  )
);

// Middleware for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  // Debug logging removed for build compatibility
  
  // Debug logging removed for build compatibility
}

// Export convenience hooks for common operations
export function useSelectedElements() {
  const selectedIds = useUIStore(state => Array.from(state.ui.selectedIds));
  const getElementsByIds = useElementsStore(state => state.getElementsByIds);
  return getElementsByIds(selectedIds);
}

export function useConnectedElements(elementId: number) {
  const getConnectedElementIds = useConnectionsStore(state => state.getConnectedElementIds);
  const getElementsByIds = useElementsStore(state => state.getElementsByIds);
  const connectedIds = getConnectedElementIds(elementId);
  return getElementsByIds(connectedIds);
}

// Performance utilities
export function batchElementUpdates(updates: Array<{ id: number; updates: Partial<NormalizedElement> }>) {
  useElementsStore.getState().updateElements(updates);
}

export function batchDeleteElements(ids: number[]) {
  const deleteElements = useElementsStore.getState().deleteElements;
  const deleteConnectionsByElement = useConnectionsStore.getState().deleteConnectionsByElement;
  
  // Delete elements
  deleteElements(ids);
  
  // Delete related connections
  ids.forEach(id => deleteConnectionsByElement(id));
  
  // Clear selection if needed
  const selectedIds = useUIStore.getState().ui.selectedIds;
  const hasSelectedDeleted = ids.some(id => selectedIds.has(id));
  if (hasSelectedDeleted) {
    useUIStore.getState().clearSelection();
  }
}