import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { TextDarkIcon } from '@/components/icons/PngIcons';
import { TextData } from '@/types/canvas';
import { Connection } from '@/types';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';
import { complexToSimpleConnections } from '@/utils/typeAdapters';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface TextComponentProps {
  element: TextData | any; // Accept both type systems
  selected: boolean;
  connecting: string | number | null;
  connections: Connection[] | any[]; // Accept both connection types
  onSelect: (element: any, event?: React.MouseEvent) => void;
  onUpdate: (id: number | string, updates: any) => void;
  onDelete: (id: string | number) => void;
  onConnectionStart: (elementId: string | number) => void;
  onDragEnd?: () => void;
}

export const TextComponent: React.FC<TextComponentProps> = React.memo(({
  element,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onDragEnd
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [localContent, setLocalContent] = useState(element.content);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isDarkMode } = useDarkMode();

  // Convert connections to simple format if needed
  const simpleConnections = connections[0] && 'source' in connections[0] 
    ? complexToSimpleConnections(connections as any)
    : connections as Connection[];

  const hasConnections = simpleConnections.some(conn => 
    conn.from === Number(element.id) || conn.to === Number(element.id)
  );

  // Handle both type systems
  const elementId = typeof element.id === 'string' ? element.id : element.id.toString();
  const position = element.position || { x: element.x, y: element.y };
  const dimensions = element.dimensions || { width: element.width, height: element.height };
  
  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: Number(element.id),
    initialPosition: position,
    onUpdate: (id, pos) => {
      // Update both formats
      const updates: any = { 
        x: pos.x, 
        y: pos.y,
        position: pos 
      };
      onUpdate(id, updates);
    },
    onSelect: (event) => onSelect(element, event),
    onDragEnd
  });

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(elementId);
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(Number(element.id), { 
      width: newWidth,
      height: newHeight,
      dimensions: { width: newWidth, height: newHeight } 
    });
  };

  // Debounced update function
  const debouncedUpdate = useCallback((updates: Partial<TextData>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('📝 [TextComponent] Debounced update executing:', { id: element.id, updates });
      // Convert string ID to number for Canvas compatibility
      const numericId = typeof element.id === 'string' ? Number(element.id) : element.id;
      onUpdate(numericId, {
        ...updates,
        lastModified: new Date(),
        updatedAt: new Date()
      });
    }, 500); // 500ms debounce delay
  }, [element.id, onUpdate]);


  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    debouncedUpdate({ content: newContent });
  };

  // Sync local state with element props
  useEffect(() => {
    setLocalContent(element.content);
  }, [element.content]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={setElementRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute pointer-events-auto"
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
    >
      <SimpleResize
        width={dimensions.width}
        height={dimensions.height}
        minWidth={200}
        minHeight={150}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg border-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} ${
          selected ? 'ring-2 ring-[#E1622B] shadow-xl' : ''
        } ${connecting !== null && (String(connecting) === String(element.id) || connecting === Number(element.id)) ? 'ring-2 ring-[#E1622B]' : ''}`}
      >
        <ConnectionPoint
          position="right"
          isVisible={true}
          onClick={handleConnectionClick}
        />
        
        <div className="h-full flex flex-col">
          {/* Header - Primary drag handle */}
          <div 
            className={`text-white px-4 py-3 rounded-t-lg flex items-center gap-2 relative ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } select-none`}
            style={{ backgroundColor: '#202a37' }}
            onMouseDown={(e) => {
              // Allow drag from header but not from input or button
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
                e.stopPropagation();
              } else {
                handleMouseDown(e);
              }
            }}
            title="Drag to move"
          >
            <TextDarkIcon size={20} />
            <span className="flex-1 font-medium select-none">Text Info</span>
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('🗑️ [TextComponent] Delete button clicked:', { elementId: element.id });
                onDelete(elementId);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-gray-700 rounded transition-colors ml-auto"
              title="Delete text"
              data-no-drag
            >
              <X className="w-5 h-5 text-gray-400 hover:text-red-400" />
            </button>
          </div>

          {/* Content - Not draggable */}
          <div className={`flex-1 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-b-lg`} onMouseDown={(e) => e.stopPropagation()}>
            <textarea
              value={localContent}
              onChange={handleContentChange}
              placeholder="Enter your text here..."
              className={`w-full h-full resize-none outline-none ${isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'} pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              data-no-drag
              style={{ pointerEvents: 'auto' }}
            />
          </div>
        </div>
      </SimpleResize>
    </div>
  );
});

TextComponent.displayName = 'TextComponent';