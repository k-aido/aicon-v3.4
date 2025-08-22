import React, { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical, X } from 'lucide-react';
import { FolderData, CanvasElement, ElementBounds } from '@/types/canvas';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface FolderComponentProps {
  folder: FolderData;
  elements: Record<string, CanvasElement>;
  selected: boolean;
  connecting: string | null;
  connections: Array<{ source: { elementId: string }, target: { elementId: string } }>;
  onSelect: (folder: FolderData) => void;
  onUpdate: (id: string, updates: Partial<FolderData>) => void;
  onDelete: (id: string) => void;
  onDeleteWithContents: (folderId: string, contentIds: string[]) => void;
  onConnectionStart: (elementId: string) => void;
  onUpdateChildPosition: (childId: string, position: { x: number; y: number }) => void;
}

const isElementInFolder = (element: CanvasElement, folder: FolderData): boolean => {
  const elementBounds: ElementBounds = {
    left: element.position.x,
    top: element.position.y,
    right: element.position.x + element.dimensions.width,
    bottom: element.position.y + element.dimensions.height
  };

  const folderBounds: ElementBounds = {
    left: folder.position.x,
    top: folder.position.y + 40, // Account for folder header
    right: folder.position.x + folder.dimensions.width,
    bottom: folder.position.y + folder.dimensions.height
  };

  // Check if element is fully contained within folder
  return elementBounds.left >= folderBounds.left &&
         elementBounds.top >= folderBounds.top &&
         elementBounds.right <= folderBounds.right &&
         elementBounds.bottom <= folderBounds.bottom;
};

export const FolderComponent: React.FC<FolderComponentProps> = React.memo(({
  folder,
  elements,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onDeleteWithContents,
  onConnectionStart,
  onUpdateChildPosition
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const previousBounds = useRef<{ x: number; y: number; width: number; height: number }>({
    x: folder.position.x,
    y: folder.position.y,
    width: folder.dimensions.width,
    height: folder.dimensions.height
  });

  // Calculate contained items
  const containedItems = Object.values(elements).filter(element => 
    element.id !== folder.id && isElementInFolder(element, folder)
  );
  const itemCount = containedItems.length;

  // Update folder's childIds when items move in/out
  useEffect(() => {
    const currentChildIds = containedItems.map(item => item.id);
    const hasChanged = 
      currentChildIds.length !== folder.childIds.length ||
      !currentChildIds.every(id => folder.childIds.includes(id));

    if (hasChanged) {
      onUpdate(folder.id, { childIds: currentChildIds });
    }
  }, [containedItems, folder.childIds, folder.id, onUpdate]);

  const hasConnections = connections.some(conn => 
    conn.source.elementId === folder.id || conn.target.elementId === folder.id
  );

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: parseInt(folder.id) || 0,
    initialPosition: folder.position,
    onUpdate: (id, updates) => {
      // Calculate movement delta
      const deltaX = updates.x - previousBounds.current.x;
      const deltaY = updates.y - previousBounds.current.y;

      // Update folder position
      onUpdate(folder.id, { position: updates });

      // Move all contained items with the folder
      containedItems.forEach(item => {
        onUpdateChildPosition(item.id, {
          x: item.position.x + deltaX,
          y: item.position.y + deltaY
        });
      });

      // Update previous bounds
      previousBounds.current.x = updates.x;
      previousBounds.current.y = updates.y;
    },
    onSelect: () => onSelect(folder)
  });

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(folder.id);
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(folder.id, { 
      dimensions: { width: newWidth, height: newHeight } 
    });
    previousBounds.current.width = newWidth;
    previousBounds.current.height = newHeight;
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleDelete = () => {
    setShowDropdown(false);
    if (itemCount > 0) {
      if (confirm(`Delete folder and all ${itemCount} items inside?`)) {
        onDeleteWithContents(folder.id, folder.childIds);
      }
    } else {
      onDelete(folder.id);
    }
  };

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(folder.id, { isExpanded: !folder.isExpanded });
  };

  return (
    <div
      ref={(el) => {
        setElementRef(el);
        folderRef.current = el;
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } pointer-events-auto`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto',
        zIndex: folder.zIndex || 1 // Folders should be below content by default
      }}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') &&
            !(e.target as HTMLElement).closest('[data-dropdown]') &&
            !(e.target as HTMLElement).closest('[data-no-drag]')) {
          handleMouseDown(e);
        }
      }}
    >
      <SimpleResize
        width={folder.dimensions.width}
        height={folder.dimensions.height}
        minWidth={300}
        minHeight={200}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`rounded-lg shadow-lg ${
          selected ? 'ring-2 ring-[#1e8bff] shadow-xl' : ''
        } ${connecting === folder.id ? 'ring-2 ring-[#1e8bff]' : ''}`}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundColor: folder.color + '20', // Add transparency to folder color
            border: `2px solid ${folder.color}`,
            borderRadius: '0.5rem'
          }}
        >
        <ConnectionPoint
          position="right"
          isVisible={isHovered || hasConnections}
          onClick={handleConnectionClick}
        />
        
        {/* Folder Header */}
        <div className="bg-gray-800 bg-opacity-90 rounded-t-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={handleToggleExpanded}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              data-no-drag
            >
              {folder.isExpanded ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </button>
            {folder.isExpanded ? 
              <FolderOpen className="w-5 h-5" style={{ color: folder.color }} /> : 
              <Folder className="w-5 h-5" style={{ color: folder.color }} />
            }
            <span className="text-white font-medium">{folder.name}</span>
            <span className="text-gray-400 text-sm">({itemCount})</span>
          </div>
          
          {/* Dropdown Menu */}
          <div className="relative" data-dropdown>
            <button 
              onClick={handleDropdownToggle}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="More options"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            {showDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 mt-1 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-50"
              >
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {itemCount > 0 ? `Delete with ${itemCount} items` : 'Delete folder'}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Folder Content Area */}
        <div className="p-4 h-full" style={{ 
          minHeight: folder.dimensions.height - 50,
          backgroundColor: 'rgba(0, 0, 0, 0.1)'
        }}>
          {folder.description && (
            <p className="text-gray-400 text-sm mb-2">{folder.description}</p>
          )}
          
          {/* Visual hint when empty */}
          {itemCount === 0 && folder.isExpanded && (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-500 text-sm">Drop items here</p>
            </div>
          )}
        </div>
        </div>
      </SimpleResize>
    </div>
  );
});

FolderComponent.displayName = 'FolderComponent';