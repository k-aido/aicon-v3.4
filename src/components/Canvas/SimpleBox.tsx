import React from 'react';

interface SimpleBoxProps {
  id: string;
  type: 'folder' | 'chat';
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  title: string;
  selected: boolean;
  onSelect: () => void;
}

export const SimpleBox: React.FC<SimpleBoxProps> = ({
  id,
  type,
  position,
  dimensions,
  title,
  selected,
  onSelect
}) => {
  console.log(`SimpleBox rendering: ${type} at`, position);
  
  return (
    <div
      onClick={onSelect}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: type === 'folder' ? '#8B5CF6' : '#3B82F6',
        border: selected ? '3px solid #000' : '2px solid #666',
        borderRadius: '8px',
        padding: '20px',
        cursor: 'pointer',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div>{type === 'folder' ? 'FOLDER' : 'AI CHAT'}</div>
      <div style={{ fontSize: '14px', marginTop: '10px' }}>{title}</div>
      <div style={{ fontSize: '12px', marginTop: '5px' }}>ID: {id}</div>
    </div>
  );
};