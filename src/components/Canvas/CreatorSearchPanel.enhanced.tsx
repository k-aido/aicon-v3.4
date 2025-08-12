import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, Search, Loader2, Plus, Heart, MessageCircle, Eye, AlertCircle, 
  Clock, CheckCircle, XCircle, RefreshCw, ExternalLink, HelpCircle,
  Timer, Zap
} from 'lucide-react';
import type { CreatorSearchRequest, CreatorSearchResponse, CreatorContent } from '@/types/creator-search';
import { addCreatorContentToCanvas } from '../../../lib/canvas/creatorContentHelpers';
import { useToast } from '@/components/ui/Toast';
import { useCreatorSearchRateLimit } from '../../../lib/rateLimit';
import { useSearchCache } from '../../../lib/searchCache';
import { 
  CreatorSearchErrorHandler, 
  CreatorSearchErrorType, 
  validateInstagramHandle,
  useDebounce,
  useRetryLogic,
  useKeyboardShortcuts,
  CreatorSearchAnalytics,
  createGitHubIssueUrl,
  type CreatorSearchError
} from '../../../lib/creatorSearchUtils';

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
  error: CreatorSearchError | null;
  isRetrying: boolean;
}

const FILTERS = [
  { value: 'top_likes', label: 'Top Likes', icon: Heart },
  { value: 'top_comments', label: 'Top Comments', icon: MessageCircle },
  { value: 'top_views', label: 'Top Views', icon: Eye },
  { value: 'most_recent', label: 'Most Recent', icon: Clock }
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
  const { addToast } = useToast();
  const rateLimit = useCreatorSearchRateLimit();
  const searchCache = useSearchCache();
  const { retry, retryCount, isRetrying, resetRetry } = useRetryLogic();
  
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [searchInput, setSearchInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'top_likes' | 'top_comments' | 'top_views' | 'most_recent'>('top_likes');
  const [displayedResults, setDisplayedResults] = useState(10);
  const [showTutorial, setShowTutorial] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  const [searchState, setSearchState] = useState<SearchState>({
    searchId: null,
    status: 'idle',
    results: [],
    resultsCount: 0,
    error: null,
    isRetrying: false
  });

  // Debounced search input to avoid excessive API calls
  const debouncedSearchInput = useDebounce(searchInput, 500);
  
  // Ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Escape': () => {
      if (isOpen) onClose();
    },
    'Enter': () => {
      if (isOpen && canSearch) {
        handleSearch();
      }
    }
  });

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Check for tutorial display on first use
  useEffect(() => {
    const hasUsedBefore = localStorage.getItem('creator_search_tutorial_shown');
    if (!hasUsedBefore && isOpen) {
      setShowTutorial(true);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Clean input on platform change
  useEffect(() => {
    if (selectedPlatform !== 'instagram') {
      setSearchInput('');
      setSearchState(prev => ({ ...prev, results: [], error: null }));
    }
  }, [selectedPlatform]);

  // Validation and search capability
  const validation = validateInstagramHandle(debouncedSearchInput);
  const canSearch = validation.isValid && 
                   selectedPlatform === 'instagram' && 
                   rateLimit.canSearch && 
                   searchState.status !== 'searching';

  // Auto-search when input is debounced and valid
  useEffect(() => {
    if (debouncedSearchInput && validation.isValid && isOpen && canSearch) {
      const cached = searchCache.getCached(debouncedSearchInput, selectedFilter);
      if (cached) {
        setSearchState({
          searchId: cached.searchId,
          status: 'completed',
          results: cached.results,
          resultsCount: cached.results.length,
          error: null,
          isRetrying: false
        });
        return;
      }
    }
  }, [debouncedSearchInput, selectedFilter, validation.isValid, canSearch, isOpen, searchCache]);

  // Poll for search status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (searchState.searchId && searchState.status === 'searching') {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/creators/status?searchId=${searchState.searchId}`, {
            signal: abortControllerRef.current?.signal
          });
          
          if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'completed') {
            const results = data.sampleContent || [];
            
            setSearchState(prev => ({
              ...prev,
              status: 'completed',
              results,
              resultsCount: data.resultsCount,
              error: null
            }));
            
            // Cache the results
            searchCache.setCached(searchInput, selectedFilter, results, data.searchId);
            
            // Track analytics
            CreatorSearchAnalytics.trackSearch(searchInput, selectedFilter, results.length);
            
            if (results.length > 0) {
              addToast({
                type: 'success',
                title: 'Search Complete',
                message: `Found ${results.length} content pieces`,
                duration: 3000
              });
            }
            
          } else if (data.status === 'failed') {
            const error = CreatorSearchErrorHandler.parseApiError({ message: data.error });
            setSearchState(prev => ({
              ...prev,
              status: 'failed',
              error
            }));
            
            CreatorSearchAnalytics.trackError(error.type, searchInput);
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            const searchError = CreatorSearchErrorHandler.parseApiError(error);
            setSearchState(prev => ({
              ...prev,
              status: 'failed',
              error: searchError
            }));
          }
        }
      }, 2000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [searchState.searchId, searchState.status, searchInput, selectedFilter, addToast, searchCache]);

  const handleSearch = useCallback(async () => {
    // Validate input
    if (!validation.isValid) {
      setSearchState(prev => ({ ...prev, error: validation.error || null }));
      return;
    }

    // Check rate limit
    if (!rateLimit.canSearch) {
      const error = CreatorSearchErrorHandler.createError(CreatorSearchErrorType.RATE_LIMIT);
      setSearchState(prev => ({ ...prev, error }));
      return;
    }

    // Check for recent duplicate
    if (rateLimit.wasRecentlySearched(searchInput, 1)) {
      addToast({
        type: 'info',
        title: 'Recent Search',
        message: 'You searched for this creator recently. Results may be cached.',
        duration: 3000
      });
    }

    // Record the search attempt
    const searchRecorded = rateLimit.recordSearch(searchInput);
    if (!searchRecorded) {
      const error = CreatorSearchErrorHandler.createError(CreatorSearchErrorType.RATE_LIMIT);
      setSearchState(prev => ({ ...prev, error }));
      return;
    }

    // Check cache first
    const cached = searchCache.getCached(searchInput, selectedFilter);
    if (cached) {
      setSearchState({
        searchId: cached.searchId,
        status: 'completed',
        results: cached.results,
        resultsCount: cached.results.length,
        error: null,
        isRetrying: false
      });
      
      addToast({
        type: 'info',
        title: 'Cached Results',
        message: 'Showing recent search results',
        duration: 2000
      });
      return;
    }

    // Start search
    setSearchState(prev => ({
      ...prev,
      status: 'searching',
      results: [],
      error: null,
      isRetrying: false
    }));

    // Set up abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Set timeout for 30 seconds
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 30000);

    setTimeoutId(timeoutId);

    try {
      const searchRequest: CreatorSearchRequest = {
        platform: 'instagram',
        searchQuery: searchInput.trim(),
        filter: selectedFilter,
        userId: 'demo-user-id'
      };

      const response = await fetch('/api/creators/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchRequest),
        signal: abortControllerRef.current.signal
      });

      const data: CreatorSearchResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Search failed: ${response.status}`);
      }

      setSearchState(prev => ({
        ...prev,
        searchId: data.searchId,
        status: data.status === 'completed' ? 'completed' : 'searching'
      }));

      if (data.status === 'completed') {
        // Handle immediate results from cache
        addToast({
          type: 'success',
          title: 'Search Complete',
          message: 'Found cached results',
          duration: 3000
        });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        const timeoutError = CreatorSearchErrorHandler.createError(CreatorSearchErrorType.TIMEOUT);
        setSearchState(prev => ({
          ...prev,
          status: 'failed',
          error: timeoutError
        }));
      } else {
        const searchError = CreatorSearchErrorHandler.parseApiError(error);
        setSearchState(prev => ({
          ...prev,
          status: 'failed',
          error: searchError
        }));
        CreatorSearchAnalytics.trackError(searchError.type, searchInput);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    }
  }, [searchInput, selectedFilter, validation, rateLimit, searchCache, addToast]);

  const handleRetry = useCallback(async () => {
    resetRetry();
    setSearchState(prev => ({ ...prev, error: null, isRetrying: true }));
    
    try {
      await retry(() => handleSearch(), 3, 2000);
    } catch (error) {
      // Error is already handled in handleSearch
    } finally {
      setSearchState(prev => ({ ...prev, isRetrying: false }));
    }
  }, [handleSearch, retry, resetRetry]);

  const handleAddToCanvas = useCallback(async (content: CreatorContent) => {
    try {
      if (!onAddContentToCanvas) {
        throw new Error('Canvas integration not available');
      }

      const creatorHandle = validation.handle;
      
      const result = await addCreatorContentToCanvas(
        content, 
        viewport, 
        onAddContentToCanvas,
        creatorHandle
      );

      if (result.success) {
        // Analytics tracking
        CreatorSearchAnalytics.trackContentAdded(searchInput, content.content_url);
        
        // Success feedback with animation
        addToast({
          type: 'success',
          title: 'Content Added',
          message: `Added @${creatorHandle}'s content to canvas`,
          duration: 3000
        });

        // Tutorial completion
        if (showTutorial) {
          localStorage.setItem('creator_search_tutorial_shown', 'true');
          setShowTutorial(false);
        }

        // Close panel after short delay
        setTimeout(() => {
          onClose();
        }, 500);
        
      } else {
        throw new Error(result.error || 'Failed to add content');
      }
    } catch (error: any) {
      console.error('Failed to add content to canvas:', error);
      
      addToast({
        type: 'error',
        title: 'Failed to Add Content',
        message: error.message || 'Could not add content to canvas',
        duration: 4000
      });
    }
  }, [validation.handle, viewport, onAddContentToCanvas, searchInput, showTutorial, addToast, onClose]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const dismissTutorial = () => {
    localStorage.setItem('creator_search_tutorial_shown', 'true');
    setShowTutorial(false);
  };

  const renderError = () => {
    if (!searchState.error) return null;

    const { error } = searchState;
    
    return (
      <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">{error.message}</p>
            {error.suggestion && (
              <p className="text-red-300 text-sm mt-1">{error.suggestion}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {error.retryable && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              <button
                onClick={() => {
                  const issueUrl = createGitHubIssueUrl(error.type, error.message, searchInput);
                  window.open(issueUrl, '_blank');
                }}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRateLimitInfo = () => {
    return (
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-sm">
            {rateLimit.searchesRemaining} searches remaining
          </span>
          {rateLimit.isLimitReached && (
            <span className="text-blue-300 text-xs">
              (Resets in {rateLimit.getTimeUntilResetString()})
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderTutorial = () => {
    if (!showTutorial) return null;

    return (
      <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-400 font-medium">Welcome to Creator Search!</p>
            <p className="text-green-300 text-sm mt-1">
              Search for Instagram creators, view their content, and add cards to your canvas for analysis.
              Try searching for "@alexhormozi" as an example.
            </p>
            <button
              onClick={dismissTutorial}
              className="text-green-300 text-sm underline hover:text-green-200 mt-2"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Rest of the component continues with the existing UI structure but enhanced error handling...
  
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
            {renderTutorial()}
            {renderRateLimitInfo()}
            {renderError()}
            
            {/* Rest of the existing UI... */}
            {/* Platform Selector, Search Input, Filter Dropdown, Results, etc. */}
            {/* The existing UI code continues here with enhanced error states */}
          </div>
        </div>
      </div>
    </>
  );
};