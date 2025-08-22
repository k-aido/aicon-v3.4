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
    if (fromElement.type === 'chat') {
      fromX = fromElement.x - 8; // Left side
      fromY = fromElement.y + fromElement.height / 2;
    } else {
      fromX = fromElement.x + fromElement.width + 8; // Right side
      fromY = fromElement.y + fromElement.height / 2;
    }
    
    // To element connection point
    if (toElement.type === 'chat') {
      toX = toElement.x - 8; // Left side
      toY = toElement.y + toElement.height / 2;
    } else {
      toX = toElement.x + toElement.width + 8; // Right side
      toY = toElement.y + toElement.height / 2;
    }
    
    // Calculate control points for bezier curve
    const distance = Math.abs(toX - fromX);
    const controlPointOffset = Math.min(distance * 0.5, 100);
    
    return {
      path: `M ${fromX} ${fromY} C ${fromX + controlPointOffset} ${fromY}, ${toX - controlPointOffset} ${toY}, ${toX} ${toY}`,
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
        stroke="#1e8bff"
        strokeWidth="2"
        fill="none"
        className="connection-line"
        strokeOpacity="0.6"
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