import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { Connection, CanvasElement } from '@/types';

interface ConnectionLineProps {
  connection: Connection;
  elements: CanvasElement[];
  onDelete: (connectionId: number) => void;
}

/**
 * Renders a bezier curve connection line between two elements
 */
export const ConnectionLine: React.FC<ConnectionLineProps> = React.memo(({
  connection,
  elements,
  onDelete
}) => {
  const pathData = useMemo(() => {
    const fromElement = elements.find(el => String(el.id) === String(connection.from));
    const toElement = elements.find(el => String(el.id) === String(connection.to));
    
    if (!fromElement || !toElement) return null;
    
    // Calculate connection point positions based on element types
    let fromX, fromY, toX, toY;
    
    // From element connection point
    // Connection circles are 20px wide (w-5), so radius is 10px
    // Connection points are positioned at:
    // - For content elements (right side): -right-8 (8px outside the right edge)
    // - For chat elements (left side): -left-8 (8px outside the left edge)
    // The center of the circle is therefore at element edge +/- 8px
    
    if (fromElement.type === 'chat') {
      // Chat elements have connection point on left side
      fromX = fromElement.x - 8 - 9; // Center of circle at -8px from left edge, offset 9px left
      fromY = fromElement.y + fromElement.height / 2;
    } else {
      // Content elements have connection point on right side
      fromX = fromElement.x + fromElement.width + 8 + 5; // Center of circle at +8px from right edge, offset 5px right
      fromY = fromElement.y + fromElement.height / 2;
    }
    
    // To element connection point
    if (toElement.type === 'chat') {
      // Chat elements have connection point on left side
      toX = toElement.x - 8 - 9; // Center of circle at -8px from left edge, offset 9px left
      toY = toElement.y + toElement.height / 2;
    } else {
      // Content elements have connection point on right side
      toX = toElement.x + toElement.width + 8 + 5; // Center of circle at +8px from right edge, offset 5px right
      toY = toElement.y + toElement.height / 2;
    }
    
    // Calculate control points for bezier curve
    const distance = Math.abs(toX - fromX);
    const controlPointOffset = Math.min(distance * 0.5, 150);
    
    // Determine the direction of the curve based on element types
    let fromControlX, toControlX;
    
    if (fromElement.type === 'chat') {
      // Chat element: connection exits to the left, so control point should be further left
      fromControlX = fromX - controlPointOffset;
    } else {
      // Content element: connection exits to the right, so control point should be further right
      fromControlX = fromX + controlPointOffset;
    }
    
    if (toElement.type === 'chat') {
      // Chat element: connection enters from the left, so control point should be further left
      toControlX = toX - controlPointOffset;
    } else {
      // Content element: connection enters from the right, so control point should be further right
      toControlX = toX + controlPointOffset;
    }
    
    return {
      path: `M ${fromX} ${fromY} C ${fromControlX} ${fromY}, ${toControlX} ${toY}, ${toX} ${toY}`,
      midX: fromX + (toX - fromX) / 2,
      midY: fromY + (toY - fromY) / 2
    };
  }, [connection, elements]);

  if (!pathData) return null;

  return (
    <g className="connection-group">
      {/* Background path for interaction (no deletion on click) */}
      <path
        d={pathData.path}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="pointer-events-auto"
      />
      
      {/* Animated connection line */}
      <path
        d={pathData.path}
        stroke="#c96442"
        strokeWidth="2"
        fill="none"
        className="connection-line"
        strokeOpacity="0.8"
        style={{ isolation: 'isolate' }}
      />
      
      {/* Flowing dots */}
      <path
        d={pathData.path}
        stroke="url(#connectionGradient)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="5 3"
        className="connection-line"
      />
      
      {/* Delete button - only visible on connection hover */}
      <g className="delete-button opacity-0 transition-opacity duration-200 pointer-events-auto">
        <circle
          cx={pathData.midX}
          cy={pathData.midY}
          r="16"
          fill="#ffffff"
          stroke="#ef4444"
          strokeWidth="2"
          className="cursor-pointer hover:fill-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
        />
        <X
          x={pathData.midX - 6}
          y={pathData.midY - 6}
          width="12"
          height="12"
          className="fill-red-500 pointer-events-none"
        />
      </g>
    </g>
  );
});