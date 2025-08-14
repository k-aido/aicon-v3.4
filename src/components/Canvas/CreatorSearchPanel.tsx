import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Plus, Heart, MessageCircle, Eye, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { CreatorSearchRequest, CreatorSearchResponse, CreatorContent } from '@/types/creator-search';
import { addCreatorContentToCanvas } from '../../../lib/canvas/creatorContentHelpers';
import { useToast } from '@/components/Modal/ToastContainer';

interface CreatorSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContentToCanvas?: (element: any) => void;
  viewport: { x: number; y: number; zoom: number };
}

interface SearchState {
  searchId: string | null;
  status: 'idle' | 'searching' | 'completed' | 'failed';
  results: CreatorContent[];
  resultsCount: number;
  error: string | null;
}

const FILTERS = [
  { value: 'top_likes', label: 'Top Likes' },
  { value: 'top_comments', label: 'Top Comments' },
  { value: 'top_views', label: 'Top Views' },
  { value: 'most_recent', label: 'Most Recent' }
] as const;

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', active: true },
  { id: 'youtube', name: 'YouTube', active: false, comingSoon: true },
  { id: 'tiktok', name: 'TikTok', active: false, comingSoon: true }
];

export const CreatorSearchPanel: React.FC<CreatorSearchPanelProps> = ({
  isOpen,
  onClose,
  onAddContentToCanvas,
  viewport
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [searchInput, setSearchInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'top_likes' | 'top_comments' | 'top_views' | 'most_recent'>('top_likes');
  const [searchState, setSearchState] = useState<SearchState>({
    searchId: null,
    status: 'idle',
    results: [],
    resultsCount: 0,
    error: null
  });
  const [displayedResults, setDisplayedResults] = useState(10);

  // Clean input on platform change
  useEffect(() => {
    if (selectedPlatform !== 'instagram') {
      setSearchInput('');
    }
  }, [selectedPlatform]);

  // Poll for search status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (searchState.searchId && searchState.status === 'searching') {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/creators/status?searchId=${searchState.searchId}`);
          const data = await response.json();
          
          if (data.status === 'completed') {
            setSearchState(prev => ({
              ...prev,
              status: 'completed',
              resultsCount: data.content?.length || data.resultsCount || 0,
              results: data.content || data.sampleContent || []
            }));
          } else if (data.status === 'failed') {
            setSearchState(prev => ({
              ...prev,
              status: 'failed',
              error: data.error || 'Search failed'
            }));
          }
        } catch (error) {
          console.error('Error polling search status:', error);
        }
      }, 2000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [searchState.searchId, searchState.status]);

  const fetchFullContent = async (searchId: string) => {
    // TODO: Implement API endpoint to get full content results
    // For now, we'll use the sample content from status endpoint
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    
    setSearchState({
      searchId: null,
      status: 'searching',
      results: [],
      resultsCount: 0,
      error: null
    });

    try {
      const searchRequest: CreatorSearchRequest = {
        platform: 'instagram',
        searchQuery: searchInput.trim(),
        filter: selectedFilter,
        userId: '5cedf725-3b56-4764-bbe0-0117a0ba7f49'
      };

      const response = await fetch('/api/creators/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest)
      });

      const data: CreatorSearchResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // Handle immediate results (no more polling needed)
      if (data.status === 'completed' && data.content) {
        console.log('Search API Response:', data);
        console.log('Content sample:', data.content[0]);
        setSearchState({
          searchId: data.searchId,
          status: 'completed',
          results: data.content,
          resultsCount: data.content.length,
          error: null
        });
        console.log(`Search completed: Found ${data.content.length} posts`);
      } else if (data.status === 'failed') {
        setSearchState({
          searchId: data.searchId,
          status: 'failed',
          results: [],
          resultsCount: 0,
          error: data.error || 'Search failed'
        });
      } else {
        // Fallback to polling for backwards compatibility
        setSearchState(prev => ({
          ...prev,
          searchId: data.searchId,
          status: 'searching'
        }));
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchState({
        searchId: null,
        status: 'failed',
        results: [],
        resultsCount: 0,
        error: error.message || 'Failed to search creator content'
      });
    }
  };

  const handleAddToCanvas = async (content: CreatorContent) => {
    try {
      if (!onAddContentToCanvas) {
        throw new Error('Canvas integration not available');
      }

      // Extract creator handle from search input
      const creatorHandle = searchInput.replace('@', '').replace(/.*instagram\.com\//, '');
      
      // Add content to canvas using the helper function
      const result = await addCreatorContentToCanvas(
        content, 
        viewport, 
        onAddContentToCanvas,
        creatorHandle
      );

      if (result.success) {
        // Show success toast
        showSuccess('Content Added', `Added @${creatorHandle}'s content to canvas`);

        // Close the panel after successful add
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to add content');
      }
    } catch (error: any) {
      console.error('Failed to add content to canvas:', error);
      
      // Show error toast
      showError('Failed to Add Content', error.message || 'Could not add content to canvas');
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const isSearchDisabled = !searchInput.trim() || selectedPlatform !== 'instagram' || searchState.status === 'searching';

  // Render skeleton cards during loading
  const renderSkeletonCards = () => (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
          <div className="w-full h-32 bg-gray-700"></div>
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            <div className="flex gap-2">
              <div className="h-2 bg-gray-700 rounded w-12"></div>
              <div className="h-2 bg-gray-700 rounded w-12"></div>
              <div className="h-2 bg-gray-700 rounded w-12"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-[450px] bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Search Creators</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Platform Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((platform) => (
                  <div key={platform.id} className="relative">
                    <button
                      disabled={!platform.active}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`w-full p-3 text-sm font-medium rounded-lg border transition-colors ${
                        selectedPlatform === platform.id && platform.active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : platform.active
                          ? 'border-gray-600 text-gray-300 hover:border-gray-500'
                          : 'border-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {platform.name}
                    </button>
                    {platform.comingSoon && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-400">
                          Soon
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Instagram Handle or URL</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="@username or instagram.com/username"
                  disabled={selectedPlatform !== 'instagram'}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  onKeyDown={(e) => e.key === 'Enter' && !isSearchDisabled && handleSearch()}
                />
                {selectedPlatform !== 'instagram' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Select Instagram to search</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                disabled={selectedPlatform !== 'instagram'}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isSearchDisabled}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-6"
            >
              {searchState.status === 'searching' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Creator
                </>
              )}
            </button>

            {/* Search Status */}
            {searchState.status === 'searching' && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-blue-400 font-medium">Scraping content...</p>
                    <p className="text-gray-400 text-sm">This may take 1-2 minutes</p>
                  </div>
                </div>
              </div>
            )}

            {searchState.status === 'failed' && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-red-400 font-medium">Search failed</p>
                    <p className="text-gray-400 text-sm">{searchState.error}</p>
                  </div>
                </div>
              </div>
            )}

            {searchState.status === 'completed' && searchState.resultsCount === 0 && (
              <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-400 font-medium">No content found</p>
                    <p className="text-gray-400 text-sm">Try a different creator or check the handle</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section */}
            {searchState.status === 'searching' && renderSkeletonCards()}
            
            {searchState.status === 'completed' && searchState.results.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    Results ({searchState.resultsCount})
                  </h3>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                
                {/* Content Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {searchState.results.slice(0, displayedResults).map((content, index) => (
                    <div key={content.id} className="group relative bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors">
                      {/* Thumbnail */}
                      <div className="relative aspect-square">
                        <img
                          src={content.thumbnail_url || 'https://via.placeholder.com/300x300?text=No+Image'}
                          alt="Content thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image';
                          }}
                        />
                        
                        {/* Add to Canvas Button */}
                        <button
                          onClick={() => handleAddToCanvas(content)}
                          className="absolute top-2 right-2 w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Add to canvas"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Content Info */}
                      <div className="p-3">
                        <p className="text-white text-xs font-medium truncate mb-2">
                          @{searchInput.replace('@', '').replace(/.*instagram\.com\//, '')}
                        </p>
                        
                        {/* Caption Preview */}
                        {content.caption && (
                          <p className="text-gray-300 text-xs mb-2 line-clamp-2 leading-relaxed">
                            {content.caption.substring(0, 80)}
                            {content.caption.length > 80 && '...'}
                          </p>
                        )}
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red-400" />
                              <span>{formatCount(content.likes || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3 text-blue-400" />
                              <span>{formatCount(content.comments || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-gray-400" />
                              <span>{formatCount(content.views || 0)}</span>
                            </div>
                          </div>
                          
                          {/* Posted Date */}
                          {content.posted_date && (
                            <span className="text-xs text-gray-500">
                              {new Date(content.posted_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {displayedResults < searchState.results.length && (
                  <button
                    onClick={() => setDisplayedResults(prev => prev + 10)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Load More ({searchState.results.length - displayedResults} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};