import React, { useState, useEffect } from 'react';
import { Youtube, Instagram, Video, ExternalLink, X, Edit, Save, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { ContentElement as ContentElementType, Connection, Platform } from '@/types';
import { ContentAnalysis, VideoTranscript } from '@/types/analysis';
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
  if ((element as any).metadata?.analysisError) {
    return 'border-red-500'; // Error state
  }
  
  // If analyzing, show yellow regardless of platform
  if ((element as any).metadata?.isAnalyzing) {
    return 'border-yellow-500'; // Analyzing
  }
  
  // If analyzed, show platform-specific colors
  if ((element as any).metadata?.isAnalyzed) {
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
  console.log('[ContentElement] Rendering element:', { id: element.id, url: element.url, platform: element.platform });
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(element.url || '');
  const [editPlatform, setEditPlatform] = useState(element.platform || 'youtube');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'pending' | 'transcribing' | 'analyzing' | 'completed' | 'failed'>('pending');
  
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

  // Enhanced analyze content function using the new API
  const analyzeContent = async () => {
    if (isAnalyzing) {
      console.log('[ContentElement] Analysis already in progress, skipping');
      return;
    }
    
    // Check if already analyzing based on metadata
    const metadata = (element as any).metadata;
    if (metadata?.isAnalyzing) {
      console.log('[ContentElement] Analysis already in progress (metadata), skipping');
      return;
    }

    // Get the Supabase content ID from element metadata
    const supabaseContentId = metadata?.contentId;
    
    if (!supabaseContentId) {
      console.error('[ContentElement] No Supabase content ID found in metadata');
      setAnalysisError('Content not properly linked to database');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStatus('analyzing');
    
    // Update element metadata to show analyzing state
    onUpdate(element.id, {
      metadata: {
        ...metadata,
        isAnalyzing: true,
        isAnalyzed: false,
        analysisError: null
      }
    } as any);

    try {
      console.log('[ContentElement] Starting enhanced content analysis for:', supabaseContentId);
      
      const response = await fetch('/api/content/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          contentId: supabaseContentId,
          forceReanalysis: true 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      console.log('[ContentElement] Enhanced content analysis successful:', data);

      if (data.success && data.analysis) {
        setAnalysisStatus('completed');
        
        // Update element metadata
        onUpdate(element.id, {
          metadata: {
            ...metadata,
            isAnalyzing: false,
            isAnalyzed: true,
            analysisError: null,
            analyzedAt: new Date().toISOString()
          }
        } as any);
      }

      setAnalysisError(null);
      
    } catch (error: any) {
      console.error('[ContentElement] Enhanced content analysis failed:', error);
      
      const errorMessage = error.message || 'Failed to analyze content';
      setAnalysisError(errorMessage);
      setAnalysisStatus('failed');
      
      // Update element metadata with error state
      onUpdate(element.id, {
        metadata: {
          ...metadata,
          isAnalyzing: false,
          isAnalyzed: false,
          analysisError: errorMessage
        }
      } as any);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReanalysis = () => {
    setShowContextMenu(false);
    analyzeContent();
  };

  // Sync local state with element metadata
  useEffect(() => {
    const metadata = (element as any).metadata;
    if (metadata) {
      setIsAnalyzing(!!metadata.isAnalyzing);
      setAnalysisError(metadata.analysisError || null);
    }
  }, [(element as any).metadata]);

  // Auto-analyze if content is linked to Supabase and hasn't been analyzed yet
  useEffect(() => {
    const metadata = (element as any).metadata;
    const hasUrl = element.url && element.url !== 'https://example.com';
    const hasContentId = metadata?.contentId;
    const notAnalyzed = !metadata?.isAnalyzed && !metadata?.isAnalyzing && !metadata?.analysisError;
    
    console.log('[ContentElement] Auto-analysis check:', {
      elementId: element.id,
      hasUrl,
      hasContentId,
      notAnalyzed,
      isAnalyzing,
      shouldTrigger: hasUrl && hasContentId && notAnalyzed && !isAnalyzing
    });
    
    if (hasUrl && hasContentId && notAnalyzed && !isAnalyzing) {
      console.log('[ContentElement] ✅ Triggering auto-analysis for element:', element.id);
      // Delay auto-analysis to avoid conflicts during element creation
      const timer = setTimeout(() => {
        analyzeContent();
      }, 2000); // Slightly longer delay to ensure Supabase record is ready
      
      return () => clearTimeout(timer);
    } else {
      console.log('[ContentElement] ❌ Skipping auto-analysis - conditions not met');
    }
  }, [element.url, (element as any).metadata?.contentId, (element as any).metadata?.isAnalyzing, (element as any).metadata?.isAnalyzed]);

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

  const handleSaveEdit = async () => {
    const urlChanged = editUrl !== element.url;
    const isValidUrl = editUrl && editUrl !== 'https://example.com' && editUrl.startsWith('http');
    
    console.log('[ContentElement] handleSaveEdit called:', {
      elementId: element.id,
      oldUrl: element.url,
      newUrl: editUrl,
      platform: editPlatform,
      urlChanged,
      isValidUrl
    });
    
    // Update element first
    onUpdate(element.id, { 
      url: editUrl, 
      platform: editPlatform,
      title: `${editPlatform.charAt(0).toUpperCase() + editPlatform.slice(1)} Content`,
      thumbnail: `https://via.placeholder.com/300x200?text=${editPlatform}&bg=666&color=fff`,
      metadata: {
        ...(element as any).metadata,
        // Reset analysis state if URL changed
        isAnalyzed: urlChanged ? false : (element as any).metadata?.isAnalyzed,
        analysisError: urlChanged ? null : (element as any).metadata?.analysisError,
        contentId: urlChanged ? null : (element as any).metadata?.contentId // Reset content ID if URL changed
      }
    } as any);
    setIsEditing(false);
    
    // Create Supabase record if URL was changed to a valid URL
    console.log('[ContentElement] Checking conditions for Supabase creation:', {
      urlChanged,
      isValidUrl,
      willCreateRecord: urlChanged && isValidUrl,
      oldUrl: element.url,
      newUrl: editUrl
    });
    
    if (urlChanged && isValidUrl) {
      console.log('[ContentElement] ✅ CONDITIONS MET - URL changed to valid URL, creating Supabase record');
      
      try {
        const response = await fetch('/api/content/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: editUrl,
            platform: editPlatform.toLowerCase(),
            title: `${editPlatform.charAt(0).toUpperCase() + editPlatform.slice(1)} Content`,
            thumbnail: `https://via.placeholder.com/300x200?text=${editPlatform}&bg=666&color=fff`,
            canvasElementId: element.id
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log('[ContentElement] Supabase content record created:', data.contentId);
          
          // Update element with Supabase content ID
          onUpdate(element.id, {
            metadata: {
              ...(element as any).metadata,
              contentId: data.contentId
            }
          } as any);
          
          // Trigger analysis after a short delay
          setTimeout(() => {
            analyzeContent();
          }, 1000);
        } else {
          console.error('[ContentElement] Failed to create Supabase record:', data.error);
          onUpdate(element.id, {
            metadata: {
              ...(element as any).metadata,
              analysisError: `Failed to link content: ${data.error || 'Unknown error'}`
            }
          } as any);
        }
      } catch (error) {
        console.error('[ContentElement] Error creating Supabase record:', error);
        onUpdate(element.id, {
          metadata: {
            ...(element as any).metadata,
            analysisError: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        } as any);
      }
    } else {
      console.log('[ContentElement] ❌ CONDITIONS NOT MET for Supabase creation:', {
        reason: !urlChanged ? 'URL did not change' : 'URL is not valid',
        urlChanged,
        isValidUrl,
        currentMetadata: (element as any).metadata
      });
      
      if (!urlChanged && isValidUrl) {
        // URL didn't change but it's valid, trigger analysis if we have contentId
        const metadata = (element as any).metadata;
        console.log('[ContentElement] Checking for existing contentId to trigger analysis:', metadata?.contentId);
        if (metadata?.contentId) {
          console.log('[ContentElement] Found existing contentId, triggering analysis');
          setTimeout(() => {
            analyzeContent();
          }, 500);
        } else {
          console.log('[ContentElement] No contentId found, cannot trigger analysis');
        }
      }
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
        isDragging ? 'cursor-grabbing' : (isHovered ? 'cursor-pointer' : 'cursor-grab')
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
        }`}
        style={{
          ...(connecting === element.id && { 
            outline: '2px solid #E1622B',
            outlineOffset: '-2px'
          })
        }}
      >
        <ConnectionPoint
          position="right"
          isVisible={true}
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
                  console.log('[ContentElement] Edit button clicked, toggling edit state:', { elementId: element.id, currentState: isEditing, newState: !isEditing });
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
                  if (onOpenAnalysisPanel) {
                    onOpenAnalysisPanel(element);
                  }
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors outline-none focus:outline-none"
                title="View analysis"
              >
                <BarChart3 className="w-4 h-4 text-gray-400" />
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
                  console.log('🗑️ [ContentElement] Delete button clicked:', { elementId: element.id });
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
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('[ContentElement] Save button clicked');
                  handleSaveEdit();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-sm flex items-center gap-1 outline-none focus:outline-none"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
          )}
          
          {/* Thumbnail */}
          <div className="bg-gray-900 rounded-lg overflow-hidden mb-3 flex-1 min-h-[100px] relative">
            {analysisError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <p className="text-red-400 text-xs mb-2">Analysis Failed</p>
                <p className="text-gray-400 text-xs leading-tight">{analysisError}</p>
                <button
                  onClick={() => analyzeContent()}
                  className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  disabled={isAnalyzing}
                >
                  Retry
                </button>
              </div>
            ) : isAnalyzing || analysisStatus === 'transcribing' ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                {/* Background thumbnail with overlay */}
                {element.thumbnail && (
                  <img 
                    src={element.thumbnail} 
                    alt={element.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                )}
                {/* Analysis overlay */}
                <div className="relative z-10 flex flex-col items-center justify-center p-4 bg-black bg-opacity-60 rounded-lg">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                  <div className="text-center">
                    <p className="text-blue-400 text-sm font-medium mb-1">
                      {analysisStatus === 'transcribing' ? 'Extracting Audio...' : 'Analyzing Content...'}
                    </p>
                    <p className="text-gray-300 text-xs">
                      {analysisStatus === 'transcribing' 
                        ? 'Getting video transcript' 
                        : 'AI analyzing hook, body & CTA'
                      }
                    </p>
                  </div>
                </div>
                {/* Progress indicator */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={element.thumbnail} 
                  alt={element.title}
                  className="w-full h-full object-cover"
                />
                {/* Analysis completed badge */}
                {(element as any).metadata?.isAnalyzed && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Analyzed
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Title */}
          <div className="space-y-1">
            <h3 className="text-white text-sm font-medium line-clamp-2">{element.title}</h3>
            
            {/* Analysis Status Bar */}
            {(isAnalyzing || analysisStatus === 'transcribing') && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>
                    {analysisStatus === 'transcribing' ? 'Transcribing...' : 'Analyzing...'}
                  </span>
                </div>
                <div className="flex-1 bg-gray-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full transition-all duration-1000 animate-pulse" 
                       style={{width: analysisStatus === 'transcribing' ? '30%' : '70%'}}></div>
                </div>
              </div>
            )}
            
            {/* Analysis Completed Status */}
            {(element as any).metadata?.isAnalyzed && !isAnalyzing && analysisStatus !== 'transcribing' && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <BarChart3 className="w-3 h-3" />
                <span>Ready for analysis review</span>
                {isHovered && (
                  <span className="text-gray-400 ml-1 transition-opacity duration-200">
                    • Double-click to view
                  </span>
                )}
              </div>
            )}
            
            {/* Double-click hint for pending analysis */}
            {!isAnalyzing && analysisStatus === 'pending' && isHovered && (
              <div className="flex items-center gap-1 text-xs text-gray-400 transition-opacity duration-200">
                <BarChart3 className="w-3 h-3" />
                <span>Double-click to view analysis</span>
              </div>
            )}
            
            {/* Analysis Error Status */}
            {analysisError && !isAnalyzing && (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>Analysis failed - click to retry</span>
              </div>
            )}
          </div>
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