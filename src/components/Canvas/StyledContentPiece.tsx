import React, { useState, useEffect } from 'react';
import { Youtube, Instagram, Video, MoreVertical, Loader, ExternalLink } from 'lucide-react';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface StyledContentPieceProps {
  element: any;
  selected: boolean;
  connecting: string | null;
  onSelect: () => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
  onAnalyze?: (element: any) => void;
}

const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  switch (platform) {
    case 'youtube':
      return (
        <div className="bg-white rounded p-1.5">
          <Youtube className="w-6 h-6 text-red-600" />
        </div>
      );
    case 'instagram':
      return (
        <div className="bg-white rounded p-1.5">
          <Instagram className="w-6 h-6 text-pink-600" />
        </div>
      );
    case 'tiktok':
      return (
        <div className="bg-white rounded p-1.5">
          <Video className="w-6 h-6 text-black" />
        </div>
      );
    default:
      return null;
  }
};

export const StyledContentPiece: React.FC<StyledContentPieceProps> = ({
  element,
  selected,
  connecting,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onAnalyze
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(element.metadata?.isAnalyzing || false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: element.position,
    onUpdate: (id, updates) => onUpdate(element.id, { position: updates }),
    onSelect
  });

  // Update loading state based on metadata
  useEffect(() => {
    setIsLoading(element.metadata?.isAnalyzing || false);
  }, [element.metadata?.isAnalyzing]);

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { 
      dimensions: { width: newWidth, height: newHeight } 
    });
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const getThumbnailUrl = () => {
    if (thumbnailError || !element.thumbnail) {
      return `https://via.placeholder.com/320x180/f3f4f6/9ca3af?text=${element.platform}`;
    }
    return element.thumbnail;
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
    >
      <SimpleResize
        width={element.dimensions.width}
        height={element.dimensions.height}
        minWidth={280}
        minHeight={180}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`rounded-lg shadow-lg overflow-hidden ${
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

        {/* Content Container */}
        <div className="relative h-full bg-gray-900">
          {/* Thumbnail Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${getThumbnailUrl()})`,
              filter: isLoading ? 'blur(4px)' : 'none'
            }}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          {/* Platform Icon */}
          <div className="absolute top-3 left-3">
            <PlatformIcon platform={element.platform} />
          </div>

          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(element.url, '_blank');
              }}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              data-no-drag
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                data-no-drag
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl py-1 z-50">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      if (onAnalyze) onAnalyze(element);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Analyze Content
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onDelete(element.id);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
              {element.title || 'Loading...'}
            </h3>
            {(element.channelName || element.metadata?.channelName) && (
              <p className="text-gray-300 text-xs">
                {element.channelName || element.metadata?.channelName}
              </p>
            )}
            {element.viewCount !== undefined && (
              <p className="text-gray-400 text-xs mt-1">
                {element.viewCount.toLocaleString()} views
              </p>
            )}
          </div>
        </div>
      </SimpleResize>
    </div>
  );
};