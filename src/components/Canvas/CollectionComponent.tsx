import React, { useState, useRef, useCallback, useMemo } from 'react';
import { CollectionData, ContentPiece, Connection, CanvasElement } from '@/types/canvas';
import { Folder, Grid3x3, List, LayoutGrid, ChevronDown, ChevronRight, MoreVertical, Plus, Hash, TrendingUp, Calendar, SortAsc } from 'lucide-react';
import { useElementDrag } from '@/hooks/useElementDrag';

interface CollectionComponentProps {
  collection: CollectionData;
  elements: Record<string, CanvasElement>;
  selected: boolean;
  connecting: string | null;
  connections: Connection[];
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<CollectionData>) => void;
  onDelete: (id: string) => void;
  onDeleteWithContents: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
  onRemoveContent: (collectionId: string, contentId: string) => void;
  onOpenContentDetails?: (content: ContentPiece) => void;
}

export const CollectionComponent: React.FC<CollectionComponentProps> = ({
  collection,
  elements,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onDeleteWithContents,
  onConnectionStart,
  onRemoveContent,
  onOpenContentDetails
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [localExpanded, setLocalExpanded] = useState(collection.isExpanded);

  // Get content pieces in this collection
  const contentPieces = useMemo(() => {
    return collection.contentIds
      .map(id => elements[id])
      .filter((el): el is ContentPiece => el?.type === 'content');
  }, [collection.contentIds, elements]);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    const stats = {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      platforms: new Set<string>()
    };

    contentPieces.forEach(content => {
      stats.totalViews += content.viewCount || 0;
      stats.totalLikes += content.likeCount || 0;
      stats.totalComments += content.commentCount || 0;
      if (content.platform) {
        stats.platforms.add(content.platform);
      }
    });

    return stats;
  }, [contentPieces]);

  // Handle drag for moving the collection
  const { isDragging, handleMouseDown, setElementRef, localPosition } = useElementDrag({
    elementId: parseInt(collection.id) || 0,
    initialPosition: collection.position,
    onUpdate: (id, position) => onUpdate(collection.id, { position }),
    onSelect: () => onSelect()
  });

  // Handle drop to add content to collection
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dragData = e.dataTransfer.getData('application/json');
    if (dragData) {
      try {
        const data = JSON.parse(dragData);
        if (data.elementId && elements[data.elementId]?.type === 'content') {
          setIsDraggingOver(true);
          e.dataTransfer.dropEffect = 'copy';
        }
      } catch {}
    }
  }, [elements]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const dragData = e.dataTransfer.getData('application/json');
    if (dragData) {
      try {
        const data = JSON.parse(dragData);
        const element = elements[data.elementId];
        
        if (element?.type === 'content' && !collection.contentIds.includes(data.elementId)) {
          // Add content to collection
          onUpdate(collection.id, {
            contentIds: [...collection.contentIds, data.elementId]
          });
        }
      } catch (error) {
        console.error('Failed to handle drop:', error);
      }
    }
  }, [collection, elements, onUpdate]);

  const handleToggleExpand = useCallback(() => {
    const newExpanded = !localExpanded;
    setLocalExpanded(newExpanded);
    onUpdate(collection.id, { isExpanded: newExpanded });
  }, [localExpanded, collection.id, onUpdate]);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list' | 'compact') => {
    onUpdate(collection.id, { viewMode: mode });
  }, [collection.id, onUpdate]);

  const handleSortOrderChange = useCallback((order: 'manual' | 'date' | 'popularity' | 'alphabetical') => {
    onUpdate(collection.id, { sortOrder: order });
  }, [collection.id, onUpdate]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Sort content pieces based on sort order
  const sortedContent = useMemo(() => {
    const pieces = [...contentPieces];
    
    switch (collection.sortOrder) {
      case 'date':
        return pieces.sort((a, b) => 
          (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0)
        );
      case 'popularity':
        return pieces.sort((a, b) => 
          ((b.viewCount || 0) + (b.likeCount || 0)) - ((a.viewCount || 0) + (a.likeCount || 0))
        );
      case 'alphabetical':
        return pieces.sort((a, b) => 
          (a.title || '').localeCompare(b.title || '')
        );
      default:
        return pieces;
    }
  }, [contentPieces, collection.sortOrder]);

  return (
    <div
      ref={setElementRef}
      className={`absolute bg-white rounded-lg shadow-lg transition-all ${
        selected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'cursor-grabbing opacity-50' : 'cursor-grab'} ${
        isDraggingOver ? 'ring-2 ring-purple-500 bg-purple-50' : ''
      }`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        width: collection.dimensions.width,
        height: localExpanded ? collection.dimensions.height : 80,
        backgroundColor: isDraggingOver ? '#faf5ff' : 'white',
        borderLeft: `4px solid ${collection.color}`,
        zIndex: collection.zIndex,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
          handleMouseDown(e);
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleExpand}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {localExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <Folder size={20} style={{ color: collection.color }} />
            <h3 className="font-semibold text-sm">{collection.name}</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {contentPieces.length} items
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {localExpanded && (
              <>
                {/* View Mode Selector */}
                <div className="flex gap-1 mr-2">
                  <button
                    onClick={() => handleViewModeChange('grid')}
                    className={`p-1 rounded transition-colors ${
                      collection.viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
                    }`}
                    title="Grid view"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('list')}
                    className={`p-1 rounded transition-colors ${
                      collection.viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
                    }`}
                    title="List view"
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('compact')}
                    className={`p-1 rounded transition-colors ${
                      collection.viewMode === 'compact' ? 'bg-gray-200' : 'hover:bg-gray-100'
                    }`}
                    title="Compact view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>

                {/* Sort Selector */}
                <select
                  value={collection.sortOrder || 'manual'}
                  onChange={(e) => handleSortOrderChange(e.target.value as any)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 mr-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="manual">Manual</option>
                  <option value="date">Date</option>
                  <option value="popularity">Popularity</option>
                  <option value="alphabetical">A-Z</option>
                </select>
              </>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(!showContextMenu);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              data-dropdown
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {!localExpanded && contentPieces.length > 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            <span>👁 {formatNumber(aggregatedStats.totalViews)}</span>
            <span>❤️ {formatNumber(aggregatedStats.totalLikes)}</span>
            <span>💬 {formatNumber(aggregatedStats.totalComments)}</span>
            {aggregatedStats.platforms.size > 0 && (
              <span className="ml-auto">
                {Array.from(aggregatedStats.platforms).join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      {localExpanded && (
        <div className="p-3 overflow-auto" style={{ height: collection.dimensions.height - 100 }}>
          {contentPieces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Plus size={32} />
              <p className="mt-2 text-sm">Drag content here to add to collection</p>
            </div>
          ) : (
            <div className={`${
              collection.viewMode === 'grid' ? 'grid grid-cols-2 gap-2' :
              collection.viewMode === 'list' ? 'space-y-2' :
              'grid grid-cols-3 gap-1'
            }`}>
              {sortedContent.map(content => (
                <div
                  key={content.id}
                  className="group relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenContentDetails?.(content);
                  }}
                >
                  {collection.viewMode === 'grid' ? (
                    <div className="bg-gray-50 rounded p-2 hover:bg-gray-100 cursor-pointer transition-colors">
                      <img
                        src={content.thumbnail}
                        alt={content.title}
                        className="w-full h-24 object-cover rounded mb-1"
                      />
                      <p className="text-xs font-medium truncate">{content.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>👁 {formatNumber(content.viewCount || 0)}</span>
                        <span>❤️ {formatNumber(content.likeCount || 0)}</span>
                      </div>
                    </div>
                  ) : collection.viewMode === 'list' ? (
                    <div className="flex items-center gap-2 bg-gray-50 rounded p-2 hover:bg-gray-100 cursor-pointer transition-colors">
                      <img
                        src={content.thumbnail}
                        alt={content.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium truncate">{content.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{content.platform}</span>
                          <span>👁 {formatNumber(content.viewCount || 0)}</span>
                          <span>❤️ {formatNumber(content.likeCount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded p-1 hover:bg-gray-100 cursor-pointer transition-colors">
                      <img
                        src={content.thumbnail}
                        alt={content.title}
                        className="w-full h-16 object-cover rounded"
                        title={content.title}
                      />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveContent(collection.id, content.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded p-1 transition-opacity"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div className="absolute top-10 right-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(collection.id);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
          >
            Delete Collection
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteWithContents(collection.id);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 text-red-600 transition-colors"
          >
            Delete with Contents
          </button>
        </div>
      )}
    </div>
  );
};