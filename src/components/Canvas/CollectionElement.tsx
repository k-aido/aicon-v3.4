import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { FolderPlus, ChevronDown, ChevronRight, MoreVertical, X } from 'lucide-react';
import { CollectionElement as CollectionElementType } from '@/types';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';
import { ConnectionPoint } from './ConnectionPoint';

interface CollectionElementProps {
  element: CollectionElementType;
  selected: boolean;
  connecting: number | null;
  connections: any[];
  allElements: any[];
  onSelect: (element: CollectionElementType, event?: React.MouseEvent) => void;
  onUpdate: (id: number, updates: Partial<CollectionElementType>) => void;
  onDelete: (id: number) => void;
  onConnectionStart: (elementId: number) => void;
}

export const CollectionElement: React.FC<CollectionElementProps> = ({
  element,
  selected,
  connecting,
  connections,
  allElements,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(element.isExpanded !== false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Use element drag hook for repositioning
  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: { x: element.x, y: element.y },
    onUpdate,
    onSelect: (event) => onSelect(element, event)
  });

  const hasConnections = connections.some(conn => 
    conn.from === element.id || conn.to === element.id
  );

  // Handle clicking outside context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu]);

  // Get content items in this collection
  const contentItems = useMemo(() => {
    if (!element.contentIds || element.contentIds.length === 0) return [];
    return element.contentIds
      .map(id => allElements.find(el => el.id === id))
      .filter(Boolean)
      .filter(el => el.type === 'content');
  }, [element.contentIds, allElements]);

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { width: newWidth, height: newHeight });
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    onUpdate(element.id, { isExpanded: !isExpanded });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragging a content element
    const elementData = e.dataTransfer.getData('element');
    if (elementData) {
      try {
        const draggedElement = JSON.parse(elementData);
        if (draggedElement.type === 'content') {
          setIsDraggingOver(true);
          e.dataTransfer.dropEffect = 'copy';
        }
      } catch {}
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const elementData = e.dataTransfer.getData('element');
    if (elementData) {
      try {
        const draggedElement = JSON.parse(elementData);
        if (draggedElement.type === 'content' && draggedElement.id) {
          // Add content to collection if not already present
          const currentIds = element.contentIds || [];
          if (!currentIds.includes(draggedElement.id)) {
            onUpdate(element.id, {
              contentIds: [...currentIds, draggedElement.id]
            });
          }
        }
      } catch (error) {
        console.error('Failed to handle drop:', error);
      }
    }
  };

  const handleRemoveContent = (contentId: number | string) => {
    const updatedIds = (element.contentIds || []).filter(id => id !== contentId);
    onUpdate(element.id, { contentIds: updatedIds });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div
      ref={setElementRef}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        // Only start drag if not clicking on resize handles or controls
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') && 
            !(e.target as HTMLElement).closest('[data-no-drag]')) {
          handleMouseDown(e);
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SimpleResize
        width={element.width || 400}
        height={element.height || 300}
        minWidth={300}
        minHeight={200}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`bg-white rounded-lg shadow-lg transition-all ${
          selected ? 'ring-2 ring-blue-500' : ''
        } ${isDraggingOver ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-lg" style={{ backgroundColor: element.color || '#9333EA' }} />
        
        <ConnectionPoint
          position="right"
          isVisible={isHovered || hasConnections}
          onClick={handleConnectionClick}
        />

        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleExpand}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                data-no-drag
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <FolderPlus size={20} style={{ color: element.color || '#9333EA' }} />
              <h3 className="font-semibold text-sm">{element.name || 'New Collection'}</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {contentItems.length} items
              </span>
            </div>
            
            <div className="relative" ref={contextMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(!showContextMenu);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                data-no-drag
              >
                <MoreVertical size={14} />
              </button>
              
              {/* Context Menu */}
              {showContextMenu && (
                <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(element.id);
                      setShowContextMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    Delete Collection
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          {isExpanded && (
            <div className="flex-1 overflow-auto">
              {contentItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
                  <FolderPlus size={48} className="mb-3 opacity-50" />
                  <p className="text-sm font-medium">No content yet</p>
                  <p className="text-xs mt-1">Drag content items here to add them to this collection</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {contentItems.map((content: any) => (
                    <div
                      key={content.id}
                      className="group relative bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    >
                      {/* Thumbnail */}
                      {content.thumbnail && (
                        <img
                          src={content.thumbnail}
                          alt={content.title || 'Content'}
                          className="w-full h-20 object-cover rounded mb-1"
                        />
                      )}
                      
                      {/* Title */}
                      <p className="text-xs font-medium truncate">
                        {content.title || 'Untitled'}
                      </p>
                      
                      {/* Stats */}
                      {(content.viewCount || content.likeCount) && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {content.viewCount && <span>👁 {formatNumber(content.viewCount)}</span>}
                          {content.likeCount && <span>❤️ {formatNumber(content.likeCount)}</span>}
                        </div>
                      )}
                      
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveContent(content.id);
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 transition-opacity"
                        data-no-drag
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drop Zone Indicator */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-purple-500 bg-opacity-10 rounded-lg flex items-center justify-center pointer-events-none">
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg">
                Drop to add to collection
              </div>
            </div>
          )}
        </div>
      </SimpleResize>
    </div>
  );
};