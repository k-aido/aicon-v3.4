import React, { useState } from 'react';
import { X, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { detectPlatform } from '@/utils/platform';
import { createBrowserClient } from '@/lib/supabase/client';
import { getPlatformPlaceholder } from '@/utils/imageProxy';

const supabase = createBrowserClient();

interface SocialMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform?: string;
}

type ContentScope = 'single' | 'profile';

export const SocialMediaModal: React.FC<SocialMediaModalProps> = ({ isOpen, onClose, platform }) => {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addElement, elements, updateElement } = useCanvasStore();

  // Detect platform and content type from URL
  const detectContentInfo = (inputUrl: string) => {
    const platform = detectPlatform(inputUrl);
    let scope: ContentScope = 'single';
    
    // Profile URL patterns
    const profilePatterns = {
      youtube: /youtube\.com\/@[\w-]+$/,
      instagram: /instagram\.com\/[\w.]+\/?$/,
      tiktok: /tiktok\.com\/@[\w.-]+\/?$/,
    };

    if (platform && profilePatterns[platform as keyof typeof profilePatterns]?.test(inputUrl)) {
      scope = 'profile';
    }

    return { platform, scope };
  };

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      const platform = detectPlatform(inputUrl);
      return ['youtube', 'instagram', 'tiktok'].includes(platform || '');
    } catch {
      return false;
    }
  };

  const generateId = (): string => {
    // Generate string ID to match CanvasToolbar pattern for consistency
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${random}`;
  };

  // Poll for scraping completion
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
          const currentElement = elements.find(el => el.id === elementId);
          const currentMetadata = (currentElement as any)?.metadata || {};
          
          console.log('[SocialMediaModal] Scraping completed, updating element:', {
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
            const currentElement = elements.find(el => el.id === elementId);
            const currentMetadata = (currentElement as any)?.metadata || {};
            
            console.log('[SocialMediaModal] Analysis completed:', {
              elementId,
              analysisData,
              hasAnalysis: !!analysisData.analysis
            });
            
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
            
            updateElement(elementId, {
              metadata: {
                ...currentMetadata,
                isAnalyzing: false,
                isAnalyzed: true,
                analysis: transformedAnalysis,
                processedData: statusData.processedData,
                scrapeId: scrapeId
              }
            });
          } else {
            const errorData = await analyzeResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[SocialMediaModal] Analysis failed:', {
              status: analyzeResponse.status,
              error: errorData.error,
              scrapeId
            });
            
            const currentElement = elements.find(el => el.id === elementId);
            const currentMetadata = (currentElement as any)?.metadata || {};
            
            updateElement(elementId, {
              metadata: {
                ...currentMetadata,
                isAnalyzing: false,
                analysisError: errorData.error || 'Failed to analyze content'
              }
            });
          }
          return;
        }

        if (statusData.status === 'failed') {
          const currentElement = elements.find(el => el.id === elementId);
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
          updateElement(elementId, {
            metadata: {
              isScraping: false,
              scrapingError: 'Scraping timeout'
            }
          });
        }
      } catch (error) {
        console.error('Error polling for completion:', error);
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

  const handleSubmit = async () => {
    setError(null);
    
    if (!validateUrl(url)) {
      setError('Please enter a valid YouTube, Instagram, or TikTok URL');
      return;
    }

    setIsSubmitting(true);
    
    const { platform: detectedPlatform, scope } = detectContentInfo(url);
    const elementId = generateId();

    try {
      // Get the current project ID from the URL
      const projectId = window.location.pathname.split('/canvas/')[1];
      
      if (!projectId) {
        setError('No project selected');
        setIsSubmitting(false);
        return;
      }

      // Get viewport center position in canvas coordinates
      const viewport = useCanvasStore.getState().viewport;
      const canvasElement = document.querySelector('.canvas-background');
      let centerX = 400; // Default fallback
      let centerY = 300; // Default fallback
      
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        // Calculate center of visible viewport in canvas coordinates
        centerX = (rect.width / 2 - viewport.x) / viewport.zoom;
        centerY = (rect.height / 2 - viewport.y) / viewport.zoom;
      }

      // Create social media element with scraping state
      const newElement = {
        id: elementId,
        type: 'content' as const,
        x: centerX - 160, // Center the element (width/2)
        y: centerY - 140, // Center the element (height/2)
        width: 320,
        height: 280,  // Standard height for content cards
        title: `Loading ${detectedPlatform} content...`,
        url: url.trim(),
        platform: detectedPlatform,
        thumbnail: getPlatformPlaceholder(detectedPlatform || 'content'),
        metadata: {
          isScraping: true,
          contentScope: scope,
          startedAt: new Date().toISOString()
        }
      };

      addElement(newElement);

      // Start scraping process
      const response = await fetch('/api/content/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url.trim(),
          projectId: projectId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Update element to show error
        const canvasStore = useCanvasStore.getState();
        canvasStore.updateElement(newElement.id, {
          metadata: {
            isScraping: false,
            scrapingError: errorData.error || 'Failed to scrape content'
          }
        });
        
        throw new Error(errorData.error || 'Failed to scrape content');
      }

      const result = await response.json();
      
      // Handle scraping result
      if (result.success && result.scrapeId) {
        // Update element with scrape ID
        const canvasStore = useCanvasStore.getState();
        canvasStore.updateElement(newElement.id, {
          metadata: {
            ...newElement.metadata,
            scrapeId: result.scrapeId,
            status: result.status
          }
        });
        
        // Only start polling if status is processing
        if (result.status === 'processing') {
          // Start polling in the background
          pollForCompletion(newElement.id, result.scrapeId, projectId, detectedPlatform);
        } else if (result.status === 'completed') {
          // If already completed (e.g., YouTube API immediate response), fetch the data
          console.log('[SocialMediaModal] Scraping completed immediately, fetching data');
          
          // Fetch the completed data
          try {
            const statusResponse = await fetch(`/api/content/scrape/${result.scrapeId}/status`);
            const statusData = await statusResponse.json();
            
            if (statusData.processedData) {
              canvasStore.updateElement(newElement.id, {
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
              console.log('[SocialMediaModal] Starting analysis for immediately completed content');
              try {
                const analyzeResponse = await fetch(`/api/content/analyze/${result.scrapeId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ addToLibrary: true })
                });
                
                if (analyzeResponse.ok) {
                  const analysisData = await analyzeResponse.json();
                  console.log('[SocialMediaModal] Immediate analysis completed:', analysisData);
                  
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
                  
                  canvasStore.updateElement(newElement.id, {
                    metadata: {
                      ...newElement.metadata,
                      isAnalyzing: false,
                      isAnalyzed: true,
                      analysis: transformedAnalysis,
                      processedData: statusData.processedData,
                      scrapeId: result.scrapeId
                    }
                  });
                } else {
                  console.error('[SocialMediaModal] Immediate analysis failed');
                  canvasStore.updateElement(newElement.id, {
                    metadata: {
                      ...newElement.metadata,
                      isAnalyzing: false,
                      analysisError: 'Failed to analyze content'
                    }
                  });
                }
              } catch (error) {
                console.error('[SocialMediaModal] Error analyzing immediately completed content:', error);
                canvasStore.updateElement(newElement.id, {
                  metadata: {
                    ...newElement.metadata,
                    isAnalyzing: false,
                    analysisError: 'Failed to analyze content'
                  }
                });
              }
            }
          } catch (error) {
            console.error('[SocialMediaModal] Error fetching completed data:', error);
          }
        }
      }

      // Close modal and reset
      onClose();
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create analysis job');
      
      // Remove element if job creation failed
      const canvasStore = useCanvasStore.getState();
      canvasStore.deleteElement(elementId);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const { platform: detectedPlatform, scope } = detectContentInfo(url);
  const isValidUrl = url && validateUrl(url);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[480px] max-w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 text-center">
            <h3 className="text-xl font-semibold">Social Media Analysis</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Info Box - moved above URL input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-1">How it works</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enter a URL from Instagram, TikTok, or YouTube</li>
              <li>• Auto-detects if it's a single post or profile</li>
              <li>• Creates a canvas element to track progress</li>
              <li>• Analysis typically takes 30-60 seconds</li>
            </ul>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/... or https://tiktok.com/@username"
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                autoFocus
              />
              <div className="absolute right-3 top-2.5">
                {url && (
                  <div className={`text-sm ${isValidUrl ? 'text-green-600' : 'text-gray-400'}`}>
                    {detectedPlatform ? (
                      <span className="capitalize">{detectedPlatform}</span>
                    ) : (
                      <Globe size={18} />
                    )}
                  </div>
                )}
              </div>
            </div>
            {url && isValidUrl && (
              <p className="text-sm text-gray-600 mt-2">
                Detected: {detectedPlatform} {scope === 'profile' ? 'Profile' : 'Content'}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValidUrl || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Job...
              </>
            ) : (
              'Add to Canvas'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};