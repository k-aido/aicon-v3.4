import React from 'react';
import { Position } from '@/types';

interface SelectionBoxProps {
  start: Position;
  end: Position;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ start, end }) => {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <div
      className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
      style={{
        left: minX,
        top: minY,
        width,
        height,
        borderRadius: '4px',
        borderStyle: 'dashed'
      }}
    />
  );
};