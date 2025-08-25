import React from 'react';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides, viewport }) => {
  const { isDarkMode } = useDarkMode();
  
  // Guide color matches the connection lines - orange
  const guideColor = '#c96442';
  
  if (guides.length === 0) return null;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'visible',
        zIndex: 1 // Behind connections
      }}
    >
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          return (
            <line
              key={`v-${index}`}
              x1={guide.position * viewport.zoom + viewport.x}
              y1={guide.start * viewport.zoom + viewport.y}
              x2={guide.position * viewport.zoom + viewport.x}
              y2={guide.end * viewport.zoom + viewport.y}
              stroke={guideColor}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="1"
            />
          );
        } else {
          return (
            <line
              key={`h-${index}`}
              x1={guide.start * viewport.zoom + viewport.x}
              y1={guide.position * viewport.zoom + viewport.y}
              x2={guide.end * viewport.zoom + viewport.x}
              y2={guide.position * viewport.zoom + viewport.y}
              stroke={guideColor}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="1"
            />
          );
        }
      })}
    </svg>
  );
};