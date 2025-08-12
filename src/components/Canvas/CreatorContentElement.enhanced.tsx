import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Instagram, Youtube, Video, Heart, MessageCircle, Eye, Play, ExternalLink, 
  MoreVertical, Loader, CheckCircle, AlertCircle, RefreshCw, ImageOff,
  Calendar, User, TrendingUp, Zap
} from 'lucide-react';
import type { CreatorContentElementType } from '../../../lib/canvas/creatorContentHelpers';
import { formatMetric, getTimeAgo } from '../../../lib/canvas/creatorContentHelpers';
import { useElementDrag } from '@/hooks/useElementDrag';
import { useToast } from '@/components/ui/Toast';

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

type AnalysisStatus = 'not-analyzed' | 'analyzing' | 'completed' | 'error' | 'retrying';
type ImageLoadState = 'loading' | 'loaded' | 'error';

const getAnalysisStatus = (element: CreatorContentElementType): AnalysisStatus => {
  if (element.metadata.isAnalyzing && element.metadata.analysisRetryCount && element.metadata.analysisRetryCount > 0) {
    return 'retrying';
  }
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
    case 'retrying':
      return 'border-orange-400';
    case 'completed':
      return 'border-green-400';
    case 'error':
      return 'border-red-400';
  }
};

const StatusIndicator: React.FC<{ 
  status: AnalysisStatus; 
  onRetry?: () => void; 
  retryCount?: number;
  isClickable?: boolean;
}> = ({ status, onRetry, retryCount, isClickable }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry && isClickable) {
      onRetry();
    }
  };

  switch (status) {
    case 'analyzing':
      return (
        <div className="flex items-center gap-1">
          <Loader className="w-3 h-3 text-yellow-500 animate-spin" />
          <span className="text-xs text-yellow-500">Analyzing</span>
        </div>
      );
    case 'retrying':
      return (
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 text-orange-500 animate-spin" />
          <span className="text-xs text-orange-500">Retry {retryCount}</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-500">Analyzed</span>
        </div>
      );
    case 'error':
      return (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1 ${
            isClickable ? 'hover:bg-red-900/20 rounded px-1 py-0.5 transition-colors' : ''
          }`}
          title={isClickable ? 'Click to retry analysis' : undefined}
        >
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-xs text-red-500">
            {isClickable ? 'Click to retry' : 'Failed'}
          </span>
        </button>
      );
    default:
      return (
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-400">Not analyzed</span>
        </div>
      );
  }
};

const PlaceholderImage: React.FC<{ 
  platform: string; 
  onRetry?: () => void;
  className?: string;
}> = ({ platform, onRetry, className = '' }) => {
  return (
    <div className={`bg-gray-800 flex flex-col items-center justify-center text-gray-400 ${className}`}>
      <ImageOff className="w-8 h-8 mb-2" />
      <PlatformIcon platform={platform} />
      <p className="text-xs mt-1 text-center px-2">Image unavailable</p>
      {onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
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
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(element.title);
  const [showDropdown, setShowDropdown] = useState(false);
  const [imageLoadState, setImageLoadState] = useState<ImageLoadState>('loading');
  const [retryCount, setRetryCount] = useState(0);
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

  // Image loading management
  useEffect(() => {
    if (element.thumbnail) {
      const img = new Image();
      img.onload = () => setImageLoadState('loaded');
      img.onerror = () => setImageLoadState('error');
      img.src = element.thumbnail;
    }
  }, [element.thumbnail]);

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

  const handleAnalyze = useCallback(async () => {
    if (analysisStatus === 'analyzing' || analysisStatus === 'retrying') return;

    const currentRetryCount = (element.metadata.analysisRetryCount || 0) + 1;
    
    // Update element state to show retrying
    onUpdate(element.id, {
      metadata: {
        ...element.metadata,
        isAnalyzing: true,
        analysisError: undefined,
        analysisRetryCount: currentRetryCount
      },
      updatedAt: new Date()
    });

    setRetryCount(currentRetryCount);
    setShowDropdown(false);

    try {
      if (onAnalyze) {
        await onAnalyze(element);
        
        addToast({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Content analysis finished successfully',
          duration: 3000
        });
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      
      onUpdate(element.id, {
        metadata: {
          ...element.metadata,
          isAnalyzing: false,
          analysisError: error.message || 'Analysis failed',
          analysisRetryCount: currentRetryCount
        },
        updatedAt: new Date()
      });

      addToast({
        type: 'error',
        title: 'Analysis Failed',
        message: error.message || 'Content analysis failed. Click the error indicator to retry.',
        duration: 4000
      });
    }
  }, [element, onAnalyze, onUpdate, addToast, analysisStatus]);

  const handleImageRetry = useCallback(() => {
    setImageLoadState('loading');
    if (element.thumbnail) {
      const img = new Image();
      img.onload = () => setImageLoadState('loaded');
      img.onerror = () => setImageLoadState('error');
      img.src = element.thumbnail + `?retry=${Date.now()}`; // Cache bust
    }
  }, [element.thumbnail]);

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

  // Safe value extraction with fallbacks
  const safeMetrics = {
    likes: element.metadata.likes || 0,
    comments: element.metadata.comments || 0,
    views: element.metadata.views || 0
  };

  const postedDate = element.metadata.postedDate;
  const timeAgo = postedDate ? getTimeAgo(postedDate) : '';

  return (
    <div
      ref={(ref) => {
        elementRef.current = ref;
        setElementRef?.(ref);
      }}
      className={`absolute bg-white rounded-lg shadow-lg border-2 transition-all duration-200 cursor-pointer group overflow-hidden ${
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
        <div className="relative flex-shrink-0 h-48 bg-gray-100">
          {imageLoadState === 'loading' && (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Loader className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}
          
          {imageLoadState === 'loaded' && element.thumbnail && (
            <img
              src={element.thumbnail}
              alt="Content thumbnail"
              className="w-full h-full object-cover"
              onError={() => setImageLoadState('error')}
            />
          )}
          
          {imageLoadState === 'error' && (
            <PlaceholderImage 
              platform={element.platform}
              onRetry={handleImageRetry}
              className="w-full h-full"
            />
          )}
          
          {/* Video Play Button Overlay */}
          {isVideo && imageLoadState === 'loaded' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Analysis Status Overlay - Top Left */}
          <div className="absolute top-2 left-2">
            <div className="bg-white/90 rounded-lg px-2 py-1">
              <StatusIndicator 
                status={analysisStatus} 
                onRetry={handleAnalyze}
                retryCount={element.metadata.analysisRetryCount}
                isClickable={analysisStatus === 'error'}
              />
            </div>
          </div>

          {/* Analysis Progress Overlay */}
          {(analysisStatus === 'analyzing' || analysisStatus === 'retrying') && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-gray-700">
                  {analysisStatus === 'retrying' ? `Retrying... (${retryCount})` : 'Analyzing...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="flex-1 p-3 flex flex-col min-h-0">
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
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                  {analysisStatus !== 'analyzing' && analysisStatus !== 'retrying' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyze();
                      }}
                      className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3" />
                      {analysisStatus === 'error' ? 'Retry Analysis' : 'Analyze'}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExternalLink();
                    }}
                    className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Original
                  </button>
                  {imageLoadState === 'error' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageRetry();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reload Image
                    </button>
                  )}
                  <div className="border-t my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
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
          <div className="mb-3 flex-1 min-h-0">
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
                className="text-sm font-medium text-gray-900 line-clamp-2 cursor-text leading-tight"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title={element.title}
              >
                {element.title}
              </h3>
            )}
          </div>

          {/* Metrics Bar */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1" title={`${safeMetrics.likes} likes`}>
                <Heart className="w-3 h-3 text-red-400" />
                <span>{formatMetric(safeMetrics.likes)}</span>
              </div>
              <div className="flex items-center gap-1" title={`${safeMetrics.comments} comments`}>
                <MessageCircle className="w-3 h-3 text-blue-400" />
                <span>{formatMetric(safeMetrics.comments)}</span>
              </div>
              <div className="flex items-center gap-1" title={`${safeMetrics.views} views`}>
                <Eye className="w-3 h-3 text-gray-400" />
                <span>{formatMetric(safeMetrics.views)}</span>
              </div>
            </div>
            
            {timeAgo && (
              <div className="flex items-center gap-1" title={postedDate}>
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">{timeAgo}</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {element.metadata.analysisError && analysisStatus === 'error' && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {element.metadata.analysisError}
            </div>
          )}
        </div>
      </div>

      {/* Resize Handles - TODO: Implement resize functionality */}
      {selected && (
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize opacity-50 hover:opacity-100" />
      )}
    </div>
  );
};