'use client';

import type { CreatorContent } from '@/types/creator-search';

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
 * Creates a canvas element from creator content
 */
export function createCreatorContentElement(
  content: CreatorContent, 
  viewport: Viewport,
  creatorHandle?: string
): CreatorContentElementType {
  // Generate unique ID
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const elementId = `creator-content-${timestamp}-${random}`;

  // Calculate center position in viewport
  const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom - 160; // Half of element width
  const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom - 200; // Half of element height

  // Extract creator handle from various sources
  const handle = creatorHandle || 
    extractHandleFromUrl(content.content_url) || 
    'unknown_creator';

  // Create short title from caption or use handle
  let title = `@${handle}`;
  if (content.caption && content.caption.length > 0) {
    const shortCaption = content.caption.substring(0, 40).trim();
    title = shortCaption.endsWith('...') ? shortCaption : shortCaption + '...';
  }

  const element: CreatorContentElementType = {
    id: elementId,
    type: 'content',
    x: centerX,
    y: centerY,
    width: 320,
    height: 400,
    title,
    url: content.content_url,
    platform: content.platform as 'instagram',
    thumbnail: content.thumbnail_url || generatePlaceholderThumbnail(content.platform),
    metadata: {
      creatorId: content.creator_id,
      contentUrl: content.content_url,
      thumbnailUrl: content.thumbnail_url,
      videoUrl: content.video_url,
      caption: content.caption,
      likes: content.likes,
      comments: content.comments,
      views: content.views,
      postedDate: content.posted_date,
      duration: content.duration_seconds,
      isAnalyzing: false,
      isAnalyzed: false,
      rawData: content.raw_data
    },
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return element;
}

/**
 * Triggers automatic analysis for creator content
 */
export async function triggerContentAnalysis(elementId: string, element: CreatorContentElementType): Promise<void> {
  try {
    console.log(`[CreatorContent] Starting analysis for element ${elementId}`);
    
    // Update element to analyzing state
    element.metadata.isAnalyzing = true;
    element.metadata.analysisError = undefined;

    // Prepare analysis data
    const analysisData = {
      elementId,
      contentUrl: element.url,
      platform: element.platform,
      caption: element.metadata.caption || '',
      thumbnail: element.thumbnail,
      metrics: {
        likes: element.metadata.likes,
        comments: element.metadata.comments,
        views: element.metadata.views
      },
      duration: element.metadata.duration
    };

    // Call analysis API
    const response = await fetch('/api/content/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData)
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    const analysisResult = await response.json();
    
    // Update element with analysis results
    element.analysis = analysisResult.analysis;
    element.metadata.isAnalyzing = false;
    element.metadata.isAnalyzed = true;
    element.updatedAt = new Date();

    console.log(`[CreatorContent] Analysis completed for element ${elementId}`);
    
  } catch (error) {
    console.error(`[CreatorContent] Analysis failed for element ${elementId}:`, error);
    
    // Update element with error state
    element.metadata.isAnalyzing = false;
    element.metadata.isAnalyzed = false;
    element.metadata.analysisError = error instanceof Error ? error.message : 'Analysis failed';
    element.updatedAt = new Date();
  }
}

/**
 * Adds creator content to canvas with analysis
 */
export async function addCreatorContentToCanvas(
  content: CreatorContent,
  viewport: Viewport,
  addElementCallback: (element: any) => void,
  creatorHandle?: string
): Promise<{ success: boolean; elementId?: string; error?: string }> {
  try {
    // Create the canvas element
    const element = createCreatorContentElement(content, viewport, creatorHandle);
    
    // Add to canvas immediately
    addElementCallback(element);
    
    // Start analysis in background
    setTimeout(async () => {
      await triggerContentAnalysis(element.id, element);
      // Element will be updated through the canvas store
    }, 1000); // Small delay to let the element render first

    return { success: true, elementId: element.id };
    
  } catch (error) {
    console.error('[CreatorContent] Failed to add content to canvas:', error);
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
 * Generate placeholder thumbnail for content
 */
function generatePlaceholderThumbnail(platform: string): string {
  const colors = {
    instagram: 'E4405F',
    youtube: 'FF0000',
    tiktok: '000000'
  };
  
  const color = colors[platform as keyof typeof colors] || 'E4405F';
  return `https://via.placeholder.com/320x400/${color}/ffffff?text=${encodeURIComponent(platform.toUpperCase())}+Content`;
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