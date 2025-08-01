import React, { useState, useRef, useEffect } from 'react';
import { Youtube, Instagram, Video, ExternalLink, MoreVertical, Loader, CheckCircle, AlertCircle, Edit, Save } from 'lucide-react';
import { ContentPiece } from '@/types/canvas';
import { Platform } from '@/types';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface ContentPieceComponentProps {
  element: ContentPiece;
  selected: boolean;
  connecting: string | null;
  connections: Array<{ source: { elementId: string }, target: { elementId: string } }>;
  onSelect: (element: ContentPiece) => void;
  onUpdate: (id: string, updates: Partial<ContentPiece>) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
  onOpenDetails: (element: ContentPiece) => void;
  onAnalyze: (element: ContentPiece) => void;
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

type AnalysisStatus = 'not-analyzed' | 'analyzing' | 'completed' | 'error';

const getAnalysisStatus = (element: ContentPiece): AnalysisStatus => {
  if (!element.analysis) return 'not-analyzed';
  if (element.metadata?.analysisInProgress) return 'analyzing';
  if (element.metadata?.analysisError) return 'error';
  return 'completed';
};

const getStatusColor = (status: AnalysisStatus): string => {
  switch (status) {
    case 'not-analyzed':
      return 'border-red-500';
    case 'analyzing':
      return 'border-yellow-500';
    case 'completed':
      return 'border-green-500';
    case 'error':
      return 'border-red-600';
    default:
      return 'border-gray-600';
  }
};

const StatusIcon: React.FC<{ status: AnalysisStatus }> = ({ status }) => {
  switch (status) {
    case 'analyzing':
      return <Loader className="w-4 h-4 text-yellow-500 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return null;
  }
};

export const ContentPieceComponent: React.FC<ContentPieceComponentProps> = React.memo(({
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
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editPlatform, setEditPlatform] = useState(element.platform);
  const [editUrl, setEditUrl] = useState(element.url);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastClickTime = useRef<number>(0);
  
  const hasConnections = connections.some(conn => 
    conn.source.elementId === element.id || conn.target.elementId === element.id
  );

  const analysisStatus = getAnalysisStatus(element);
  const statusColor = getStatusColor(analysisStatus);

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: parseInt(element.id) || 0,
    initialPosition: element.position,
    onUpdate: (id, updates) => onUpdate(element.id, { position: updates }),
    onSelect: () => onSelect(element)
  });

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowEditForm(false);
      }
    };

    if (showDropdown || showEditForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, showEditForm]);

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { 
      dimensions: { width: newWidth, height: newHeight } 
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetails(element);
  };

  const handleClick = (e: React.MouseEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime.current;
    
    if (timeDiff < 300) {
      // Double click detected
      handleDoubleClick(e);
    } else {
      // Single click
      onSelect(element);
    }
    
    lastClickTime.current = currentTime;
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const handleAnalyze = () => {
    setShowDropdown(false);
    onAnalyze(element);
  };

  const handleDelete = () => {
    setShowDropdown(false);
    onDelete(element.id);
  };

  const handleEditClick = () => {
    setShowDropdown(false);
    setShowEditForm(true);
  };

  const handleSaveEdit = () => {
    onUpdate(element.id, {
      platform: editPlatform,
      url: editUrl,
      title: `${editPlatform.charAt(0).toUpperCase() + editPlatform.slice(1)} Content`
    });
    setShowEditForm(false);
  };

  const handleCancelEdit = () => {
    setEditPlatform(element.platform);
    setEditUrl(element.url);
    setShowEditForm(false);
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
      onClick={handleClick}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') &&
            !(e.target as HTMLElement).closest('[data-dropdown]')) {
          handleMouseDown(e);
        }
      }}
    >
      <SimpleResize
        width={element.dimensions.width}
        height={element.dimensions.height}
        minWidth={200}
        minHeight={150}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`bg-gray-800 rounded-lg shadow-lg border-2 ${statusColor} ${
          selected ? 'ring-2 ring-blue-500 shadow-xl' : ''
        } ${connecting === element.id ? 'ring-2 ring-purple-500' : ''}`}
      >
        <ConnectionPoint
          position="right"
          isVisible={isHovered || hasConnections}
          onClick={handleConnectionClick}
        />
        
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={element.platform} />
              <span className="text-white text-sm font-medium capitalize">
                {element.platform}
              </span>
              <StatusIcon status={analysisStatus} />
            </div>
            <div className="flex gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(element.url, '_blank');
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="relative" data-dropdown>
                <button 
                  onClick={handleDropdownToggle}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                
                {showDropdown && !showEditForm && (
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 mt-1 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-1 z-50"
                  >
                    <button
                      onClick={handleEditClick}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Content
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={handleAnalyze}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                      disabled={analysisStatus === 'analyzing'}
                    >
                      {analysisStatus === 'analyzing' ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {analysisStatus === 'completed' ? 'Re-analyze' : 'Analyze'}
                        </>
                      )}
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Edit Form */}
                {showEditForm && (
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 mt-1 w-72 bg-gray-900 rounded-lg shadow-xl border border-gray-700 p-4 z-50"
                  >
                    <div className="mb-3">
                      <label className="block text-gray-300 text-xs mb-2">Content Type:</label>
                      <select
                        value={editPlatform}
                        onChange={(e) => setEditPlatform(e.target.value as Platform)}
                        className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="website">Website</option>
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-300 text-xs mb-2">URL:</label>
                      <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="Enter content URL..."
                        className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-2 text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Thumbnail */}
          <div className="bg-gray-900 rounded-lg overflow-hidden mb-3 flex-1 min-h-[100px]">
            <img 
              src={element.thumbnail} 
              alt={element.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Thumbnail';
              }}
            />
          </div>
          
          {/* Title */}
          <h3 className="text-white text-sm font-medium line-clamp-2" title={element.title}>
            {element.title}
          </h3>
          
          {/* Analysis Summary (if available) */}
          {element.analysis && (
            <p className="text-gray-400 text-xs mt-1 line-clamp-2">
              {element.analysis.summary}
            </p>
          )}
        </div>
      </SimpleResize>
    </div>
  );
});

ContentPieceComponent.displayName = 'ContentPieceComponent';