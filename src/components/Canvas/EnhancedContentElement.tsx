import React, { useState, useEffect } from 'react';
import { 
  Youtube, Instagram, Video, ExternalLink, X, Edit, Save, 
  MoreHorizontal, Play, Eye, ThumbsUp, Clock, User,
  BarChart3, Zap, RefreshCw, Copy, Share
} from 'lucide-react';
import { ContentElement as ContentElementType, Connection, Platform } from '@/types';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';
import AnalysisProgress from '../AnalysisProgress';

interface EnhancedContentElementProps {
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
  onDuplicate?: (element: ContentElementType) => void;
  onShare?: (element: ContentElementType) => void;
}

const PlatformIcon: React.FC<{ platform: string; size?: number }> = ({ platform, size = 20 }) => {
  const sizeClass = `w-${size/4} h-${size/4}`;
  
  switch (platform.toLowerCase()) {
    case 'youtube':
      return <Youtube className={`${sizeClass} text-red-500`} />;
    case 'instagram':
      return <Instagram className={`${sizeClass} text-pink-500`} />;
    case 'tiktok':
      return <Video className={`${sizeClass} text-black bg-white rounded p-0.5`} />;
    default:
      return <ExternalLink className={`${sizeClass} text-blue-500`} />;
  }
};

const getPlatformGradient = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return 'from-red-500 to-red-600';
    case 'instagram':
      return 'from-pink-500 via-purple-500 to-indigo-500';
    case 'tiktok':
      return 'from-black to-gray-800';
    default:
      return 'from-blue-500 to-blue-600';
  }
};

const getStatusIndicator = (element: ContentElementType) => {
  const metadata = (element as any).metadata;
  
  if (metadata?.analysisError) {
    return { color: 'bg-red-500', pulse: false, label: 'Error' };
  }
  if (metadata?.isAnalyzing) {
    return { color: 'bg-yellow-500', pulse: true, label: 'Analyzing' };
  }
  if (metadata?.isAnalyzed) {
    return { color: 'bg-green-500', pulse: false, label: 'Analyzed' };
  }
  return { color: 'bg-gray-500', pulse: false, label: 'Pending' };
};

const formatDuration = (duration?: string): string => {
  if (!duration) return '';
  // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
  const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const minutes = match[1] || '0';
    const seconds = match[2] || '0';
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }
  return duration;
};

const formatNumber = (num?: number): string => {
  if (!num) return '';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const EnhancedContentElement: React.FC<EnhancedContentElementProps> = ({
  element,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onOpenAnalysisPanel,
  onReanalyze,
  onDuplicate,
  onShare
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [editedTitle, setEditedTitle] = useState(element.title || '');

  const hasConnections = connections.some(conn => 
    conn.from === element.id || conn.to === element.id
  );

  const status = getStatusIndicator(element);
  const analysis = (element as any).analysis;
  const metadata = (element as any).metadata;

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: { x: element.x, y: element.y },
    onUpdate: (id, position) => onUpdate(id, position),
    onSelect: (event) => onSelect(element, event)
  });

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { width: newWidth, height: newHeight });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdate(element.id, { title: editedTitle });
    setIsEditing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <>
      <div
        ref={setElementRef}
        className={`absolute cursor-move transition-all duration-200 ${
          isDragging ? 'z-50' : 'z-10'
        } ${selected ? 'z-40' : ''}`}
        style={{
          width: element.width,
          height: element.height,
          transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
          willChange: isDragging ? 'transform' : 'auto'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
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
          minWidth={280}
          minHeight={200}
          onResize={handleResize}
          showHandle={selected || isHovered}
          className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-200 ${
            selected ? 'border-blue-500 shadow-xl ring-2 ring-blue-200' : 'border-gray-200'
          } ${connecting === element.id ? 'ring-2 ring-purple-500' : ''} ${
            isHovered ? 'shadow-xl' : ''
          }`}
        >
          <ConnectionPoint
            position="right"
            isVisible={isHovered || hasConnections}
            onClick={handleConnectionClick}
          />

          {/* Header with platform info */}
          <div className={`h-12 bg-gradient-to-r ${getPlatformGradient(element.platform)} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative flex items-center justify-between px-4 h-full">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={element.platform} size={20} />
                <span className="text-white font-medium text-sm capitalize">
                  {element.platform}
                </span>
                <div className={`w-2 h-2 rounded-full ${status.color} ${
                  status.pulse ? 'animate-pulse' : ''
                }`} title={status.label}></div>
              </div>

              <div className="flex items-center gap-1" data-no-drag>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnalysis(!showAnalysis);
                  }}
                  className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                  title="Toggle analysis"
                >
                  <BarChart3 className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(element.url, '_blank');
                  }}
                  className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                  title="Open original"
                >
                  <ExternalLink className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(true);
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                  }}
                  className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            {/* Thumbnail and title */}
            <div className="flex gap-3">
              {element.thumbnail && (
                <div className="flex-shrink-0">
                  <img 
                    src={element.thumbnail} 
                    alt="Content thumbnail"
                    className="w-16 h-12 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2" data-no-drag>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {element.title || 'Untitled Content'}
                  </h3>
                )}
                
                {(element as any).author && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span className="truncate">{(element as any).author}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata row */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {(element as any).duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration((element as any).duration)}</span>
                </div>
              )}
              
              {metadata?.viewCount && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatNumber(metadata.viewCount)}</span>
                </div>
              )}
              
              {metadata?.likeCount && (
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{formatNumber(metadata.likeCount)}</span>
                </div>
              )}
            </div>

            {/* Analysis Progress */}
            {(metadata?.isAnalyzing || metadata?.analysisStage) && (
              <AnalysisProgress
                isAnalyzing={metadata?.isAnalyzing || false}
                startTime={metadata?.analysisStartTime}
                stage={metadata?.analysisStage}
                extractionMethod={metadata?.extractionMethod}
                fallbackUsed={metadata?.fallbackUsed}
                error={metadata?.analysisError}
              />
            )}

            {/* Quick analysis preview */}
            {analysis && !showAnalysis && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Analysis Summary</span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analysis.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    analysis.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {analysis.sentiment}
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {analysis.summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Engagement Score: {analysis.engagementScore}/100
                  </span>
                  <button
                    onClick={() => setShowAnalysis(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Full Analysis
                  </button>
                </div>
              </div>
            )}

            {/* Expanded analysis */}
            {analysis && showAnalysis && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">AI Analysis</h4>
                  <button
                    onClick={() => setShowAnalysis(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-700">Summary:</span>
                    <p className="text-xs text-gray-600 mt-1">{analysis.summary}</p>
                  </div>
                  
                  {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-700">Key Points:</span>
                      <ul className="text-xs text-gray-600 mt-1 space-y-1">
                        {analysis.keyPoints.slice(0, 3).map((point: string, index: number) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.topics && analysis.topics.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-700">Topics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.topics.slice(0, 4).map((topic: any, index: number) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                          >
                            {topic.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </SimpleResize>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-40"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          data-no-drag
        >
          <button
            onClick={() => {
              onReanalyze?.(element);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Re-analyze
          </button>
          <button
            onClick={() => {
              onDuplicate?.(element);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={() => {
              onShare?.(element);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Share className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => {
              onOpenAnalysisPanel?.(element);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Full Analysis
          </button>
          <hr className="my-1" />
          <button
            onClick={() => {
              onDelete(element.id);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </>
  );
};