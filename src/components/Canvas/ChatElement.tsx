import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { ChatElement as ChatElementType, Connection, CanvasElement, Position } from '@/types';
import { ConnectionPoint } from './ConnectionPoint';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface ChatElementProps {
  element: ChatElementType;
  selected: boolean;
  connecting: string | number | null;
  connections: Connection[];
  allElements: CanvasElement[];
  onSelect: (element: ChatElementType, event?: React.MouseEvent) => void;
  onUpdate: (id: string | number, updates: Partial<ChatElementType>) => void;
  onDelete: (id: string | number) => void;
  onConnectionStart: (elementId: string | number) => void;
  onDragEnd?: () => void;
}

/**
 * Chat element wrapper component
 */
export const ChatElement: React.FC<ChatElementProps> = React.memo(({
  element,
  selected,
  connecting,
  connections,
  allElements,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onDragEnd
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const hasConnections = connections.some(conn => 
    String(conn.from) === String(element.id) || String(conn.to) === String(element.id)
  );

  const handleDragUpdate = useCallback((id: string | number, position: Position) => {
    onUpdate(id, { x: position.x, y: position.y });
  }, [onUpdate]);

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: { x: element.x, y: element.y },
    onUpdate: handleDragUpdate,
    onSelect: (event) => onSelect(element, event),
    onDragEnd
  });

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    console.log('💬 ChatElement: Resizing', { id: element.id, newWidth, newHeight });
    onUpdate(element.id, { width: newWidth, height: newHeight });
  };

  return (
    <div
      ref={setElementRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } pointer-events-auto`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onMouseDown={(e) => {
        // Only start drag if not clicking on resize handles or connection points
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') &&
            !(e.target as HTMLElement).closest('[data-connection-point]')) {
          handleMouseDown(e);
        }
      }}
    >
      <SimpleResize
        width={element.width}
        height={element.height}
        minWidth={850}
        minHeight={620}
        maxWidth={1600}
        maxHeight={1200}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`rounded-lg shadow-lg outline-none focus:outline-none ${
          selected ? 'ring-2 ring-[#E1622B] shadow-xl' : ''
        } ${connecting !== null && String(connecting) === String(element.id) ? 'ring-2 ring-[#E1622B]' : ''}`}
      >
        <ConnectionPoint
          position="left"
          isVisible={true}
          onClick={handleConnectionClick}
        />
        
        <ChatInterface 
          element={element} 
          connections={connections}
          allElements={allElements}
          onDelete={onDelete}
        />
      </SimpleResize>
    </div>
  );
});