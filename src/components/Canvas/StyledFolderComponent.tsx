import React, { useState, useRef } from 'react';
import { Folder, Grid3x3, MoreVertical } from 'lucide-react';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface StyledFolderComponentProps {
  element: any;
  selected: boolean;
  connecting: string | null;
  onSelect: () => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
  onDropContent?: (contentId: string) => void;
}

export const StyledFolderComponent: React.FC<StyledFolderComponentProps> = ({
  element,
  selected,
  connecting,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onDropContent
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.name || 'Group 5');
  const elementRef = useRef<HTMLDivElement>(null);

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: element.position,
    onUpdate: (id, updates) => onUpdate(element.id, { position: updates }),
    onSelect
  });

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { 
      dimensions: { width: newWidth, height: newHeight } 
    });
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleTitleSubmit = () => {
    onUpdate(element.id, { name: title });
    setIsEditing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const contentId = e.dataTransfer.getData('elementId');
    if (contentId && onDropContent) {
      onDropContent(contentId);
    }
  };

  return (
    <div
      ref={setElementRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onClick={onSelect}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') &&
            !(e.target as HTMLElement).closest('[data-no-drag]')) {
          handleMouseDown(e);
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <SimpleResize
        width={element.dimensions.width}
        height={element.dimensions.height}
        minWidth={300}
        minHeight={200}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`bg-white rounded-lg shadow-lg overflow-hidden ${
          selected ? 'ring-2 ring-blue-500' : ''
        } ${connecting === element.id ? 'ring-2 ring-purple-500' : ''}`}
      >
        {/* Connection Points */}
        <ConnectionPoint
          position="left"
          isVisible={isHovered || selected}
          onClick={handleConnectionClick}
        />
        <ConnectionPoint
          position="right"
          isVisible={isHovered || selected}
          onClick={handleConnectionClick}
        />

        {/* Purple Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-white" />
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setTitle(element.name || 'Group 5');
                    setIsEditing(false);
                  }
                }}
                className="bg-transparent text-white font-medium outline-none border-b border-white/50 focus:border-white"
                autoFocus
                data-no-drag
              />
            ) : (
              <h3 
                className="text-white font-medium cursor-text"
                onDoubleClick={() => setIsEditing(true)}
              >
                {element.name || 'Group 5'}
              </h3>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Add dropdown menu logic here
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            data-no-drag
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* White Content Area */}
        <div 
          className="bg-white p-4 relative"
          style={{ height: element.dimensions.height - 48 }}
        >
          {element.childIds && element.childIds.length > 0 ? (
            <div className="text-gray-500 text-sm">
              {element.childIds.length} items
            </div>
          ) : (
            <div className="text-gray-400 text-sm text-center py-8">
              Drag content here to organize
            </div>
          )}

          {/* Grid Icon in Bottom Right */}
          <div className="absolute bottom-2 right-2">
            <Grid3x3 className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </SimpleResize>
    </div>
  );
};