import React, { useState, useRef, useEffect } from 'react';
import { Instagram, Youtube, Video, Heart, MessageCircle, Eye, Play, ExternalLink, MoreVertical, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import type { CreatorContentElementType } from '../../../lib/canvas/creatorContentHelpers';
import { formatMetric, getTimeAgo } from '../../../lib/canvas/creatorContentHelpers';
// import { ConnectionPoint } from './ConnectionPoint'; // TODO: Implement connections
import { useElementDrag } from '@/hooks/useElementDrag';
// import { SimpleResize } from './SimpleResize'; // TODO: Implement resize

interface CreatorContentElementProps {
  element: CreatorContentElementType;
  selected: boolean;
  connecting: string | null;
  connections: Array<{ source: { elementId: string }, target: { elementId: string } }>;
  onSelect: (element: CreatorContentElementType) => void;
  onUpdate: (id: string, updates: Partial<CreatorContentElementType>) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
  onOpenDetails?: (element: CreatorContentElementType) => void;
  onAnalyze?: (element: CreatorContentElementType) => void;
}

const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  switch (platform) {
    case 'youtube':
      return <Youtube className="w-4 h-4 text-red-500" />;
    case 'instagram':
      return <Instagram className="w-4 h-4 text-pink-500" />;
    case 'tiktok':
      return <Video className="w-4 h-4 text-white" />;
    default:
      return null;
  }
};

type AnalysisStatus = 'not-analyzed' | 'analyzing' | 'completed' | 'error';

const getAnalysisStatus = (element: CreatorContentElementType): AnalysisStatus => {
  if (element.metadata.isAnalyzing) return 'analyzing';
  if (element.metadata.analysisError) return 'error';
  if (element.analysis && element.metadata.isAnalyzed) return 'completed';
  return 'not-analyzed';
};

const getStatusColor = (status: AnalysisStatus): string => {
  switch (status) {
    case 'not-analyzed':
      return 'border-gray-400';
    case 'analyzing':
      return 'border-yellow-400';
    case 'completed':
      return 'border-green-400';
    case 'error':
      return 'border-red-400';
  }
};

const StatusIndicator: React.FC<{ status: AnalysisStatus }> = ({ status }) => {
  switch (status) {
    case 'analyzing':
      return <Loader className="w-3 h-3 text-yellow-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return <div className="w-3 h-3 rounded-full bg-gray-400" />;
  }
};

export const CreatorContentElement: React.FC<CreatorContentElementProps> = ({
  element,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onOpenDetails,
  onAnalyze
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(element.title);
  const [showDropdown, setShowDropdown] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const analysisStatus = getAnalysisStatus(element);
  const isVideo = element.metadata.videoUrl || element.metadata.duration;

  // Handle drag functionality
  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: parseInt(element.id) || 0,
    initialPosition: { x: element.x, y: element.y },
    onUpdate: (id, position) => onUpdate(element.id, { 
      x: position.x, 
      y: position.y,
      updatedAt: new Date()
    }),
    onSelect: () => onSelect(element)
  });

  const handleClick = () => {
    onSelect(element);
  };

  const handleDoubleClick = () => {
    if (onOpenDetails) {
      onOpenDetails(element);
    }
  };

  const handleTitleSave = () => {
    onUpdate(element.id, { 
      title: editTitle,
      updatedAt: new Date()
    });
    setIsEditing(false);
  };

  const handleAnalyze = () => {
    if (onAnalyze && analysisStatus !== 'analyzing') {
      onAnalyze(element);
    }
    setShowDropdown(false);
  };

  const handleExternalLink = () => {
    window.open(element.url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  const handleDelete = () => {
    onDelete(element.id);
    setShowDropdown(false);
  };

  // Extract creator handle from metadata or URL
  const creatorHandle = element.url.match(/instagram\.com\/([^\/\?]+)/)?.[1] || 'creator';

  return (
    <div
      ref={(ref) => {
        elementRef.current = ref;
        setElementRef?.(ref);
      }}
      className={`absolute bg-white rounded-lg shadow-lg border-2 transition-all duration-200 cursor-pointer group ${
        selected ? `${getStatusColor(analysisStatus)} shadow-xl` : 'border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'scale-105 shadow-xl' : ''} ${connecting ? 'ring-2 ring-blue-400' : ''}`}
      style={{
        left: localPosition?.x ?? element.x,
        top: localPosition?.y ?? element.y,
        width: element.width,
        height: element.height,
        zIndex: selected ? 1000 : element.zIndex || 1,
        transform: isDragging ? 'scale(1.05)' : undefined
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Connection Points - TODO: Implement proper connection system */}

      {/* Content */}
      <div className="h-full flex flex-col">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 h-48 rounded-t-lg overflow-hidden bg-gray-100">
          <img
            src={element.thumbnail}
            alt="Content thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 
                `https://via.placeholder.com/320x192/E5E7EB/9CA3AF?text=${element.platform.toUpperCase()}`;
            }}
          />
          
          {/* Video Play Button Overlay */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
            <StatusIndicator status={analysisStatus} />
          </div>

          {/* Analysis Overlay */}
          {analysisStatus === 'analyzing' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-gray-700">Analyzing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 p-3 flex flex-col">
          {/* Header with Username and Platform */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PlatformIcon platform={element.platform} />
              <span className="text-sm font-medium text-gray-900 truncate">
                @{creatorHandle}
              </span>
            </div>
            
            {/* More Options */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                  {analysisStatus !== 'analyzing' && (
                    <button
                      onClick={handleAnalyze}
                      className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Analyze
                    </button>
                  )}
                  <button
                    onClick={handleExternalLink}
                    className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Original
                  </button>
                  <div className="border-t my-1" />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-1 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="mb-3 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setEditTitle(element.title);
                    setIsEditing(false);
                  }
                }}
                className="w-full text-sm font-medium bg-transparent border-b border-blue-400 focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 
                className="text-sm font-medium text-gray-900 line-clamp-2 cursor-text"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {element.title}
              </h3>
            )}
          </div>

          {/* Metrics Bar */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-400" />
                {formatMetric(element.metadata.likes)}
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3 text-blue-400" />
                {formatMetric(element.metadata.comments)}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-gray-400" />
                {formatMetric(element.metadata.views)}
              </div>
            </div>
            
            {element.metadata.postedDate && (
              <span className="text-xs text-gray-400">
                {getTimeAgo(element.metadata.postedDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resize Handles - TODO: Implement resize functionality */}
      {selected && (
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-50 hover:opacity-100" />
      )}
    </div>
  );
};