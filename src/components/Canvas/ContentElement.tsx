import React, { useState, useEffect } from 'react';
import { Youtube, Instagram, Video, ExternalLink, X, Edit, Save, Loader2, AlertCircle } from 'lucide-react';
import { ContentElement as ContentElementType, Connection, Platform } from '@/types';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';
import { useContentScraping } from '@/hooks/useContentScraping';
import { getProxiedImageUrl, getPlatformPlaceholder } from '@/utils/imageProxy';

interface ContentElementProps {
  element: ContentElementType;
  selected: boolean;
  connecting: string | number | null;
  connections: Connection[];
  onSelect: (element: ContentElementType, event?: React.MouseEvent) => void;
  onUpdate: (id: string | number, updates: Partial<ContentElementType>) => void;
  onDelete: (id: string | number) => void;
  onConnectionStart: (elementId: string | number) => void;
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

// Get status border color based on scraping/analysis state
const getStatusBorderColor = (element: ContentElementType): string => {
  const metadata = (element as any).metadata;
  
  // Check for scraping/analysis errors first
  if (metadata?.scrapingError || metadata?.analysisError) {
    return 'border-red-500'; // Error state
  }
  
  // If scraping, show pulsing animation with platform color
  if (metadata?.isScraping) {
    return 'border-blue-500 animate-pulse'; // Scraping in progress
  }
  
  // If analyzing, show yellow regardless of platform
  if (metadata?.isAnalyzing) {
    return 'border-yellow-500'; // Analyzing
  }
  
  // If analyzed, show platform-specific colors
  if (metadata?.isAnalyzed) {
    switch (element.platform.toLowerCase()) {
      case 'youtube':
        return 'border-red-500'; // YouTube red
      case 'instagram':
        return 'border-[#1e8bff]'; // Instagram blue
      case 'tiktok':
        return 'border-black'; // TikTok black
      default:
        return 'border-green-500'; // Default analyzed color
    }
  }
  
  // Not analyzed yet - show platform-specific colors with reduced opacity
  switch (element.platform.toLowerCase()) {
    case 'youtube':
      return 'border-red-300'; // YouTube red (lighter)
    case 'instagram':
      return 'border-[#1e8bff]/60'; // Instagram blue (lighter)
    case 'tiktok':
      return 'border-gray-400'; // TikTok black (lighter as gray)
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const hasConnections = connections.some(conn => 
    String(conn.from) === String(element.id) || String(conn.to) === String(element.id)
  );

  console.log('[ContentElement] Rendering element:', {
    id: element.id,
    idType: typeof element.id,
    x: element.x,
    y: element.y,
    title: element.title,
    metadata: (element as any).metadata,
    onUpdate: typeof onUpdate,
    onSelect: typeof onSelect
  });

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: { x: element.x, y: element.y },
    onUpdate,
    onSelect: (event) => onSelect(element, event)
  });

  console.log('[ContentElement] Drag hook initialized:', {
    isDragging,
    localPosition,
    elementId: element.id
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

  // Analyze content by calling the API (DEPRECATED - using Apify flow now)
  const analyzeContent = async (url: string) => {
    // This function is deprecated - elements should use the Apify scraping flow
    // which handles both scraping and analysis through SocialMediaModal
    console.warn('[ContentElement] analyzeContent called but should use Apify flow instead');
    return;
  };

  const handleReanalysis = () => {
    setShowContextMenu(false);
    analyzeContent(element.url);
  };

  // Sync local state with element metadata
  useEffect(() => {
    const metadata = (element as any).metadata;
    if (metadata) {
      setIsAnalyzing(!!metadata.isAnalyzing);
      setAnalysisError(metadata.analysisError || null);
    }
  }, [(element as any).metadata]);

  // Auto-analyze if URL is set but content hasn't been analyzed yet
  useEffect(() => {
    const metadata = (element as any).metadata;
    const hasUrl = element.url && element.url !== 'https://example.com';
    const notAnalyzed = !metadata?.isAnalyzed && !metadata?.isAnalyzing && !metadata?.analysisError;
    
    // Don't auto-analyze if element is being scraped or has scraping data
    const isBeingScraped = metadata?.isScraping || metadata?.scrapeId;
    
    if (hasUrl && notAnalyzed && !isAnalyzing && !isBeingScraped) {
      // Delay auto-analysis to avoid conflicts during element creation
      const timer = setTimeout(() => {
        analyzeContent(element.url);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [element.url, isAnalyzing]);

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
    const urlChanged = editUrl !== element.url;
    
    onUpdate(element.id, { 
      url: editUrl, 
      platform: editPlatform,
      title: `${editPlatform.charAt(0).toUpperCase() + editPlatform.slice(1)} Content`,
      thumbnail: `https://via.placeholder.com/300x200?text=${editPlatform}&bg=666&color=fff`,
      metadata: {
        ...(element as any).metadata,
        // Reset analysis state if URL changed
        isAnalyzed: urlChanged ? false : (element as any).metadata?.isAnalyzed,
        analysisError: urlChanged ? null : (element as any).metadata?.analysisError
      }
    } as any);
    setIsEditing(false);
    
    // Trigger analysis if URL was changed and is valid
    if (urlChanged && editUrl && editUrl !== 'https://example.com') {
      setTimeout(() => {
        analyzeContent(editUrl);
      }, 500); // Short delay to ensure element is updated
    }
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
        console.log('[ContentElement] onMouseDown triggered for element:', element.id);
        // Only start drag if not clicking on resize handles or edit controls
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') && 
            !(e.target as HTMLElement).closest('[data-no-drag]')) {
          console.log('[ContentElement] Calling handleMouseDown for element:', element.id);
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
          selected ? 'ring-2 ring-[#1e8bff] shadow-xl' : ''
        } ${connecting === element.id ? 'ring-2 ring-[#1e8bff]' : ''}`}
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
              {/* Analysis Status Indicators */}
              {isAnalyzing && (
                <div title="Analyzing content...">
                  <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                </div>
              )}
              {analysisError && (
                <div title={`Error: ${analysisError}`}>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
              )}
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
                onClick={async (e) => {
                  e.stopPropagation();
                  console.log('🗑️ [ContentElement] Delete button clicked:', { elementId: element.id });
                  
                  // Cleanup database if element has scraping data
                  const metadata = (element as any).metadata;
                  if (metadata?.scrapeId) {
                    try {
                      // Get project ID from URL
                      const projectId = window.location.pathname.split('/canvas/')[1];
                      
                      console.log('[ContentElement] Cleaning up content data:', metadata.scrapeId);
                      await fetch('/api/content/cleanup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          scrapeId: metadata.scrapeId,
                          projectId
                        })
                      });
                    } catch (error) {
                      console.error('[ContentElement] Failed to cleanup content:', error);
                      // Continue with deletion even if cleanup fails
                    }
                  }
                  
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
                  onChange={(e) => setEditPlatform(e.target.value as Platform)}
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
          <div className="bg-gray-900 rounded-lg overflow-hidden mb-3 flex-1 min-h-[100px] relative">
            {(element as any).metadata?.scrapingError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-400 text-xs mb-2">Scraping Failed</p>
                <p className="text-gray-400 text-xs leading-tight">{(element as any).metadata?.scrapingError}</p>
                <button
                  onClick={() => {/* TODO: Retry scraping */}}
                  className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (element as any).metadata?.isScraping ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <p className="text-blue-400 text-xs">Scraping content...</p>
              </div>
            ) : (element as any).metadata?.isAnalyzing ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
                <p className="text-yellow-400 text-xs">Analyzing content...</p>
              </div>
            ) : analysisError || (element as any).metadata?.analysisError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-400 text-xs mb-2">Analysis Failed</p>
                <p className="text-gray-400 text-xs leading-tight">{analysisError || (element as any).metadata?.analysisError}</p>
                <button
                  onClick={() => analyzeContent(element.url)}
                  className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  disabled={isAnalyzing}
                >
                  Retry
                </button>
              </div>
            ) : (
              <img 
                src={getProxiedImageUrl(
                  (element as any).metadata?.processedData?.thumbnailUrl || element.thumbnail
                )} 
                alt={(element as any).metadata?.processedData?.title || element.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  // Don't log error for placeholder images
                  if (!img.src.includes('placeholder')) {
                    console.warn('Failed to load thumbnail, using placeholder:', img.src);
                  }
                  img.src = getPlatformPlaceholder(element.platform);
                }}
              />
            )}
          </div>
          
          {/* Title */}
          <h3 className="text-white text-sm font-medium line-clamp-2">
            {(element as any).metadata?.processedData?.title || element.title}
          </h3>
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
            disabled={isAnalyzing}
            className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm outline-none focus:outline-none ${
              isAnalyzing ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' :
             ((element as any).metadata?.isAnalyzed || analysisError) 
              ? 'Re-analyze Content' 
              : 'Analyze Content'
            }
          </button>
        </div>
      )}
    </div>
  );
});