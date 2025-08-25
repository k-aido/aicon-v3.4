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
  
  // Guide color based on theme - using a distinct color from connections
  const guideColor = isDarkMode ? '#9333ea' : '#7c3aed'; // Purple color for guides to distinguish from orange connections
  
  if (guides.length === 0) return null;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'visible',
        zIndex: 1000 // Ensure guides are above connections but below elements
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
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.6"
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
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.6"
            />
          );
        }
      })}
    </svg>
  );
};