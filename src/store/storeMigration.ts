import { useCanvasStore } from './canvasStore';
import { 
  useElementsStore, 
  useConnectionsStore, 
  useUIStore, 
  useCanvasMetadataStore 
} from './normalizedCanvasStore';

/**
 * Migration utility to transition from old store to normalized store
 */
export function migrateToNormalizedStore() {
  // Get data from old store
  const oldState = useCanvasStore.getState();
  
  // Migrate elements
  const elementsStore = useElementsStore.getState();
  if (oldState.elements.length > 0) {
    elementsStore.addElements(oldState.elements);
  }
  
  // Migrate connections
  const connectionsStore = useConnectionsStore.getState();
  if (oldState.connections.length > 0) {
    oldState.connections.forEach(connection => {
      connectionsStore.addConnection(connection);
    });
  }
  
  // Migrate UI state
  const uiStore = useUIStore.getState();
  if (oldState.selectedElement) {
    uiStore.setSelectedIds([oldState.selectedElement.id]);
  }
  if (oldState.connecting !== null) {
    uiStore.setConnectingId(oldState.connecting);
  }
  
  // Migrate metadata
  const metadataStore = useCanvasMetadataStore.getState();
  metadataStore.setTitle(oldState.canvasTitle);
  
  console.log('[StoreMigration] Migration completed');
  console.log(`- Migrated ${oldState.elements.length} elements`);
  console.log(`- Migrated ${oldState.connections.length} connections`);
}

/**
 * Adapter hooks to maintain backward compatibility
 */
export function useCanvasStoreAdapter() {
  // Get data from normalized stores
  const elements = useElementsStore(state => state.elements.allIds.map(id => state.elements.byId[id]));
  const connections = useConnectionsStore(state => state.connections.allIds.map(id => state.connections.byId[id]));
  const selectedIds = useUIStore(state => Array.from(state.ui.selectedIds));
  const selectedElement = selectedIds.length === 1 ? useElementsStore.getState().getElementById(selectedIds[0]) : null;
  const connecting = useUIStore(state => state.ui.connectingId);
  const canvasTitle = useCanvasMetadataStore(state => state.metadata.title);
  
  // Get actions from normalized stores
  const addElement = useElementsStore(state => state.addElement);
  const updateElement = useElementsStore(state => state.updateElement);
  const deleteElement = (id: number) => {
    useElementsStore.getState().deleteElement(id);
    useConnectionsStore.getState().deleteConnectionsByElement(id);
  };
  
  const setSelectedElement = (element: any) => {
    useUIStore.getState().setSelectedIds(element ? [element.id] : []);
  };
  
  const addConnection = useConnectionsStore(state => state.addConnection);
  const deleteConnection = useConnectionsStore(state => state.deleteConnection);
  const setConnecting = useUIStore(state => state.setConnectingId);
  const setCanvasTitle = useCanvasMetadataStore(state => state.setTitle);
  
  const getConnectedContent = (chatId: number) => {
    const connectedIds = useConnectionsStore.getState().getConnectedElementIds(chatId);
    return useElementsStore.getState().getElementsByIds(connectedIds).filter(el => el.type === 'content');
  };
  
  // Return interface matching old store
  return {
    elements: elements.filter(Boolean),
    connections: connections.filter(Boolean),
    selectedElement: selectedElement || null,
    connecting,
    canvasTitle,
    addElement,
    updateElement,
    deleteElement,
    setSelectedElement,
    addConnection,
    deleteConnection,
    setConnecting,
    setCanvasTitle,
    getConnectedContent
  };
}