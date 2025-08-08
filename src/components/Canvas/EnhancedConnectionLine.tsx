import React, { useState } from 'react';
import { Connection, CanvasElement } from '@/types';
import { X, ArrowRight, Zap } from 'lucide-react';

interface EnhancedConnectionLineProps {
  connection: Connection;
  elements: CanvasElement[];
  onDelete: (id: number) => void;
}

export const EnhancedConnectionLine: React.FC<EnhancedConnectionLineProps> = ({
  connection,
  elements,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const fromElement = elements.find(el => el.id === connection.from);
  const toElement = elements.find(el => el.id === connection.to);

  if (!fromElement || !toElement) {
    return null;
  }

  // Calculate connection points
  const fromPoint = {
    x: fromElement.x + fromElement.width,
    y: fromElement.y + fromElement.height / 2
  };

  const toPoint = {
    x: toElement.x,
    y: toElement.y + toElement.height / 2
  };

  // Create curved path
  const midX = (fromPoint.x + toPoint.x) / 2;
  const controlPoint1 = { x: midX, y: fromPoint.y };
  const controlPoint2 = { x: midX, y: toPoint.y };

  const pathData = `
    M ${fromPoint.x} ${fromPoint.y}
    C ${controlPoint1.x} ${controlPoint1.y}
      ${controlPoint2.x} ${controlPoint2.y}
      ${toPoint.x} ${toPoint.y}
  `;

  // Calculate midpoint for delete button
  const midPoint = {
    x: midX,
    y: (fromPoint.y + toPoint.y) / 2
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <g className="pointer-events-auto">
      {/* Connection line */}
      <path
        d={pathData}
        stroke="#6366f1"
        strokeWidth={isHovered ? "3" : "2"}
        fill="none"
        strokeDasharray={isHovered ? "none" : "5,5"}
        strokeLinecap="round"
        className="transition-all duration-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Arrow marker */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6366f1"
          />
        </marker>
      </defs>

      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="12"
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Connection indicator */}
      {isHovered && (
        <g>
          {/* Background circle */}
          <circle
            cx={midPoint.x}
            cy={midPoint.y}
            r="12"
            fill="white"
            stroke="#6366f1"
            strokeWidth="2"
          />
          
          {/* Connection icon */}
          <foreignObject
            x={midPoint.x - 6}
            y={midPoint.y - 6}
            width="12"
            height="12"
          >
            <Zap className="w-3 h-3 text-indigo-600" />
          </foreignObject>
        </g>
      )}

      {/* Delete button */}
      {isHovered && (
        <g>
          <circle
            cx={midPoint.x + 20}
            cy={midPoint.y - 15}
            r="8"
            fill="white"
            stroke="#ef4444"
            strokeWidth="1"
            className="cursor-pointer"
            onClick={() => onDelete(connection.id)}
          />
          <foreignObject
            x={midPoint.x + 20 - 4}
            y={midPoint.y - 15 - 4}
            width="8"
            height="8"
            className="cursor-pointer pointer-events-none"
          >
            <X className="w-2 h-2 text-red-500" />
          </foreignObject>
        </g>
      )}
      </g>
    </svg>
  );
};