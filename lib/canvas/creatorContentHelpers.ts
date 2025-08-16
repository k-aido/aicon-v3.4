'use client';

import type { CreatorContent } from '@/types/creator-search';
import { useCanvasStore } from '@/store/canvasStore';
import { getPlatformPlaceholder } from '@/utils/imageProxy';

export interface CreatorContentElementType {
  id: string;
  type: 'content';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  url: string;
  platform: 'instagram' | 'youtube' | 'tiktok';
  thumbnail: string;
  metadata: {
    creatorId: string;
    contentUrl: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    caption?: string;
    likes: number;
    comments: number;
    views: number;
    postedDate?: string;
    duration?: number;
    isAnalyzing?: boolean;
    isAnalyzed?: boolean;
    analysisError?: string;
    analysisRetryCount?: number;
    rawData?: any;
    isScraping?: boolean;
    scrapeId?: string;
    processedData?: any;
  };
  analysis?: {
    keyTopics: string[];
    contentStructure: {
      hook: string;
      body: string[];
      cta: string;
    };
    engagementTactics: string[];
    sentiment?: string;
    complexity?: string;
    analyzedAt?: Date;
  };
  zIndex?: number;
  isVisible?: boolean;
  isLocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Generate ID similar to SocialMediaModal
 */
function generateId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${timestamp}-${random}`;
}

/**
 * Poll for scraping completion - exact copy from SocialMediaModal
 */
const pollForCompletion = async (elementId: string, scrapeId: string, projectId: string) => {
  const maxAttempts = 60; // 60 seconds timeout
  let attempts = 0;

  const checkStatus = async () => {
    try {
      // Check scraping status
      const statusResponse = await fetch(`/api/content/scrape/${scrapeId}/status`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        // Get current element to preserve existing data
        const { elements, updateElement } = useCanvasStore.getState();
        const currentElement = elements.find(el => el.id === elementId);
        const currentMetadata = (currentElement as any)?.metadata || {};
        
        console.log('[CreatorContent] Scraping completed, updating element:', {
          elementId,
          thumbnailUrl: statusData.processedData?.thumbnailUrl,
          title: statusData.processedData?.title
        });
        
        // Update element with scraped data
        updateElement(elementId, {
          title: statusData.processedData?.title || 'Content loaded',
          thumbnail: statusData.processedData?.thumbnailUrl || currentElement?.thumbnail,
          metadata: {
            ...currentMetadata,
            isScraping: false,
            isAnalyzing: true,
            scrapeId: scrapeId,
            processedData: statusData.processedData
          }
        });

        // Start analysis
        const analyzeResponse = await fetch(`/api/content/analyze/${scrapeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addToLibrary: true })
        });

        if (analyzeResponse.ok) {
          const analysisData = await analyzeResponse.json();
          // Get current element state to preserve metadata
          const { elements: currentElements } = useCanvasStore.getState();
          const updatedElement = currentElements.find(el => el.id === elementId);
          const updatedMetadata = (updatedElement as any)?.metadata || {};
          
          // Transform the analysis data to match the expected format in AnalysisPanel
          const transformedAnalysis = {
            hook: analysisData.analysis?.hook_analysis || '',
            hookScore: 8, // Default score
            contentStrategy: analysisData.analysis?.body_analysis || '',
            keyInsights: analysisData.analysis?.key_topics || [],
            improvements: analysisData.analysis?.engagement_tactics || [],
            sentiment: analysisData.analysis?.sentiment || 'positive',
            complexity: analysisData.analysis?.complexity || 'moderate',
            // Also include the raw analysis for compatibility
            ...analysisData.analysis
          };
          
          updateElement(elementId, {
            metadata: {
              ...updatedMetadata,
              isAnalyzing: false,
              isAnalyzed: true,
              analysis: transformedAnalysis,
              processedData: statusData.processedData,
              scrapeId: scrapeId
            }
          });
        } else {
          updateElement(elementId, {
            metadata: {
              isAnalyzing: false,
              analysisError: 'Failed to analyze content'
            }
          });
        }
        return;
      }

      if (statusData.status === 'failed') {
        const { elements: currentElements, updateElement } = useCanvasStore.getState();
        const currentElement = currentElements.find(el => el.id === elementId);
        const currentMetadata = (currentElement as any)?.metadata || {};
        
        updateElement(elementId, {
          metadata: {
            ...currentMetadata,
            isScraping: false,
            scrapingError: statusData.error || 'Scraping failed'
          }
        });
        return;
      }

      // Continue polling if still processing
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 1000);
      } else {
        const { updateElement } = useCanvasStore.getState();
        updateElement(elementId, {
          metadata: {
            isScraping: false,
            scrapingError: 'Scraping timeout'
          }
        });
      }
    } catch (error) {
      console.error('Error polling for completion:', error);
      const { updateElement } = useCanvasStore.getState();
      updateElement(elementId, {
        metadata: {
          isScraping: false,
          scrapingError: 'Failed to check status'
        }
      });
    }
  };

  // Start polling
  setTimeout(checkStatus, 1000);
};

/**
 * Adds creator content to canvas following exact same flow as URL content
 */
export async function addCreatorContentToCanvas(
  content: CreatorContent,
  creatorHandle?: string
): Promise<{ success: boolean; elementId?: string; error?: string }> {
  try {
    const elementId = generateId();
    const { addElement, updateElement } = useCanvasStore.getState();
    
    // Get the current project ID from the URL
    const projectId = window.location.pathname.split('/canvas/')[1];
    
    if (!projectId) {
      return { success: false, error: 'No project selected' };
    }

    // Extract handle from URL or use provided one
    const handle = creatorHandle || 
      extractHandleFromUrl(content.content_url) || 
      'unknown_creator';

    // Create title from caption or handle
    let title = `Loading ${content.platform} content...`;

    // Create element with scraping state - EXACT same structure as SocialMediaModal
    const newElement = {
      id: elementId,
      type: 'content' as const,
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      width: 320,
      height: 280,
      title: title,
      url: content.content_url.trim(),
      platform: content.platform,
      thumbnail: getPlatformPlaceholder(content.platform || 'content'),
      metadata: {
        isScraping: true,
        contentScope: 'single',
        startedAt: new Date().toISOString(),
        creatorId: content.creator_id // Keep this to identify creator content
      }
    };

    // Add element to canvas
    addElement(newElement);

    // Prepare processed data in the format expected by the analysis
    const processedData = {
      title: content.caption?.substring(0, 50) || `@${handle} content`,
      description: content.caption || '',
      caption: content.caption || '',
      thumbnailUrl: content.thumbnail_url,
      videoUrl: content.video_url,
      contentUrl: content.content_url,
      duration: content.duration_seconds,
      postedDate: content.posted_date,
      metrics: {
        likes: Number(content.likes) || 0,
        comments: Number(content.comments) || 0,
        views: Number(content.views) || 0
      },
      hashtags: [],
      authorName: handle,
      author: {
        name: handle,
        handle: `@${handle}`
      },
      rawData: content.raw_data || {}
    };

    // Start "mock" scraping process
    const response = await fetch('/api/content/mock-scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: content.content_url.trim(),
        projectId: projectId,
        processedData: processedData,
        platform: content.platform
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Update element to show error
      updateElement(newElement.id, {
        metadata: {
          isScraping: false,
          scrapingError: errorData.error || 'Failed to process content'
        }
      });
      
      throw new Error(errorData.error || 'Failed to process content');
    }

    const result = await response.json();
    
    // Start polling for scrape completion
    if (result.success && result.scrapeId) {
      // Update element with scrape ID
      updateElement(newElement.id, {
        metadata: {
          ...newElement.metadata,
          scrapeId: result.scrapeId,
          status: result.status
        }
      });
      
      // Start polling in the background
      pollForCompletion(newElement.id, result.scrapeId, projectId);
    }

    return { success: true, elementId: newElement.id };
    
  } catch (error) {
    console.error('[CreatorContent] Failed to add content:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add content' 
    };
  }
}

/**
 * Extract Instagram handle from URL
 */
function extractHandleFromUrl(url: string): string | null {
  try {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Format metrics for display
 */
export function formatMetric(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

/**
 * Get time ago string from date
 */
export function getTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return '';
  }
}