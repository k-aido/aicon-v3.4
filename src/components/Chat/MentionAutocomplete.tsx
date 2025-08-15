import React, { useState, useEffect, useRef } from 'react';
import { ContentElement } from '@/types';
import { Youtube, Instagram, Video, Link2, Hash } from 'lucide-react';
import { getProxiedImageUrl, getPlatformPlaceholder } from '@/utils/imageProxy';

interface MentionAutocompleteProps {
  searchQuery: string;
  availableContent: ContentElement[];
  onSelect: (content: ContentElement) => void;
  onClose: () => void;
  position: { top: number; left: number };
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

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  searchQuery,
  availableContent,
  onSelect,
  onClose,
  position
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredContent, setFilteredContent] = useState<ContentElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  console.log('[MentionAutocomplete] Rendered with:', { 
    searchQuery, 
    availableContentCount: availableContent.length,
    position 
  });

  // Filter content based on search query
  useEffect(() => {
    // If no search query, show all available content
    if (!searchQuery) {
      console.log('[MentionAutocomplete] No search query, showing all content');
      setFilteredContent(availableContent);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = availableContent.filter(content => {
      const metadata = (content as any).metadata;
      const title = (metadata?.processedData?.title || content.title || '').toLowerCase();
      const platform = content.platform.toLowerCase();
      const url = (content.url || '').toLowerCase();
      
      // Search in title, platform, and URL
      return title.includes(query) || 
             platform.includes(query) || 
             url.includes(query) ||
             platform.startsWith(query); // Allow partial platform matches
    });
    
    console.log('[MentionAutocomplete] Filtered content:', filtered);
    setFilteredContent(filtered);
    setSelectedIndex(0);
  }, [searchQuery, availableContent]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredContent.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredContent[selectedIndex]) {
            onSelect(filteredContent[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (filteredContent[selectedIndex]) {
            onSelect(filteredContent[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredContent, selectedIndex, onSelect, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredContent.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3"
        style={{
          top: position.top,
          left: position.left,
          maxWidth: '400px'
        }}
      >
        <p className="text-sm text-gray-500">
          No content found {searchQuery && `matching "${searchQuery}"`}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Connect and analyze content to reference it in chat
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: '400px',
        maxHeight: '300px'
      }}
    >
      <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100">
        Select content to reference (↑↓ to navigate, Enter to select)
      </div>
      
      <div className="overflow-y-auto max-h-64">
        {filteredContent.map((content, index) => {
          const metadata = (content as any).metadata;
          const processedData = metadata?.processedData;
          const isSelected = index === selectedIndex;
          
          return (
            <div
              key={content.id}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(content)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-12 h-9 bg-gray-100 rounded overflow-hidden">
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
                  <div className="flex items-center gap-1 mb-1">
                    <PlatformIcon platform={content.platform} className="w-3 h-3" />
                    <span className="text-xs font-mono bg-gray-100 px-1 rounded">
                      @{content.platform.toLowerCase().substring(0, 2)}{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate" title={processedData?.title || content.title}>
                      {(() => {
                        const title = processedData?.title || content.title;
                        return title.length > 40 ? title.substring(0, 37) + '...' : title;
                      })()}
                    </span>
                  </div>
                  
                  {metadata?.analysis && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {metadata.analysis.key_topics?.slice(0, 2).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Keyboard hint */}
                {isSelected && (
                  <div className="flex-shrink-0">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Enter
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};