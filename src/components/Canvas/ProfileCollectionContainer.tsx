import React, { useState, useRef } from 'react';
import { Settings, Expand, GripHorizontal, Plus } from 'lucide-react';
import ProfileContentCard from './ProfileContentCard';
import { ProfileContentItem } from '@/data/mockProfileContent';

interface ProfileCollectionData {
  id: string;
  type: 'profile-collection';
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  platform: 'youtube' | 'instagram' | 'tiktok';
  username: string;
  url: string;
  filterBy: 'latest' | 'likes' | 'comments' | 'views';
  amount: number;
  isVisible: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  zIndex: number;
  // Profile content items
  contentItems?: ProfileContentItem[];
  isLoading?: boolean;
}

interface ProfileCollectionContainerProps {
  element: ProfileCollectionData;
  selected: boolean;
  connecting?: string | null;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<ProfileCollectionData>) => void;
  onDelete: (id: string) => void;
  onContentDoubleClick?: (content: ProfileContentItem) => void;
  onConnectionStart?: (elementId: string) => void;
}

const ProfileCollectionContainer: React.FC<ProfileCollectionContainerProps> = ({
  element,
  selected,
  connecting,
  onSelect,
  onUpdate,
  onDelete,
  onContentDoubleClick,
  onConnectionStart
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const platformColors = {
    youtube: '#FF0000',
    instagram: '#E4405F',
    tiktok: '#000000'
  };

  const platformNames = {
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok'
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('draggable-area')) {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
      
      setIsDragging(true);
      setDragStart({
        x: e.clientX - element.position.x,
        y: e.clientY - element.position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      onUpdate(element.id, {
        position: { x: newX, y: newY },
        updatedAt: new Date()
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(300, resizeStart.width + deltaX);
      const newHeight = Math.max(200, resizeStart.height + deltaY);
      
      onUpdate(element.id, {
        dimensions: { width: newWidth, height: newHeight },
        updatedAt: new Date()
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.dimensions.width,
      height: element.dimensions.height
    });
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    // TODO: Open settings modal
    console.log('Settings clicked for', element.username);
  };

  const handleContentDoubleClick = (content: ProfileContentItem) => {
    if (onContentDoubleClick) {
      onContentDoubleClick(content);
    }
  };

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onConnectionStart) {
      onConnectionStart(element.id);
    }
  };

  // Add global mouse event listeners
  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  return (
    <div
      ref={containerRef}
      className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-grab active:cursor-grabbing transition-all duration-200 ${
        selected ? 'border-purple-500 shadow-purple-200' : 'border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.dimensions.width,
        height: element.dimensions.height,
        zIndex: element.zIndex
      }}
      onMouseDown={handleMouseDown}
      onClick={onSelect}
    >
      {/* Header Bar */}
      <div 
        className="draggable-area flex items-center justify-between px-3 py-2 border-b border-gray-100 rounded-t-lg"
        style={{ backgroundColor: `${platformColors[element.platform]}15` }}
      >
        {/* Platform Tag */}
        <div 
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium"
          style={{ backgroundColor: platformColors[element.platform] }}
        >
          <span>{platformNames[element.platform]} {element.username}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSettingsClick}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={handleSettingsClick}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Expand"
          >
            <Expand className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {element.isLoading ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing profile...</p>
              <p className="text-sm text-gray-500 mt-1">
                Extracting {element.amount} {element.filterBy} posts...
              </p>
            </div>
          </div>
        ) : element.contentItems && element.contentItems.length > 0 ? (
          <div className="p-3 h-full overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 auto-rows-max">
              {element.contentItems.map((item) => (
                <ProfileContentCard
                  key={item.id}
                  content={item}
                  onDoubleClick={handleContentDoubleClick}
                  onExternalLink={handleExternalLink}
                />
              ))}
            </div>
            {/* Add more content button */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button className="w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm text-gray-600">
                <Plus className="w-4 h-4" />
                Load more content
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 p-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg mb-4 mx-auto flex items-center justify-center">
                <Settings className="w-8 h-8 text-gray-300" />
              </div>
              <p>Profile collection ready</p>
              <p className="text-sm mt-1">
                {element.amount} {element.filterBy} posts
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {selected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 rounded-tl-md cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <GripHorizontal className="w-3 h-3 text-white absolute bottom-0.5 right-0.5" />
        </div>
      )}

      {/* Connection Points */}
      {selected && onConnectionStart && (
        <>
          {/* Right connection point */}
          <div
            className={`absolute right-0 top-1/2 w-3 h-3 -mr-1.5 -mt-1.5 rounded-full border-2 border-white cursor-pointer transition-colors ${
              connecting === element.id ? 'bg-purple-600' : 'bg-purple-500 hover:bg-purple-600'
            }`}
            onClick={handleConnectionClick}
            title="Connect to AI Chat"
          />
          {/* Left connection point */}
          <div
            className={`absolute left-0 top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white cursor-pointer transition-colors ${
              connecting === element.id ? 'bg-purple-600' : 'bg-purple-500 hover:bg-purple-600'
            }`}
            onClick={handleConnectionClick}
            title="Connect from AI Chat"
          />
        </>
      )}

      {/* Selection Outline */}
      {selected && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

export default ProfileCollectionContainer;