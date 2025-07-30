import React, { useState, useEffect } from 'react';
import { Youtube, Instagram, Video, ExternalLink, X, Edit, Save } from 'lucide-react';
import { ContentElement as ContentElementType, Connection } from '@/types';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface ContentElementProps {
  element: ContentElementType;
  selected: boolean;
  connecting: number | null;
  connections: Connection[];
  onSelect: (element: ContentElementType, event?: React.MouseEvent) => void;
  onUpdate: (id: number, updates: Partial<ContentElementType>) => void;
  onDelete: (id: number) => void;
  onConnectionStart: (elementId: number) => void;
  onOpenAnalysisPanel?: (element: ContentElementType) => void;
  onReanalyze?: (element: ContentElementType) => void;
}

const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  switch (platform) {
    case 'youtube':
      return <Youtube className="w-5 h-5 text-red-500" />;
    case 'instagram':
      return <Instagram className="w-5 h-5 text-pink-500" />;
    case 'tiktok':
      return <Video className="w-5 h-5 text-white" />;
    default:
      return null;
  }
};

// Get status border color based on analysis state
const getStatusBorderColor = (element: ContentElementType): string => {
  // Check for analysis error first
  if (element.metadata?.analysisError) {
    return 'border-red-500'; // Error state
  }
  
  // If analyzing, show yellow regardless of platform
  if (element.metadata?.isAnalyzing) {
    return 'border-yellow-500'; // Analyzing
  }
  
  // If analyzed, show platform-specific colors
  if (element.metadata?.isAnalyzed) {
    switch (element.platform.toLowerCase()) {
      case 'youtube':
        return 'border-red-500'; // YouTube red
      case 'instagram':
        return 'border-purple-500'; // Instagram purple
      case 'tiktok':
        return 'border-black'; // TikTok black
      case 'website':
        return 'border-blue-500'; // Website blue
      default:
        return 'border-green-500'; // Default analyzed color
    }
  }
  
  // Not analyzed yet - show platform-specific colors with reduced opacity
  switch (element.platform.toLowerCase()) {
    case 'youtube':
      return 'border-red-300'; // YouTube red (lighter)
    case 'instagram':
      return 'border-purple-300'; // Instagram purple (lighter)
    case 'tiktok':
      return 'border-gray-400'; // TikTok black (lighter as gray)
    case 'website':
      return 'border-blue-300'; // Website blue (lighter)
    default:
      return 'border-gray-300'; // Default not analyzed color
  }
};

/**
 * Content element component for displaying social media content
 */
export const ContentElement: React.FC<ContentElementProps> = React.memo(({
  element,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onOpenAnalysisPanel,
  onReanalyze
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(element.url || '');
  const [editPlatform, setEditPlatform] = useState(element.platform || 'youtube');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  
  const hasConnections = connections.some(conn => 
    conn.from === element.id || conn.to === element.id
  );

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: { x: element.x, y: element.y },
    onUpdate,
    onSelect: (event) => onSelect(element, event)
  });

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleReanalysis = () => {
    setShowContextMenu(false);
    if (onReanalyze) {
      onReanalyze(element);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const handleResize = (newWidth: number, newHeight: number) => {
    console.log('📦 ContentElement: Resizing', { id: element.id, newWidth, newHeight });
    onUpdate(element.id, { width: newWidth, height: newHeight });
  };

  const handleSaveEdit = () => {
    onUpdate(element.id, { 
      url: editUrl, 
      platform: editPlatform,
      title: `${editPlatform.charAt(0).toUpperCase() + editPlatform.slice(1)} Content`,
      thumbnail: `https://via.placeholder.com/300x200?text=${editPlatform}&bg=666&color=fff`
    });
    setIsEditing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenAnalysisPanel) {
      onOpenAnalysisPanel(element);
    }
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
        // Only start drag if not clicking on resize handles or edit controls
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') && 
            !(e.target as HTMLElement).closest('[data-no-drag]')) {
          handleMouseDown(e);
        }
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <SimpleResize
        width={element.width}
        height={element.height}
        minWidth={200}
        minHeight={150}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`bg-gray-800 rounded-lg shadow-lg border-2 ${getStatusBorderColor(element)} ${
          selected ? 'ring-2 ring-blue-500 shadow-xl' : ''
        } ${connecting === element.id ? 'ring-2 ring-purple-500' : ''}`}
      >
        <ConnectionPoint
          position="right"
          isVisible={isHovered || hasConnections}
          onClick={handleConnectionClick}
        />
        
        <div className="p-4 h-full flex flex-col">
          {/* Platform Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={element.platform} />
              <span className="text-white text-sm font-medium capitalize">
                {element.platform}
              </span>
            </div>
            <div className="flex gap-1" data-no-drag>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(!isEditing);
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors outline-none focus:outline-none"
                title="Edit content"
              >
                <Edit className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(element.url, '_blank');
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors outline-none focus:outline-none"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(element.id);
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors outline-none focus:outline-none"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          </div>
          
          {/* Edit Form */}
          {isEditing && (
            <div className="bg-gray-700 rounded-lg p-3 mb-3" data-no-drag>
              <div className="mb-2">
                <label className="block text-gray-300 text-xs mb-1">Platform:</label>
                <select
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                >
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="unknown">Website</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-gray-300 text-xs mb-1">URL:</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="Enter content URL..."
                  className="w-full bg-gray-600 text-white rounded px-2 py-1 text-sm"
                />
              </div>
              <button
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-sm flex items-center gap-1 outline-none focus:outline-none"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
          )}
          
          {/* Thumbnail */}
          <div className="bg-gray-900 rounded-lg overflow-hidden mb-3 flex-1 min-h-[100px]">
            <img 
              src={element.thumbnail} 
              alt={element.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Title */}
          <h3 className="text-white text-sm font-medium line-clamp-2">{element.title}</h3>
        </div>
      </SimpleResize>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <button
            onClick={handleReanalysis}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 outline-none focus:outline-none"
          >
            {element.metadata?.isAnalyzed || element.metadata?.analysisError 
              ? 'Re-analyze Content' 
              : 'Analyze Content'
            }
          </button>
        </div>
      )}
    </div>
  );
});