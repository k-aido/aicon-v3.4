import { useState, useCallback, useRef } from 'react';
import { CanvasElement } from '@/types/canvas';

interface UseCanvasInteractionsProps {
  elements: Record<string, CanvasElement>;
  onSelectionChange?: (selectedIds: string[]) => void;
}

interface UseCanvasInteractionsReturn {
  selectedElementIds: string[];
  selectedElements: CanvasElement[];
  lastSelectedId: string | null;
  selectElement: (elementId: string, event?: React.MouseEvent) => void;
  selectMultiple: (elementIds: string[]) => void;
  clearSelection: () => void;
  toggleSelection: (elementId: string) => void;
  isSelected: (elementId: string) => boolean;
  selectAll: () => void;
  selectInArea: (area: { x: number; y: number; width: number; height: number }) => void;
}

export const useCanvasInteractions = ({
  elements,
  onSelectionChange
}: UseCanvasInteractionsProps): UseCanvasInteractionsReturn => {
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const selectionRef = useRef<string[]>([]);

  // Get selected elements
  const selectedElements = selectedElementIds
    .map(id => elements[id])
    .filter(Boolean);

  // Check if element is selected
  const isSelected = useCallback((elementId: string) => {
    return selectedElementIds.includes(elementId);
  }, [selectedElementIds]);

  // Update selection and notify
  const updateSelection = useCallback((newSelection: string[]) => {
    selectionRef.current = newSelection;
    setSelectedElementIds(newSelection);
    onSelectionChange?.(newSelection);
  }, [onSelectionChange]);

  // Select single or multiple elements
  const selectElement = useCallback((elementId: string, event?: React.MouseEvent) => {
    const isCtrlOrCmd = event ? (event.ctrlKey || event.metaKey) : false;
    const isShift = event ? event.shiftKey : false;

    if (isCtrlOrCmd) {
      // Toggle selection with Ctrl/Cmd+click
      if (isSelected(elementId)) {
        // Remove from selection
        updateSelection(selectedElementIds.filter(id => id !== elementId));
      } else {
        // Add to selection
        updateSelection([...selectedElementIds, elementId]);
        setLastSelectedId(elementId);
      }
    } else if (isShift && lastSelectedId) {
      // Range selection with Shift+click
      const elementsArray = Object.values(elements);
      const lastIndex = elementsArray.findIndex(el => el.id === lastSelectedId);
      const currentIndex = elementsArray.findIndex(el => el.id === elementId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = elementsArray
          .slice(start, end + 1)
          .map(el => el.id);
        
        // Merge with existing selection
        const newSelection = Array.from(new Set([...selectedElementIds, ...rangeIds]));
        updateSelection(newSelection);
      }
    } else {
      // Single selection (replace existing)
      updateSelection([elementId]);
      setLastSelectedId(elementId);
    }
  }, [selectedElementIds, lastSelectedId, elements, isSelected, updateSelection]);

  // Select multiple elements (replace selection)
  const selectMultiple = useCallback((elementIds: string[]) => {
    updateSelection(elementIds);
    if (elementIds.length > 0) {
      setLastSelectedId(elementIds[elementIds.length - 1]);
    }
  }, [updateSelection]);

  // Clear selection
  const clearSelection = useCallback(() => {
    updateSelection([]);
    setLastSelectedId(null);
  }, [updateSelection]);

  // Toggle selection of a specific element
  const toggleSelection = useCallback((elementId: string) => {
    if (isSelected(elementId)) {
      updateSelection(selectedElementIds.filter(id => id !== elementId));
    } else {
      updateSelection([...selectedElementIds, elementId]);
      setLastSelectedId(elementId);
    }
  }, [selectedElementIds, isSelected, updateSelection]);

  // Select all elements
  const selectAll = useCallback(() => {
    const allIds = Object.keys(elements);
    updateSelection(allIds);
    if (allIds.length > 0) {
      setLastSelectedId(allIds[allIds.length - 1]);
    }
  }, [elements, updateSelection]);

  // Select elements within an area (marquee selection)
  const selectInArea = useCallback((area: { x: number; y: number; width: number; height: number }) => {
    const elementsInArea: string[] = [];
    
    Object.values(elements).forEach(element => {
      const elementBounds = {
        left: element.position.x,
        top: element.position.y,
        right: element.position.x + element.dimensions.width,
        bottom: element.position.y + element.dimensions.height
      };

      const areaBounds = {
        left: area.x,
        top: area.y,
        right: area.x + area.width,
        bottom: area.y + area.height
      };

      // Check if element intersects with selection area
      const intersects = !(
        elementBounds.right < areaBounds.left ||
        elementBounds.left > areaBounds.right ||
        elementBounds.bottom < areaBounds.top ||
        elementBounds.top > areaBounds.bottom
      );

      if (intersects) {
        elementsInArea.push(element.id);
      }
    });

    updateSelection(elementsInArea);
    if (elementsInArea.length > 0) {
      setLastSelectedId(elementsInArea[elementsInArea.length - 1]);
    }
  }, [elements, updateSelection]);

  return {
    selectedElementIds,
    selectedElements,
    lastSelectedId,
    selectElement,
    selectMultiple,
    clearSelection,
    toggleSelection,
    isSelected,
    selectAll,
    selectInArea
  };
};