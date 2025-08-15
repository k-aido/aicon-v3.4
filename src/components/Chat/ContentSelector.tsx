import React, { useState, useEffect } from 'react';
import { ContentElement, Connection } from '@/types';
import { Check, Link2, Sparkles, Youtube, Instagram, Video } from 'lucide-react';
import { getProxiedImageUrl, getPlatformPlaceholder } from '@/utils/imageProxy';

interface ContentSelectorProps {
  chatElementId: number;
  connections: Connection[];
  allElements: (ContentElement | any)[];
  selectedContentIds: number[];
  onContentSelectionChange: (contentIds: number[]) => void;
}

// Platform icon component
const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className = "w-4 h-4" }) => {
  switch (platform?.toLowerCase()) {
    case 'youtube':
      return <Youtube className={`${className} text-red-500`} />;
    case 'instagram':
      return <Instagram className={`${className} text-pink-500`} />;
    case 'tiktok':
      return <Video className={`${className} text-white`} />;
    default:
      return <Link2 className={`${className} text-gray-400`} />;
  }
};

export const ContentSelector: React.FC<ContentSelectorProps> = ({
  chatElementId,
  connections,
  allElements,
  selectedContentIds,
  onContentSelectionChange
}) => {
  const [connectedContent, setConnectedContent] = useState<ContentElement[]>([]);
  const [expandedView, setExpandedView] = useState(false);

  useEffect(() => {
    // Find all content elements connected to this chat element
    const connectedIds = connections
      .filter(conn => conn.from === chatElementId || conn.to === chatElementId)
      .map(conn => conn.from === chatElementId ? conn.to : conn.from);

    const contentElements = allElements
      .filter(el => 
        connectedIds.includes(el.id) && 
        el.type === 'content' &&
        (el as any).metadata?.isAnalyzed // Only show analyzed content
      ) as ContentElement[];

    setConnectedContent(contentElements);
  }, [chatElementId, connections, allElements]);

  const toggleContent = (contentId: number) => {
    if (selectedContentIds.includes(contentId)) {
      onContentSelectionChange(selectedContentIds.filter(id => id !== contentId));
    } else {
      onContentSelectionChange([...selectedContentIds, contentId]);
    }
  };

  const toggleAll = () => {
    if (selectedContentIds.length === connectedContent.length) {
      onContentSelectionChange([]);
    } else {
      onContentSelectionChange(connectedContent.map(c => c.id));
    }
  };

  if (connectedContent.length === 0) {
    return (
      <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Link2 className="w-4 h-4" />
          <span>No analyzed content connected</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Connect content elements to use them in chat
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-200">
              RAG Content ({selectedContentIds.length}/{connectedContent.length})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleAll}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              {selectedContentIds.length === connectedContent.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => setExpandedView(!expandedView)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              {expandedView ? 'Compact' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className={`${expandedView ? 'max-h-96' : 'max-h-48'} overflow-y-auto`}>
        {connectedContent.map((content) => {
          const isSelected = selectedContentIds.includes(content.id);
          const metadata = (content as any).metadata;
          const processedData = metadata?.processedData;
          
          return (
            <div
              key={content.id}
              onClick={() => toggleContent(content.id)}
              className={`p-3 border-b border-gray-700 cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-blue-900/30 hover:bg-blue-900/40' 
                  : 'hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-16 h-12 bg-gray-900 rounded overflow-hidden">
                  <img
                    src={getProxiedImageUrl(
                      processedData?.thumbnailUrl || content.thumbnail
                    )}
                    alt={processedData?.title || content.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = getPlatformPlaceholder(content.platform);
                    }}
                  />
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={content.platform} />
                        <h4 className="text-sm font-medium text-gray-200 truncate">
                          {processedData?.title || content.title}
                        </h4>
                      </div>
                      {expandedView && metadata?.analysis && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-400">
                            Topics: {metadata.analysis.key_topics?.slice(0, 3).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Sentiment: {metadata.analysis.sentiment} | 
                            Complexity: {metadata.analysis.complexity}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Selection Indicator */}
                    <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with stats */}
      {selectedContentIds.length > 0 && (
        <div className="p-2 bg-gray-900/50 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            {selectedContentIds.length} content piece{selectedContentIds.length !== 1 ? 's' : ''} will be used for context
          </p>
        </div>
      )}
    </div>
  );
};