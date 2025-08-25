import { useState, useCallback, useMemo } from 'react';

interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

interface AlignmentResult {
  snappedX?: number;
  snappedY?: number;
  guides: AlignmentGuide[];
}

// Define a minimal element interface that works with both type systems
interface AlignableElement {
  id: string | number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
}

interface UseCanvasAlignmentProps {
  elements: AlignableElement[] | Record<string, AlignableElement>;
  snapThreshold?: number;
  enabled?: boolean;
}

export const useCanvasAlignment = ({
  elements,
  snapThreshold = 10,
  enabled = true
}: UseCanvasAlignmentProps) => {
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

  // Convert elements to array if needed
  const elementsArray = useMemo(() => {
    return Array.isArray(elements) ? elements : Object.values(elements);
  }, [elements]);

  const findAlignmentGuides = useCallback((
    draggedElement: {
      id: string | number;
      x: number;
      y: number;
      width: number;
      height: number;
    },
    otherElements: AlignableElement[]
  ): AlignmentResult => {
    if (!enabled) return { guides: [] };

    const guides: AlignmentGuide[] = [];
    let snappedX: number | undefined;
    let snappedY: number | undefined;

    // Element edges
    const draggedLeft = draggedElement.x;
    const draggedRight = draggedElement.x + draggedElement.width;
    const draggedTop = draggedElement.y;
    const draggedBottom = draggedElement.y + draggedElement.height;
    const draggedCenterX = draggedElement.x + draggedElement.width / 2;
    const draggedCenterY = draggedElement.y + draggedElement.height / 2;

    otherElements.forEach(element => {
      if (String(element.id) === String(draggedElement.id)) return;

      // Get element position and dimensions with explicit type assertions
      const elementX: number = ('x' in element && element.x !== undefined) ? element.x : (element.position?.x ?? 0);
      const elementY: number = ('y' in element && element.y !== undefined) ? element.y : (element.position?.y ?? 0);
      const elementWidth: number = ('width' in element && element.width !== undefined) ? element.width : (element.dimensions?.width ?? 0);
      const elementHeight: number = ('height' in element && element.height !== undefined) ? element.height : (element.dimensions?.height ?? 0);

      const left = elementX;
      const right = elementX + elementWidth;
      const top = elementY;
      const bottom = elementY + elementHeight;
      const centerX = elementX + elementWidth / 2;
      const centerY = elementY + elementHeight / 2;

      // Vertical alignment checks (left, center, right)
      
      // Left edge alignment
      if (Math.abs(draggedLeft - left) < snapThreshold) {
        if (snappedX === undefined) snappedX = left;
        guides.push({
          type: 'vertical',
          position: left,
          start: Math.min(draggedTop, top),
          end: Math.max(draggedBottom, bottom)
        });
      }
      
      // Right edge alignment
      if (Math.abs(draggedRight - right) < snapThreshold) {
        if (snappedX === undefined) snappedX = right - draggedElement.width;
        guides.push({
          type: 'vertical',
          position: right,
          start: Math.min(draggedTop, top),
          end: Math.max(draggedBottom, bottom)
        });
      }
      
      // Left to right alignment
      if (Math.abs(draggedLeft - right) < snapThreshold) {
        if (snappedX === undefined) snappedX = right;
        guides.push({
          type: 'vertical',
          position: right,
          start: Math.min(draggedTop, top),
          end: Math.max(draggedBottom, bottom)
        });
      }
      
      // Right to left alignment
      if (Math.abs(draggedRight - left) < snapThreshold) {
        if (snappedX === undefined) snappedX = left - draggedElement.width;
        guides.push({
          type: 'vertical',
          position: left,
          start: Math.min(draggedTop, top),
          end: Math.max(draggedBottom, bottom)
        });
      }
      
      // Center X alignment
      if (Math.abs(draggedCenterX - centerX) < snapThreshold) {
        if (snappedX === undefined) snappedX = centerX - draggedElement.width / 2;
        guides.push({
          type: 'vertical',
          position: centerX,
          start: Math.min(draggedTop, top),
          end: Math.max(draggedBottom, bottom)
        });
      }

      // Horizontal alignment checks (top, middle, bottom)
      
      // Top edge alignment
      if (Math.abs(draggedTop - top) < snapThreshold) {
        if (snappedY === undefined) snappedY = top;
        guides.push({
          type: 'horizontal',
          position: top,
          start: Math.min(draggedLeft, left),
          end: Math.max(draggedRight, right)
        });
      }
      
      // Bottom edge alignment
      if (Math.abs(draggedBottom - bottom) < snapThreshold) {
        if (snappedY === undefined) snappedY = bottom - draggedElement.height;
        guides.push({
          type: 'horizontal',
          position: bottom,
          start: Math.min(draggedLeft, left),
          end: Math.max(draggedRight, right)
        });
      }
      
      // Top to bottom alignment
      if (Math.abs(draggedTop - bottom) < snapThreshold) {
        if (snappedY === undefined) snappedY = bottom;
        guides.push({
          type: 'horizontal',
          position: bottom,
          start: Math.min(draggedLeft, left),
          end: Math.max(draggedRight, right)
        });
      }
      
      // Bottom to top alignment
      if (Math.abs(draggedBottom - top) < snapThreshold) {
        if (snappedY === undefined) snappedY = top - draggedElement.height;
        guides.push({
          type: 'horizontal',
          position: top,
          start: Math.min(draggedLeft, left),
          end: Math.max(draggedRight, right)
        });
      }
      
      // Center Y alignment
      if (Math.abs(draggedCenterY - centerY) < snapThreshold) {
        if (snappedY === undefined) snappedY = centerY - draggedElement.height / 2;
        guides.push({
          type: 'horizontal',
          position: centerY,
          start: Math.min(draggedLeft, left),
          end: Math.max(draggedRight, right)
        });
      }
    });

    return { snappedX, snappedY, guides };
  }, [enabled, snapThreshold]);

  const checkAlignment = useCallback((
    draggedElement: {
      id: string | number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): AlignmentResult => {
    const otherElements = elementsArray.filter(el => String(el.id) !== String(draggedElement.id));
    const result = findAlignmentGuides(draggedElement, otherElements);
    setActiveGuides(result.guides);
    return result;
  }, [elementsArray, findAlignmentGuides]);

  const clearGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  return {
    checkAlignment,
    clearGuides,
    activeGuides
  };
};