# Normalized Canvas Store Guide

This guide explains how to use the new normalized store structure for better performance and memory efficiency.

## Overview

The normalized store architecture splits the monolithic store into focused, optimized stores:

1. **ElementsStore** - Manages canvas elements with normalized structure
2. **ConnectionsStore** - Manages connections between elements
3. **UIStore** - Manages UI state (selection, hover, drag)
4. **CanvasMetadataStore** - Manages canvas metadata

## Key Benefits

- **Normalized State**: Elements and connections stored by ID for O(1) lookups
- **Focused Updates**: Only subscribe to relevant state changes
- **Persistence**: Automatic state persistence with localStorage
- **DevTools**: Full Redux DevTools integration
- **Performance Monitoring**: Built-in performance tracking
- **Immer Integration**: Simplified immutable updates

## Basic Usage

### Import the stores

```tsx
import { 
  useElementsStore, 
  useConnectionsStore, 
  useUIStore, 
  useCanvasMetadataStore 
} from '@/store/normalizedCanvasStore';
```

### Adding Elements

```tsx
// Single element
const addElement = useElementsStore(state => state.addElement);
addElement({
  id: Date.now(),
  type: 'content',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  title: 'My Content',
  platform: 'youtube'
});

// Multiple elements (batch operation)
const addElements = useElementsStore(state => state.addElements);
addElements([element1, element2, element3]);
```

### Updating Elements

```tsx
// Single update
const updateElement = useElementsStore(state => state.updateElement);
updateElement(elementId, { x: 200, y: 200 });

// Batch updates (recommended for drag operations)
import { batchElementUpdates } from '@/store/normalizedCanvasStore';
batchElementUpdates([
  { id: 1, updates: { x: 100, y: 100 } },
  { id: 2, updates: { x: 200, y: 200 } },
  { id: 3, updates: { x: 300, y: 300 } }
]);
```

### Selecting Elements

```tsx
// Get all elements
const elements = useElementsStore(state => 
  state.elements.allIds.map(id => state.elements.byId[id])
);

// Get specific element
const getElementById = useElementsStore(state => state.getElementById);
const element = getElementById(elementId);

// Get elements by type
const getElementsByType = useElementsStore(state => state.getElementsByType);
const contentElements = getElementsByType('content');

// Get visible elements (for virtualization)
const getVisibleElements = useElementsStore(state => state.getVisibleElements);
const visibleElements = getVisibleElements({
  left: viewport.x,
  top: viewport.y,
  right: viewport.x + containerWidth,
  bottom: viewport.y + containerHeight
});
```

### Managing Connections

```tsx
// Add connection
const addConnection = useConnectionsStore(state => state.addConnection);
addConnection({
  id: Date.now(),
  from: elementId1,
  to: elementId2
});

// Get connected elements
import { useConnectedElements } from '@/store/normalizedCanvasStore';
const connectedElements = useConnectedElements(elementId);
```

### UI State Management

```tsx
// Selection
const setSelectedIds = useUIStore(state => state.setSelectedIds);
const selectedIds = useUIStore(state => Array.from(state.ui.selectedIds));

// Multi-select
setSelectedIds([1, 2, 3]);

// Clear selection
const clearSelection = useUIStore(state => state.clearSelection);
clearSelection();

// Hover state
const setHoveredId = useUIStore(state => state.setHoveredId);
setHoveredId(elementId);

// Drag state
const setDraggedIds = useUIStore(state => state.setDraggedIds);
setDraggedIds([1, 2, 3]);
```

### Canvas Metadata

```tsx
// Set title
const setTitle = useCanvasMetadataStore(state => state.setTitle);
setTitle('My Amazing Canvas');

// Update viewport
const setViewport = useCanvasMetadataStore(state => state.setViewport);
setViewport({ x: 0, y: 0, zoom: 0.8 });
```

## Performance Optimizations

### 1. Selective Subscriptions

```tsx
// Subscribe only to specific state
const elementCount = useElementsStore(state => state.elements.allIds.length);
const selectedCount = useUIStore(state => state.ui.selectedIds.size);
```

### 2. Batch Operations

```tsx
// Delete multiple elements efficiently
import { batchDeleteElements } from '@/store/normalizedCanvasStore';
batchDeleteElements([id1, id2, id3]); // Also handles connections
```

### 3. Memoized Selectors

```tsx
// Use convenience hooks for common operations
import { useSelectedElements } from '@/store/normalizedCanvasStore';

function MyComponent() {
  const selectedElements = useSelectedElements(); // Memoized
  // ...
}
```

## Migration from Old Store

### Option 1: Automatic Migration

```tsx
import { migrateToNormalizedStore } from '@/store/storeMigration';

// Run once on app startup
migrateToNormalizedStore();
```

### Option 2: Adapter for Gradual Migration

```tsx
import { useCanvasStoreAdapter } from '@/store/storeMigration';

// Drop-in replacement for old store
function LegacyComponent() {
  const store = useCanvasStoreAdapter(); // Same API as old store
  // ...
}
```

## Performance Monitoring

### Enable Performance Logging

```tsx
import { logSlowActions, logPerformanceSummary } from '@/store/performanceMiddleware';

// Log slowest actions
logSlowActions();

// Log performance summary
logPerformanceSummary();
```

### Monitor Memory Usage

```tsx
import { getStoreMemoryUsage } from '@/store/performanceMiddleware';

const state = useElementsStore.getState();
const memoryUsage = getStoreMemoryUsage('Elements', state);
```

## Best Practices

1. **Use batch operations** for multiple updates
2. **Subscribe selectively** to minimize re-renders
3. **Leverage convenience hooks** for common patterns
4. **Monitor performance** in development
5. **Use the adapter** for gradual migration

## Example: Optimized Canvas Component

```tsx
import { 
  useElementsStore, 
  useUIStore,
  batchElementUpdates 
} from '@/store/normalizedCanvasStore';

export function OptimizedCanvas() {
  // Selective subscriptions
  const elements = useElementsStore(state => state.getVisibleElements(viewport));
  const selectedIds = useUIStore(state => state.ui.selectedIds);
  
  // Batch drag updates
  const handleDrag = useCallback((draggedElements) => {
    const updates = draggedElements.map(({ id, x, y }) => ({
      id,
      updates: { x, y }
    }));
    batchElementUpdates(updates);
  }, []);
  
  return (
    <div>
      {elements.map(element => (
        <Element
          key={element.id}
          element={element}
          isSelected={selectedIds.has(element.id)}
          onDrag={handleDrag}
        />
      ))}
    </div>
  );
}
```