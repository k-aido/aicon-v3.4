import React, { memo, useCallback, useMemo } from 'react';
import { ContentElement as ContentElementType, Position } from '@/types';
import { Trash2, ExternalLink, BarChart3, Link, MoreVertical } from 'lucide-react';
import { useElementDrag } from '@/hooks/useElementDrag';
import { debounce } from '@/utils/debounce';

interface ContentElementProps {
  element: ContentElementType;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (position: Position) => void;
  onConnect?: () => void;
  onDelete: () => void;
  onAnalyze?: (element: ContentElementType) => void;
}

/**
 * Optimized content element with memoization and performance improvements
 */
const ContentElementComponent: React.FC<ContentElementProps> = ({
  element,
  isSelected,
  onSelect,
  onPositionChange,
  onConnect,
  onDelete,
  onAnalyze
}) => {
  // Debounced position update for smoother dragging
  const debouncedPositionChange = useMemo(
    () => debounce(onPositionChange, 16), // ~60fps
    [onPositionChange]
  );

  // Element drag handling
  const { isDragging, handleMouseDown } = useElementDrag({
    elementId: element.id,
    initialPosition: { x: element.x, y: element.y },
    onUpdate: (id, position) => onPositionChange(position),
    onSelect: () => onSelect()
  });

  // Memoized styles for better performance
  const elementStyle = useMemo(() => ({
    transform: `translate(${element.x}px, ${element.y}px)`,
    width: element.width,
    height: element.height,
    zIndex: isDragging ? 1000 : isSelected ? 100 : 1
  }), [element.x, element.y, element.width, element.height, isDragging, isSelected]);

  // Memoized class names
  const elementClassName = useMemo(() => {
    const classes = [
      'absolute',
      'bg-white',
      'rounded-lg',
      'shadow-md',
      'overflow-hidden',
      'transition-shadow',
      'duration-200',
      isDragging ? 'cursor-grabbing' : 'cursor-grab',
      isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-lg'
    ];
    return classes.join(' ');
  }, [isDragging, isSelected]);

  // Event handlers with useCallback
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const handleAnalyzeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAnalyze?.(element);
  }, [element, onAnalyze]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleConnectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConnect?.();
  }, [onConnect]);

  // Platform colors
  const platformColors = useMemo(() => ({
    youtube: 'bg-red-500',
    instagram: 'bg-pink-500',
    tiktok: 'bg-black',
    website: 'bg-blue-500',
    unknown: 'bg-gray-500'
  }), []);

  const platformColor = platformColors[element.platform as keyof typeof platformColors] || platformColors.unknown;

  return (
    <div
      className={elementClassName}
      style={elementStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Thumbnail */}
      {element.thumbnail && (
        <div className="relative h-32 bg-gray-200">
          <img
            src={element.thumbnail}
            alt={element.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Platform indicator */}
          <div className={`absolute top-2 left-2 px-2 py-1 ${platformColor} text-white text-xs rounded`}>
            {element.platform}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate mb-1">{element.title}</h3>
        {element.url && (
          <p className="text-xs text-gray-500 truncate">{element.url}</p>
        )}
      </div>

      {/* Actions (visible on hover/selection) */}
      {(isSelected || isDragging) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {onAnalyze && (
            <button
              onClick={handleAnalyzeClick}
              className="p-1 bg-white rounded hover:bg-gray-100 shadow-sm"
              title="Analyze content"
            >
              <BarChart3 className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {onConnect && (
            <button
              onClick={handleConnectClick}
              className="p-1 bg-white rounded hover:bg-gray-100 shadow-sm"
              title="Connect"
            >
              <Link className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className="p-1 bg-white rounded hover:bg-gray-100 shadow-sm"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
};

// Memoized component with custom comparison
export const OptimizedContentElement = memo(ContentElementComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.element.x === nextProps.element.x &&
    prevProps.element.y === nextProps.element.y &&
    prevProps.element.width === nextProps.element.width &&
    prevProps.element.height === nextProps.element.height &&
    prevProps.element.title === nextProps.element.title &&
    prevProps.element.thumbnail === nextProps.element.thumbnail &&
    prevProps.isSelected === nextProps.isSelected
  );
});