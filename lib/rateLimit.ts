'use client';

interface SearchEntry {
  timestamp: number;
  query: string;
}

interface RateLimitInfo {
  searchesRemaining: number;
  resetTime: number;
  isLimitReached: boolean;
  canSearch: boolean;
}

export class CreatorSearchRateLimit {
  private static readonly STORAGE_KEY = 'creator_search_rate_limit';
  private static readonly SEARCHES_PER_HOUR = 20;
  private static readonly HOUR_IN_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Check if user can make a search and get rate limit info
   */
  static getRateLimitInfo(): RateLimitInfo {
    const now = Date.now();
    const searches = this.getSearchHistory();
    
    // Remove searches older than 1 hour
    const recentSearches = searches.filter(
      search => now - search.timestamp < this.HOUR_IN_MS
    );

    // Update storage with cleaned data
    this.saveSearchHistory(recentSearches);

    const searchesUsed = recentSearches.length;
    const searchesRemaining = Math.max(0, this.SEARCHES_PER_HOUR - searchesUsed);
    const isLimitReached = searchesRemaining === 0;
    
    // Find oldest search to determine reset time
    const oldestSearch = recentSearches.length > 0 
      ? Math.min(...recentSearches.map(s => s.timestamp))
      : now;
    const resetTime = oldestSearch + this.HOUR_IN_MS;

    return {
      searchesRemaining,
      resetTime,
      isLimitReached,
      canSearch: !isLimitReached
    };
  }

  /**
   * Record a new search
   */
  static recordSearch(query: string): boolean {
    const rateLimitInfo = this.getRateLimitInfo();
    
    if (!rateLimitInfo.canSearch) {
      return false;
    }

    const searches = this.getSearchHistory();
    searches.push({
      timestamp: Date.now(),
      query: query.toLowerCase()
    });

    this.saveSearchHistory(searches);
    return true;
  }

  /**
   * Check if a specific query was recently searched (within 5 minutes)
   * Used for preventing duplicate searches
   */
  static wasRecentlySearched(query: string, withinMinutes: number = 5): boolean {
    const now = Date.now();
    const timeLimit = withinMinutes * 60 * 1000;
    const searches = this.getSearchHistory();
    
    return searches.some(search => 
      search.query === query.toLowerCase() && 
      (now - search.timestamp) < timeLimit
    );
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   */
  static getTimeUntilReset(): number {
    const rateLimitInfo = this.getRateLimitInfo();
    return Math.max(0, rateLimitInfo.resetTime - Date.now());
  }

  /**
   * Format time until reset as human readable string
   */
  static getTimeUntilResetString(): string {
    const timeMs = this.getTimeUntilReset();
    
    if (timeMs === 0) return 'Now';
    
    const minutes = Math.ceil(timeMs / (60 * 1000));
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Clear all search history (for testing or user privacy)
   */
  static clearHistory(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Get search statistics for analytics
   */
  static getSearchStats(): {
    totalSearches: number;
    uniqueQueries: number;
    mostSearchedQuery?: string;
    searchFrequency: { [key: string]: number };
  } {
    const searches = this.getSearchHistory();
    const frequency: { [key: string]: number } = {};
    
    searches.forEach(search => {
      frequency[search.query] = (frequency[search.query] || 0) + 1;
    });

    const uniqueQueries = Object.keys(frequency).length;
    const mostSearchedQuery = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return {
      totalSearches: searches.length,
      uniqueQueries,
      mostSearchedQuery,
      searchFrequency: frequency
    };
  }

  /**
   * Private: Get search history from localStorage
   */
  private static getSearchHistory(): SearchEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading search history:', error);
      return [];
    }
  }

  /**
   * Private: Save search history to localStorage
   */
  private static saveSearchHistory(searches: SearchEntry[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }
}

/**
 * Hook for using rate limiting in React components
 */
export function useCreatorSearchRateLimit() {
  const [rateLimitInfo, setRateLimitInfo] = React.useState<RateLimitInfo>(() => 
    CreatorSearchRateLimit.getRateLimitInfo()
  );

  const updateRateLimitInfo = React.useCallback(() => {
    setRateLimitInfo(CreatorSearchRateLimit.getRateLimitInfo());
  }, []);

  const recordSearch = React.useCallback((query: string) => {
    const success = CreatorSearchRateLimit.recordSearch(query);
    updateRateLimitInfo();
    return success;
  }, [updateRateLimitInfo]);

  // Update rate limit info periodically
  React.useEffect(() => {
    const interval = setInterval(updateRateLimitInfo, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [updateRateLimitInfo]);

  return {
    ...rateLimitInfo,
    recordSearch,
    updateRateLimitInfo,
    wasRecentlySearched: CreatorSearchRateLimit.wasRecentlySearched,
    getTimeUntilResetString: CreatorSearchRateLimit.getTimeUntilResetString,
    clearHistory: CreatorSearchRateLimit.clearHistory
  };
}

// Add React import for the hook
import React from 'react';