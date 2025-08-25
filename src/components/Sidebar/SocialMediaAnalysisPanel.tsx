import React, { useState, useEffect } from 'react';
import { 
  X, Eye, ThumbsUp, MessageSquare, 
  Youtube, Instagram, Music2, AlertCircle, 
  RefreshCw, Loader2, Calendar, Target, Folder, Flag, FileText,
  ExternalLink
} from 'lucide-react';
import { formatNumber, formatDuration, formatRelativeTime, formatCalendarDate, calculateEngagementRate } from '@/utils/formatters';
import { createBrowserClient } from '@/lib/supabase/client';
import { getProxiedImageUrl, getPlatformPlaceholder } from '@/utils/imageProxy';
// Define types locally since social-media types file doesn't exist
interface ExtendedContentAnalysis {
  id?: string;
  platform?: string;
  // New fields for transcript segments
  hook_transcript?: string;
  body_transcript?: string;
  cta_transcript?: string;
  // Existing analysis fields
  hook_analysis?: string | { primary_hook?: string; transcript_segment?: string };
  body_analysis?: string | { transcript_segment?: string };
  cta_analysis?: string | { primary_cta?: string; transcript_segment?: string };
  transcript?: string;
  [key: string]: any;
}

interface SocialMediaContent {
  id?: string;
  platform?: string;
  [key: string]: any;
}

const supabase = createBrowserClient();

// Helper function to strip markdown formatting
const stripMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Debug log to see what we're dealing with
  console.log('[stripMarkdown] Original text:', text);
  
  const stripped = text
    // First pass - handle nested/multiple asterisks
    .replace(/\*{3,}(.*?)\*{3,}/g, '$1') // Remove 3+ asterisks
    .replace(/\*{2}(.*?)\*{2}/g, '$1') // Remove exactly 2 asterisks (bold)
    .replace(/\*(.*?)\*/g, '$1') // Remove single asterisks (italic)
    // Handle underscores
    .replace(/_{2,}(.*?)_{2,}/g, '$1') // Remove 2+ underscores
    .replace(/_(.*?)_/g, '$1') // Remove single underscores
    // Other markdown
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .replace(/`{3}[^`]*`{3}/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .replace(/^>\s+/gm, '') // Remove blockquotes
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    // Final cleanup - catch any remaining asterisks
    .replace(/\*+/g, '')
    .trim();
  
  console.log('[stripMarkdown] Stripped text:', stripped);
  return stripped;
};

interface SocialMediaAnalysisPanelProps {
  element: any; // Canvas element with social media data
  isOpen: boolean;
  onClose: () => void;
}

const PlatformIcon: React.FC<{ platform: string; size?: number }> = ({ platform, size = 20 }) => {
  const props = { size };
  switch (platform) {
    case 'youtube':
      return <Youtube {...props} className="text-red-500" />;
    case 'instagram':
      return <Instagram {...props} className="text-pink-500" />;
    case 'tiktok':
      return <Music2 {...props} className="text-black" />;
    default:
      return null;
  }
};





export const SocialMediaAnalysisPanel: React.FC<SocialMediaAnalysisPanelProps> = ({
  element,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ExtendedContentAnalysis | null>(null);
  const [socialMediaContent, setSocialMediaContent] = useState<SocialMediaContent | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Fetch analysis data when panel opens
  useEffect(() => {
    if (!isOpen || (!element?.metadata?.contentPiece?.id && !element?.metadata?.analysis && !element?.metadata?.scrapeId)) {
      return;
    }

    fetchAnalysisData();
  }, [isOpen, element?.metadata?.contentPiece?.id, element?.metadata?.analysis, element?.metadata?.scrapeId]);

  const fetchAnalysisData = async () => {
    // Don't fetch if content is still being analyzed
    if (element?.metadata?.isAnalyzing || element?.metadata?.isScraping) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // First check if we have a scrapeId - this is the new flow
      if (element?.metadata?.scrapeId) {
        // Fetch analysis by scrape_id
        const { data: analysisData, error: analysisError } = await supabase
          .from('content_analysis')
          .select('*, hook_analysis, body_analysis, cta_analysis')
          .eq('scrape_id', element.metadata.scrapeId)
          .single();

        if (!analysisError && analysisData) {
          setAnalysis(analysisData as ExtendedContentAnalysis);
          setLoading(false);
          return;
        }
      }
      
      // Check if analysis data is already in element metadata (API response)
      if (element?.metadata?.analysis) {
        // Use the analysis data directly from metadata without transformation
        const metadataAnalysis = element.metadata.analysis;
        
        // Only set analysis if we have actual data
        if (metadataAnalysis.hook_analysis || metadataAnalysis.body_analysis || metadataAnalysis.cta_analysis) {
          setAnalysis({
            id: 'metadata-analysis',
            content_piece_id: element.id,
            hook_analysis: metadataAnalysis.hook_analysis || null,
            body_analysis: metadataAnalysis.body_analysis || null,
            cta_analysis: metadataAnalysis.cta_analysis || null,
            created_at: metadataAnalysis.created_at || new Date().toISOString(),
            updated_at: metadataAnalysis.updated_at || new Date().toISOString()
          } as ExtendedContentAnalysis);
        } else {
          setError('No analysis data available');
        }
        
        setLoading(false);
        return;
      }
      
      // Legacy flow - check for contentPiece.id
      if (element?.metadata?.contentPiece?.id) {
        const { data: analysisData, error: analysisError } = await supabase
          .from('content_analysis')
          .select('*, hook_analysis, body_analysis, cta_analysis')
          .eq('content_piece_id', element.metadata.contentPiece.id)
          .single();

        if (!analysisError && analysisData) {
          setAnalysis(analysisData as ExtendedContentAnalysis);
          setLoading(false);
          return;
        }
      }
      
      // No analysis found
      setError('No analysis data found for this content');
      setLoading(false);

      // Fetch social media content if available
      if (element.metadata.resultData?.social_media_content_id) {
        const { data: contentData, error: contentError } = await supabase
          .from('social_media_content')
          .select('*')
          .eq('id', element.metadata.resultData.social_media_content_id)
          .single();

        if (!contentError) {
          setSocialMediaContent(contentData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analysis data:', err);
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await fetchAnalysisData();
    setRetrying(false);
  };

  if (!isOpen || !element) return null;

  const jobStatus = element.metadata?.jobStatus;
  const isProcessing = ['creating', 'pending', 'processing'].includes(jobStatus) || element.metadata?.isAnalyzing || element.metadata?.isScraping;
  const isFailed = jobStatus === 'failed' || element.metadata?.analysisError || element.metadata?.scrapingError;
  const contentPiece = element.metadata?.contentPiece;

  return (
    <div className={`fixed right-0 top-0 h-full w-[380px] bg-[#1a1b26] shadow-2xl transform transition-transform duration-300 z-50 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`} style={{ fontFamily: 'Noto Sans, sans-serif' }}>
      <div className="h-full flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Content Analysis</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Debug Info - Hidden */}
            {/* <div className="p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs">
              <p className="font-mono text-yellow-400">
                <span className="font-semibold">Debug ID:</span> {element.id}
              </p>
              {element.metadata?.scrapeId && (
                <p className="font-mono text-yellow-400">
                  <span className="font-semibold">Scrape ID:</span> {element.metadata.scrapeId}
                </p>
              )}
              {element.metadata?.contentPiece?.id && (
                <p className="font-mono text-yellow-400">
                  <span className="font-semibold">Content Piece ID:</span> {element.metadata.contentPiece.id}
                </p>
              )}
              <p className="font-mono text-yellow-400">
                <span className="font-semibold">Has Analysis:</span> {analysis ? 'Yes' : 'No'}
              </p>
            </div> */}
          
            {/* Thumbnail and Title */}
            <div>
              <img 
                src={getProxiedImageUrl(
                  element.thumbnail || 
                  element.metadata?.processedData?.thumbnailUrl || 
                  element.metadata?.processedData?.thumbnail ||
                  contentPiece?.thumbnail
                )} 
                alt={element.title}
                className="w-full rounded-lg mb-3 h-52"
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getPlatformPlaceholder(element.platform || 'content');
                }}
              />
              <h3 className="text-xl font-semibold mb-2">{contentPiece?.title || element.title || 'Untitled Content'}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{formatCalendarDate(contentPiece?.uploadDate || contentPiece?.publishedAt || contentPiece?.createdAt || new Date().toISOString())}</span>
              </div>
            </div>

            {/* Status Messages */}
            {isProcessing && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="font-medium">
                    {element.metadata?.isScraping ? 'Scraping content...' : 'Analyzing content...'}
                  </span>
                </div>
                <p className="text-sm text-blue-300 mt-1">
                  This may take 30-60 seconds. The panel will update automatically.
                </p>
              </div>
            )}

            {isFailed && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <span className="font-medium">Analysis failed</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"
                  >
                    {retrying ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    <span>Retry</span>
                  </button>
                </div>
                {element.metadata?.error && (
                  <p className="text-sm text-red-300 mt-1">{element.metadata.error}</p>
                )}
              </div>
            )}

            {/* Engagement Metrics */}
            {!isProcessing && !isFailed && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Engagement Metrics
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <Eye className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-400">Views</p>
                    <p className="text-lg font-semibold">{formatNumber(element.metadata?.processedData?.metrics?.views || element.metadata?.processedData?.viewCount || contentPiece?.viewCount || socialMediaContent?.view_count || 0)}</p>
                  </div>
                  <div className="text-center">
                    <ThumbsUp className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-400">Likes</p>
                    <p className="text-lg font-semibold">{formatNumber(element.metadata?.processedData?.metrics?.likes || element.metadata?.processedData?.likeCount || contentPiece?.likeCount || socialMediaContent?.like_count || 0)}</p>
                  </div>
                  <div className="text-center">
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-400">Comments</p>
                    <p className="text-lg font-semibold">{formatNumber(element.metadata?.processedData?.metrics?.comments || element.metadata?.processedData?.commentCount || contentPiece?.commentCount || socialMediaContent?.comment_count || 0)}</p>
                  </div>
                </div>
              
              </div>
            )}

            {/* Caption */}
            {(contentPiece?.caption || contentPiece?.description || element.metadata?.processedData?.caption) && !isProcessing && !isFailed && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Caption
                </h4>
                <p className="text-gray-300 whitespace-pre-wrap text-xs">
                  {contentPiece?.caption || contentPiece?.description || element.metadata?.processedData?.caption || 'No caption available'}
                </p>
              </div>
            )}


          {/* AI Analysis Results */}
          {analysis && !isProcessing && !isFailed && (
            <>
              {/* Hook Section */}
              {(analysis.hook_transcript || analysis.hook_analysis) && (
                <div className="border-l-4 border-green-500 bg-gray-800/50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-red-400" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider">Hook</h4>
                  </div>
                  <p className="text-xs text-gray-300 mb-3 whitespace-pre-wrap">
                    {analysis.hook_transcript || 
                     (typeof analysis.hook_analysis === 'object' && analysis.hook_analysis?.transcript_segment) ||
                     stripMarkdown(typeof analysis.hook_analysis === 'string' ? analysis.hook_analysis : analysis.hook_analysis?.primary_hook || 'No hook identified')}
                  </p>
                </div>
              )}

              {/* Body Section */}
              {(analysis.body_transcript || analysis.body_analysis) && (
                <div className="border-l-4 border-yellow-500 bg-gray-800/50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Folder className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider">Body</h4>
                  </div>
                  <p className="text-xs text-gray-300 mb-3 whitespace-pre-wrap">
                    {analysis.body_transcript || 
                     (typeof analysis.body_analysis === 'object' && analysis.body_analysis?.transcript_segment) ||
                     stripMarkdown(typeof analysis.body_analysis === 'string' ? analysis.body_analysis : 'No body content identified')}
                  </p>
                </div>
              )}

              {/* Call to Action Section */}
              {(analysis.cta_transcript || analysis.cta_analysis) && (
                <div className="border-l-4 border-red-500 bg-gray-800/50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flag className="w-5 h-5 text-red-400" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-red-400">
                      Call to Action
                    </h4>
                  </div>
                  <p className="text-xs text-gray-300 mb-3 whitespace-pre-wrap">
                    {analysis.cta_transcript || 
                     (typeof analysis.cta_analysis === 'object' && analysis.cta_analysis?.transcript_segment) ||
                     stripMarkdown(typeof analysis.cta_analysis === 'string' ? analysis.cta_analysis : analysis.cta_analysis?.primary_cta || 'No call to action identified')}
                  </p>
                </div>
              )}

              {/* Video Transcript */}
              {(analysis.transcript || contentPiece?.transcript || element.metadata?.processedData?.transcript) && (
                <div className="border-l-4 border-purple-500 bg-gray-800/50 rounded-r-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                      Video Transcript
                    </h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <p className="text-xs text-gray-300 whitespace-pre-wrap" style={{ fontFamily: 'Noto Sans, sans-serif', fontWeight: 400 }}>
                      {analysis.transcript || contentPiece?.transcript || element.metadata?.processedData?.transcript || 'No transcript available for this content.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}


            {/* Empty State */}
            {!loading && !error && !isProcessing && !analysis && !socialMediaContent && (
              <div className="text-center py-8">
                <AlertCircle size={48} className="text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No analysis data available</p>
                <button
                  onClick={handleRetry}
                  className="mt-3 text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto text-sm"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => window.open(element.url, '_blank')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            View Original
          </button>
        </div>
      </div>
    </div>
  );
};