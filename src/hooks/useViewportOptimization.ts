import { useMemo } from 'react';
import { CanvasElement, Viewport } from '@/types';

interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Hook to optimize canvas rendering by culling elements outside viewport
 * This significantly improves performance at high zoom levels
 */
export function useViewportOptimization(
  elements: CanvasElement[],
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 100 // Extra padding to render elements slightly outside viewport
) {
  const visibleElements = useMemo(() => {
    // Calculate viewport bounds in canvas coordinates
    const viewportBounds: ViewportBounds = {
      left: -viewport.x / viewport.zoom - padding,
      right: (-viewport.x + canvasWidth) / viewport.zoom + padding,
      top: -viewport.y / viewport.zoom - padding,
      bottom: (-viewport.y + canvasHeight) / viewport.zoom + padding
    };

    // Filter elements that are within the viewport bounds
    return elements.filter(element => {
      const elementRight = element.x + (element.width || 200);
      const elementBottom = element.y + (element.height || 200);

      return (
        element.x < viewportBounds.right &&
        elementRight > viewportBounds.left &&
        element.y < viewportBounds.bottom &&
        elementBottom > viewportBounds.top
      );
    });
  }, [elements, viewport, canvasWidth, canvasHeight, padding]);

  return visibleElements;
}

/**
 * Hook to determine if we should use lower quality rendering for performance
 */
export function useRenderQuality(viewport: Viewport, isDragging: boolean) {
  return useMemo(() => {
    // Use lower quality when zoomed in significantly or dragging
    const shouldUseLowQuality = viewport.zoom > 1.5 || isDragging;
    
    return {
      shouldUseLowQuality,
      imageRendering: shouldUseLowQuality ? 'pixelated' : 'auto',
      willChange: isDragging ? 'transform' : 'auto',
      transform3d: 'translateZ(0)', // Force GPU acceleration
    };
  }, [viewport.zoom, isDragging]);
}