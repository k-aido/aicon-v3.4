'use client';

import type { CreatorSearchResponse, CreatorContent } from '@/types/creator-search';

interface CacheEntry {
  query: string;
  filter: string;
  results: CreatorContent[];
  timestamp: number;
  searchId: string;
}

export class SearchCache {
  private static readonly STORAGE_KEY = 'creator_search_cache';
  private static readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached search results if they exist and are still valid
   */
  static getCachedResults(query: string, filter: string): CacheEntry | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = sessionStorage.getItem(this.STORAGE_KEY);
      if (!cached) return null;

      const cacheData: { [key: string]: CacheEntry } = JSON.parse(cached);
      const cacheKey = this.getCacheKey(query, filter);
      const entry = cacheData[cacheKey];

      if (!entry) return null;

      // Check if cache is still valid
      const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION_MS;
      if (isExpired) {
        this.removeCacheEntry(cacheKey);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('Error reading search cache:', error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  static setCachedResults(
    query: string, 
    filter: string, 
    results: CreatorContent[], 
    searchId: string
  ): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = this.getCacheKey(query, filter);
      const entry: CacheEntry = {
        query,
        filter,
        results,
        timestamp: Date.now(),
        searchId
      };

      const existing = this.getAllCacheData();
      existing[cacheKey] = entry;

      // Clean expired entries while we're here
      this.cleanExpiredEntries(existing);

      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Error saving search cache:', error);
    }
  }

  /**
   * Check if a search is cached
   */
  static isCached(query: string, filter: string): boolean {
    return this.getCachedResults(query, filter) !== null;
  }

  /**
   * Clear all cached searches
   */
  static clearCache(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    totalEntries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    cacheHitRate?: number;
  } {
    const cacheData = this.getAllCacheData();
    const entries = Object.values(cacheData);
    
    if (entries.length === 0) {
      return { totalEntries: 0 };
    }

    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = new Date(Math.min(...timestamps));
    const newestEntry = new Date(Math.max(...timestamps));

    return {
      totalEntries: entries.length,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Private: Generate cache key from query and filter
   */
  private static getCacheKey(query: string, filter: string): string {
    return `${query.toLowerCase().trim()}_${filter}`;
  }

  /**
   * Private: Get all cache data
   */
  private static getAllCacheData(): { [key: string]: CacheEntry } {
    if (typeof window === 'undefined') return {};

    try {
      const cached = sessionStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Error reading cache data:', error);
      return {};
    }
  }

  /**
   * Private: Remove a specific cache entry
   */
  private static removeCacheEntry(cacheKey: string): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = this.getAllCacheData();
      delete cacheData[cacheKey];
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error removing cache entry:', error);
    }
  }

  /**
   * Private: Clean expired cache entries
   */
  private static cleanExpiredEntries(cacheData: { [key: string]: CacheEntry }): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    Object.entries(cacheData).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.CACHE_DURATION_MS) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => delete cacheData[key]);
  }
}

/**
 * Hook for using search cache in React components
 */
export function useSearchCache() {
  const getCached = React.useCallback((query: string, filter: string) => {
    return SearchCache.getCachedResults(query, filter);
  }, []);

  const setCached = React.useCallback((
    query: string, 
    filter: string, 
    results: CreatorContent[], 
    searchId: string
  ) => {
    SearchCache.setCachedResults(query, filter, results, searchId);
  }, []);

  const isCached = React.useCallback((query: string, filter: string) => {
    return SearchCache.isCached(query, filter);
  }, []);

  const clearCache = React.useCallback(() => {
    SearchCache.clearCache();
  }, []);

  return {
    getCached,
    setCached,
    isCached,
    clearCache,
    getCacheStats: SearchCache.getCacheStats
  };
}

// Add React import for the hook
import React from 'react';