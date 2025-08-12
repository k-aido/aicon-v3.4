'use client';

import React from 'react';

// Error types for creator search
export enum CreatorSearchErrorType {
  INVALID_HANDLE = 'INVALID_HANDLE',
  PRIVATE_ACCOUNT = 'PRIVATE_ACCOUNT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVICE_DOWN = 'SERVICE_DOWN',
  NO_CONTENT = 'NO_CONTENT',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface CreatorSearchError {
  type: CreatorSearchErrorType;
  message: string;
  actionable: boolean;
  retryable: boolean;
  suggestion?: string;
  retryDelay?: number;
}

/**
 * Create standardized error objects for different scenarios
 */
export class CreatorSearchErrorHandler {
  static createError(type: CreatorSearchErrorType, customMessage?: string): CreatorSearchError {
    switch (type) {
      case CreatorSearchErrorType.INVALID_HANDLE:
        return {
          type,
          message: customMessage || 'Please enter a valid Instagram username or URL',
          actionable: true,
          retryable: false,
          suggestion: 'Try @username or instagram.com/username format'
        };

      case CreatorSearchErrorType.PRIVATE_ACCOUNT:
        return {
          type,
          message: customMessage || 'This account is private and cannot be accessed',
          actionable: true,
          retryable: false,
          suggestion: 'Try searching for a public account instead'
        };

      case CreatorSearchErrorType.RATE_LIMIT:
        return {
          type,
          message: customMessage || 'Search limit reached. Please try again in a few minutes',
          actionable: true,
          retryable: true,
          retryDelay: 5 * 60 * 1000 // 5 minutes
        };

      case CreatorSearchErrorType.SERVICE_DOWN:
        return {
          type,
          message: customMessage || 'Instagram data temporarily unavailable. Please try again later',
          actionable: true,
          retryable: true,
          retryDelay: 30 * 1000 // 30 seconds
        };

      case CreatorSearchErrorType.NO_CONTENT:
        return {
          type,
          message: customMessage || 'No content found for this creator',
          actionable: true,
          retryable: false,
          suggestion: 'Try a different creator or check if the account exists'
        };

      case CreatorSearchErrorType.TIMEOUT:
        return {
          type,
          message: customMessage || 'Request timed out. Please try again',
          actionable: true,
          retryable: true,
          retryDelay: 5 * 1000 // 5 seconds
        };

      case CreatorSearchErrorType.NETWORK_ERROR:
        return {
          type,
          message: customMessage || 'Network error. Please check your connection and try again',
          actionable: true,
          retryable: true,
          retryDelay: 10 * 1000 // 10 seconds
        };

      default:
        return {
          type: CreatorSearchErrorType.UNKNOWN_ERROR,
          message: customMessage || 'An unexpected error occurred. Please try again',
          actionable: true,
          retryable: true,
          retryDelay: 10 * 1000 // 10 seconds
        };
    }
  }

  /**
   * Parse API response and determine error type
   */
  static parseApiError(error: any, status?: number): CreatorSearchError {
    // Network/timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return this.createError(CreatorSearchErrorType.TIMEOUT);
    }

    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return this.createError(CreatorSearchErrorType.NETWORK_ERROR);
    }

    // HTTP status codes
    if (status === 429) {
      return this.createError(CreatorSearchErrorType.RATE_LIMIT);
    }

    if (status === 403) {
      return this.createError(CreatorSearchErrorType.PRIVATE_ACCOUNT);
    }

    if (status === 404) {
      return this.createError(CreatorSearchErrorType.NO_CONTENT);
    }

    if (status === 503 || status === 502) {
      return this.createError(CreatorSearchErrorType.SERVICE_DOWN);
    }

    // API error messages
    const errorMessage = error.message || error.error || '';
    
    if (errorMessage.toLowerCase().includes('private')) {
      return this.createError(CreatorSearchErrorType.PRIVATE_ACCOUNT);
    }

    if (errorMessage.toLowerCase().includes('rate limit')) {
      return this.createError(CreatorSearchErrorType.RATE_LIMIT);
    }

    if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('not found')) {
      return this.createError(CreatorSearchErrorType.INVALID_HANDLE);
    }

    if (errorMessage.toLowerCase().includes('no content') || errorMessage.toLowerCase().includes('no results')) {
      return this.createError(CreatorSearchErrorType.NO_CONTENT);
    }

    return this.createError(CreatorSearchErrorType.UNKNOWN_ERROR, errorMessage);
  }
}

/**
 * Instagram handle validation
 */
export function validateInstagramHandle(input: string): { 
  isValid: boolean; 
  handle: string; 
  error?: CreatorSearchError 
} {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      handle: '',
      error: CreatorSearchErrorHandler.createError(CreatorSearchErrorType.INVALID_HANDLE)
    };
  }

  // Remove @ if present
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  
  // Handle URL format
  if (withoutAt.includes('instagram.com')) {
    const urlMatch = withoutAt.match(/instagram\.com\/([^\/\?]+)/);
    if (!urlMatch || !urlMatch[1]) {
      return {
        isValid: false,
        handle: '',
        error: CreatorSearchErrorHandler.createError(
          CreatorSearchErrorType.INVALID_HANDLE,
          'Invalid Instagram URL format'
        )
      };
    }
    const handle = urlMatch[1];
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
      return {
        isValid: false,
        handle: '',
        error: CreatorSearchErrorHandler.createError(
          CreatorSearchErrorType.INVALID_HANDLE,
          'Invalid Instagram handle format'
        )
      };
    }
    return { isValid: true, handle };
  }
  
  // Handle direct username
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(withoutAt)) {
    return {
      isValid: false,
      handle: '',
      error: CreatorSearchErrorHandler.createError(
        CreatorSearchErrorType.INVALID_HANDLE,
        'Instagram handle must be 1-30 characters and contain only letters, numbers, periods, and underscores'
      )
    };
  }
  
  return { isValid: true, handle: withoutAt };
}

/**
 * Debounce hook for search input
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Retry logic with exponential backoff
 */
export function useRetryLogic() {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const retry = React.useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ) => {
    setIsRetrying(true);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          setIsRetrying(false);
          throw error;
        }
        
        setRetryCount(attempt + 1);
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  const resetRetry = React.useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retry,
    retryCount,
    isRetrying,
    resetRetry
  };
}

/**
 * Keyboard shortcuts hook
 */
export function useKeyboardShortcuts(handlers: { [key: string]: () => void }) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = handlers[event.key];
      if (handler) {
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}

/**
 * Analytics tracking (placeholder - integrate with your analytics service)
 */
export class CreatorSearchAnalytics {
  static trackSearch(query: string, filter: string, resultCount: number) {
    // Placeholder for analytics integration
    console.log('Analytics: Search performed', { query, filter, resultCount });
  }

  static trackError(errorType: CreatorSearchErrorType, query?: string) {
    // Placeholder for analytics integration
    console.log('Analytics: Search error', { errorType, query });
  }

  static trackContentAdded(query: string, contentUrl: string) {
    // Placeholder for analytics integration
    console.log('Analytics: Content added to canvas', { query, contentUrl });
  }

  static trackFeatureUsage(feature: string, details?: any) {
    // Placeholder for analytics integration
    console.log('Analytics: Feature used', { feature, details });
  }
}

/**
 * Create GitHub issue link for bug reports
 */
export function createGitHubIssueUrl(
  errorType: CreatorSearchErrorType,
  errorMessage: string,
  query?: string,
  userAgent?: string
): string {
  const title = encodeURIComponent(`Creator Search Error: ${errorType}`);
  const body = encodeURIComponent(`
## Bug Report

**Error Type:** ${errorType}
**Error Message:** ${errorMessage}
**Search Query:** ${query || 'N/A'}
**User Agent:** ${userAgent || navigator.userAgent}
**Timestamp:** ${new Date().toISOString()}

## Steps to Reproduce
1. Open creator search panel
2. Search for: "${query || '[describe search]'}"
3. Error occurred

## Expected Behavior
Search should complete successfully and show creator content.

## Additional Context
Please add any additional context about the problem here.
  `.trim());

  return `https://github.com/your-repo/aicon-v3.4/issues/new?title=${title}&body=${body}&labels=bug,creator-search`;
}