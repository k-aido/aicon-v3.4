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
const pollForCompletion = async (elementId: string, scrapeId: string, projectId: string, platform?: string) => {
  // YouTube videos need much longer timeout due to transcription
  const maxAttempts = platform === 'youtube' ? 300 : 120; // 5 minutes for YouTube, 2 minutes for others
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
          
          // Transform the analysis data to match the expected format in ContentElement
          const transformedAnalysis = {
            // Keep the original field names for ContentElement display
            hook_analysis: analysisData.analysis?.hook_analysis || '',
            body_analysis: analysisData.analysis?.body_analysis || '',
            cta_analysis: analysisData.analysis?.cta_analysis || '',
            key_topics: analysisData.analysis?.key_topics || [],
            engagement_tactics: analysisData.analysis?.engagement_tactics || [],
            sentiment: analysisData.analysis?.sentiment || 'positive',
            complexity: analysisData.analysis?.complexity || 'moderate',
            // Also add the AnalysisPanel format for compatibility
            hook: analysisData.analysis?.hook_analysis || '',
            hookScore: 8, // Default score
            contentStrategy: analysisData.analysis?.body_analysis || '',
            keyInsights: analysisData.analysis?.key_topics || [],
            improvements: analysisData.analysis?.engagement_tactics || []
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
  viewport: Viewport,
  onAddContentToCanvas?: (element: any) => void,
  creatorHandle?: string
): Promise<{ success: boolean; elementId?: string; error?: string }> {
  try {
    const elementId = generateId();
    
    // Debug log to see what we're receiving
    console.log('[CreatorContent] Received content:', content);
    
    // Get the URL from the content object - handle different possible property names
    let contentUrl = content.content_url || (content as any).url || (content as any).link;
    
    // Handle Instagram reel URLs - convert reel URLs to regular post URLs if needed
    // Instagram reels can be accessed via regular post URLs for scraping
    if (contentUrl && contentUrl.includes('instagram.com/reel/')) {
      // Reel URLs are in format: https://www.instagram.com/reel/XXXXX/
      // They can also be accessed as: https://www.instagram.com/p/XXXXX/
      contentUrl = contentUrl.replace('/reel/', '/p/');
      console.log('[CreatorContent] Converted reel URL to post URL:', contentUrl);
    }
    
    // Validate content has required fields
    if (!content || !contentUrl) {
      console.error('[CreatorContent] Invalid content - missing URL:', content);
      return { success: false, error: 'Invalid content: missing URL' };
    }
    
    // Get the current project ID from the URL
    const projectId = window.location.pathname.split('/canvas/')[1];
    
    if (!projectId) {
      return { success: false, error: 'No project selected' };
    }

    // Extract handle from URL or use provided one
    const handle = creatorHandle || 
      extractHandleFromUrl(contentUrl) || 
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
      height: 280,  // Standard height for content cards
      title: title,
      url: contentUrl.trim(),
      platform: content.platform || 'instagram',
      thumbnail: getPlatformPlaceholder(content.platform || 'instagram'),
      metadata: {
        isScraping: true,
        contentScope: 'single',
        startedAt: new Date().toISOString(),
        creatorId: content.creator_id // Keep this to identify creator content
      }
    };
    
    console.log('[CreatorContent] Creating element with ID:', elementId, 'type:', typeof elementId);

    // Add element to canvas - use store directly OR callback if provided
    if (onAddContentToCanvas && typeof onAddContentToCanvas === 'function') {
      onAddContentToCanvas(newElement);
    } else {
      // Use the store directly if no callback provided
      const { addElement } = useCanvasStore.getState();
      addElement(newElement);
    }

    // Start REAL scraping process - same as SocialMediaModal
    const response = await fetch('/api/content/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: contentUrl.trim(),
        projectId: projectId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      console.error('[CreatorContent] Scrape API error:', {
        status: response.status,
        error: errorData.error,
        url: contentUrl,
        projectId
      });
      
      // Update element to show error - get fresh store state
      const { updateElement } = useCanvasStore.getState();
      updateElement(newElement.id, {
        metadata: {
          isScraping: false,
          scrapingError: errorData.error || 'Failed to scrape content'
        }
      });
      
      // Don't throw for duplicate content - it should be handled gracefully above
      throw new Error(errorData.error || 'Failed to scrape content');
    }

    const result = await response.json();
    
    // Handle scraping result
    if (result.success && result.scrapeId) {
      // Update element with scrape ID - get fresh store state
      const { updateElement } = useCanvasStore.getState();
      
      // If this is existing/cached content, update the title immediately
      if (result.cached || result.existing) {
        updateElement(newElement.id, {
          title: `Loading existing ${content.platform} content...`,
          metadata: {
            ...newElement.metadata,
            scrapeId: result.scrapeId,
            status: result.status,
            isExisting: true
          }
        });
      } else {
        updateElement(newElement.id, {
          metadata: {
            ...newElement.metadata,
            scrapeId: result.scrapeId,
            status: result.status
          }
        });
      }
      
      // Only start polling if status is processing
      if (result.status === 'processing') {
        // Start polling in the background
        pollForCompletion(newElement.id, result.scrapeId, projectId, content.platform);
      } else if (result.status === 'completed') {
        // If already completed (e.g., cached content or YouTube API), fetch the data
        console.log('[CreatorContent] Content already available, fetching data:', {
          cached: result.cached,
          existing: result.existing
        });
        
        try {
          const statusResponse = await fetch(`/api/content/scrape/${result.scrapeId}/status`);
          const statusData = await statusResponse.json();
          
          if (statusData.processedData) {
            updateElement(newElement.id, {
              title: statusData.processedData.title || 'Content loaded',
              thumbnail: statusData.processedData.thumbnailUrl || newElement.thumbnail,
              metadata: {
                ...newElement.metadata,
                isScraping: false,
                isAnalyzing: true, // Set to analyzing while we fetch analysis
                processedData: statusData.processedData,
                scrapeId: result.scrapeId
              }
            });
            
            // Now start analysis for immediately completed content
            console.log('[CreatorContent] Starting analysis for immediately completed content');
            try {
              const analyzeResponse = await fetch(`/api/content/analyze/${result.scrapeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addToLibrary: true })
              });
              
              if (analyzeResponse.ok) {
                const analysisData = await analyzeResponse.json();
                console.log('[CreatorContent] Immediate analysis completed:', analysisData);
                
                // Transform the analysis data to match the expected format
                const transformedAnalysis = {
                  // Keep the original field names for ContentElement display
                  hook_analysis: analysisData.analysis?.hook_analysis || '',
                  body_analysis: analysisData.analysis?.body_analysis || '',
                  cta_analysis: analysisData.analysis?.cta_analysis || '',
                  key_topics: analysisData.analysis?.key_topics || [],
                  engagement_tactics: analysisData.analysis?.engagement_tactics || [],
                  sentiment: analysisData.analysis?.sentiment || 'positive',
                  complexity: analysisData.analysis?.complexity || 'moderate',
                  // Also add the AnalysisPanel format for compatibility
                  hook: analysisData.analysis?.hook_analysis || '',
                  hookScore: 8, // Default score
                  contentStrategy: analysisData.analysis?.body_analysis || '',
                  keyInsights: analysisData.analysis?.key_topics || [],
                  improvements: analysisData.analysis?.engagement_tactics || []
                };
                
                updateElement(newElement.id, {
                  metadata: {
                    ...newElement.metadata,
                    isScraping: false,
                    isAnalyzing: false,
                    isAnalyzed: true,
                    analysis: transformedAnalysis,
                    processedData: statusData.processedData,
                    scrapeId: result.scrapeId
                  }
                });
              } else {
                console.error('[CreatorContent] Immediate analysis failed');
                updateElement(newElement.id, {
                  metadata: {
                    ...newElement.metadata,
                    isAnalyzing: false,
                    analysisError: 'Failed to analyze content'
                  }
                });
              }
            } catch (error) {
              console.error('[CreatorContent] Error analyzing immediately completed content:', error);
              updateElement(newElement.id, {
                metadata: {
                  ...newElement.metadata,
                  isAnalyzing: false,
                  analysisError: 'Failed to analyze content'
                }
              });
            }
          }
        } catch (error) {
          console.error('[CreatorContent] Error fetching completed data:', error);
        }
      }
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