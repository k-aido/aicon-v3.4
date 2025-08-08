import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CanvasElement } from '@/types';

interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface UseCanvasVirtualizationProps {
  elements: Record<string, CanvasElement>;
  viewport: { x: number; y: number; zoom: number };
  containerWidth: number;
  containerHeight: number;
  buffer?: number; // Extra pixels to render outside viewport
}

export const useCanvasVirtualization = ({
  elements,
  viewport,
  containerWidth,
  containerHeight,
  buffer = 100
}: UseCanvasVirtualizationProps) => {
  const [visibleElementIds, setVisibleElementIds] = useState<Set<string>>(new Set());
  const frameId = useRef<number>();
  const lastViewport = useRef(viewport);

  // Calculate viewport bounds in canvas coordinates
  const viewportBounds = useMemo((): ViewportBounds => {
    const left = (-viewport.x - buffer) / viewport.zoom;
    const top = (-viewport.y - buffer) / viewport.zoom;
    const right = (-viewport.x + containerWidth + buffer) / viewport.zoom;
    const bottom = (-viewport.y + containerHeight + buffer) / viewport.zoom;
    
    return { left, top, right, bottom };
  }, [viewport.x, viewport.y, viewport.zoom, containerWidth, containerHeight, buffer]);

  // Check if element is within viewport bounds
  const isElementVisible = useCallback((element: CanvasElement, bounds: ViewportBounds): boolean => {
    const elementRight = element.position.x + element.dimensions.width;
    const elementBottom = element.position.y + element.dimensions.height;
    
    return !(
      element.position.x > bounds.right ||
      elementRight < bounds.left ||
      element.position.y > bounds.bottom ||
      elementBottom < bounds.top
    );
  }, []);

  // Update visible elements with requestAnimationFrame for smooth performance
  const updateVisibleElements = useCallback(() => {
    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
    }

    frameId.current = requestAnimationFrame(() => {
      const newVisibleIds = new Set<string>();
      
      Object.entries(elements).forEach(([id, element]) => {
        if (isElementVisible(element, viewportBounds)) {
          newVisibleIds.add(id);
        }
      });

      setVisibleElementIds(prevIds => {
        // Only update if there are changes
        if (prevIds.size !== newVisibleIds.size || 
            ![...prevIds].every(id => newVisibleIds.has(id))) {
          return newVisibleIds;
        }
        return prevIds;
      });
    });
  }, [elements, viewportBounds, isElementVisible]);

  // Debounced viewport change detection
  useEffect(() => {
    const hasViewportChanged = 
      Math.abs(lastViewport.current.x - viewport.x) > 5 ||
      Math.abs(lastViewport.current.y - viewport.y) > 5 ||
      Math.abs(lastViewport.current.zoom - viewport.zoom) > 0.01;

    if (hasViewportChanged) {
      lastViewport.current = viewport;
      updateVisibleElements();
    }
  }, [viewport, updateVisibleElements]);

  // Update when elements change
  useEffect(() => {
    updateVisibleElements();
  }, [elements, updateVisibleElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, []);

  // Return visible elements as an array for easy mapping
  const visibleElements = useMemo(() => {
    return Array.from(visibleElementIds)
      .map(id => ({ id, element: elements[id] }))
      .filter(({ element }) => element !== undefined);
  }, [visibleElementIds, elements]);

  return {
    visibleElements,
    visibleElementIds,
    totalElements: Object.keys(elements).length,
    visibleCount: visibleElementIds.size
  };
};