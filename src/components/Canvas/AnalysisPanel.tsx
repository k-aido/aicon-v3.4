import React from 'react';
import { X, Eye, Heart, Share2, Clock, User, Hash, MessageCircle } from 'lucide-react';
import { ContentElement } from '@/types';
import { getProxiedImageUrl, getPlatformPlaceholder } from '@/utils/imageProxy';

interface AnalysisPanelProps {
  isOpen: boolean;
  content: ContentElement | null;
  onClose: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  content,
  onClose
}) => {
  if (!content) return null;

  const metadata = (content as any).metadata || {};
  const processedData = metadata.processedData || {};
  const analysis = metadata.analysis || {};
  const metrics = processedData.metrics || {};
  
  // Debug log to see available data
  console.log('[AnalysisPanel] Available data:', {
    hasTranscriptInAnalysis: !!analysis.transcript,
    hasTranscriptInProcessedData: !!processedData.transcript,
    hasCaptionInProcessedData: !!processedData.caption,
    hasSubtitlesInProcessedData: !!processedData.subtitles,
    processedDataKeys: Object.keys(processedData),
    analysisKeys: Object.keys(analysis),
    // Log actual content to see what's in each field
    captionPreview: processedData.caption?.substring(0, 100),
    transcriptPreview: processedData.transcript?.substring(0, 100),
    subtitlesPreview: processedData.subtitles?.substring(0, 100),
    // Check the actual transcript data
    transcriptLength: processedData.transcript?.length,
    transcriptType: typeof processedData.transcript,
    // Check metadata status
    isAnalyzed: metadata.isAnalyzed,
    isScraping: metadata.isScraping,
    scrapeId: metadata.scrapeId,
    // Check if we have the full content object
    contentPlatform: content.platform,
    hasMetadata: !!metadata,
    // Log the full processedData object
    fullProcessedData: processedData
  });

  // Format number with K/M suffix
  const formatNumber = (num: number | undefined): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format duration from seconds to readable format
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  // Clean up text by removing markdown-like formatting
  const cleanText = (text: string): string => {
    if (!text) return '';
    // Remove markdown bold markers and other formatting
    return text
      .replace(/\*\*/g, '')
      .replace(/\*\*:/g, '')
      .replace(/^[*\-•:]\s*/g, '')  // Added colon to the regex
      .replace(/^:\s*/g, '')  // Remove leading colons
      .trim();
  };

  return (
    <div className={`fixed right-0 top-0 h-full bg-gray-900 shadow-2xl transition-transform duration-300 z-50 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } w-96 overflow-hidden`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Content Analysis</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Thumbnail */}
          <div className="mb-4">
            <img 
              src={getProxiedImageUrl(processedData.thumbnailUrl || content.thumbnail)} 
              alt={processedData.title || content.title}
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getPlatformPlaceholder(content.platform);
              }}
            />
          </div>

          {/* Title and Author */}
          <div className="mb-4">
            <h3 className="text-white text-lg font-medium mb-2">
              {processedData.title || content.title}
            </h3>
            {processedData.author?.name && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <User className="w-4 h-4" />
                <span>{processedData.author.name}</span>
              </div>
            )}
            {processedData.uploadDate && (
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(processedData.uploadDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Metrics */}
          {(metrics.views || metrics.likes || metrics.comments) && (
            <div className="mb-6">
              <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Engagement Metrics</h4>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  {metrics.views !== undefined && (
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-400 text-xs">Views</span>
                      </div>
                      <p className="text-white text-lg font-medium">{formatNumber(metrics.views)}</p>
                    </div>
                  )}
                  {metrics.views !== undefined && metrics.likes !== undefined && (
                    <div className="w-px h-8 bg-gray-700"></div>
                  )}
                  {metrics.likes !== undefined && (
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Heart className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-400 text-xs">Likes</span>
                      </div>
                      <p className="text-white text-lg font-medium">{formatNumber(metrics.likes)}</p>
                    </div>
                  )}
                  {metrics.likes !== undefined && metrics.comments !== undefined && (
                    <div className="w-px h-8 bg-gray-700"></div>
                  )}
                  {metrics.comments !== undefined && (
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-400 text-xs">Comments</span>
                      </div>
                      <p className="text-white text-lg font-medium">{formatNumber(metrics.comments)}</p>
                    </div>
                  )}
                  {metrics.comments !== undefined && metrics.shares !== undefined && (
                    <div className="w-px h-8 bg-gray-700"></div>
                  )}
                  {metrics.shares !== undefined && (
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Share2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-400 text-xs">Shares</span>
                      </div>
                      <p className="text-white text-lg font-medium">{formatNumber(metrics.shares)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Caption/Description */}
          {(processedData.caption || processedData.description) && (
            <div className="mb-6">
              <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Caption</h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {processedData.caption || processedData.description}
                </p>
              </div>
            </div>
          )}

          {/* Hashtags */}
          {processedData.hashtags && processedData.hashtags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Hashtags</h4>
              <div className="flex flex-wrap gap-2">
                {processedData.hashtags.map((tag: string, index: number) => (
                  <span key={index} className="bg-gray-800 text-blue-400 px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {tag.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {analysis && (
            <div className="space-y-4">
              {/* Hook Analysis */}
              {(analysis.hook || analysis.hook_analysis) && (
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
                  <h4 className="text-green-400 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-lg">🎯</span> HOOK
                  </h4>
                  <p className="text-gray-100 text-sm leading-relaxed">{cleanText(analysis.hook || analysis.hook_analysis)}</p>
                  {analysis.hookScore && (
                    <div className="mt-3 bg-gray-900 rounded-lg p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Effectiveness Score</span>
                        <span className="text-green-400 font-semibold">{analysis.hookScore}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${analysis.hookScore * 10}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Body Analysis */}
              {(analysis.body || analysis.keyPoints || analysis.contentStructure?.body || analysis.body_analysis) && (
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
                  <h4 className="text-yellow-400 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-lg">📋</span> BODY
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      // Check if we have body_analysis (string) or other formats
                      const bodyContent = analysis.body || analysis.keyPoints || analysis.contentStructure?.body || analysis.body_analysis;
                      
                      // If body_analysis is a string, display it as a single paragraph
                      if (typeof bodyContent === 'string') {
                        return (
                          <p className="text-gray-100 text-sm leading-relaxed">{cleanText(bodyContent)}</p>
                        );
                      }
                      
                      // If it's an array, display as bullet points
                      const pointsArray = Array.isArray(bodyContent) ? bodyContent : [];
                      return pointsArray.map((point: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-yellow-400 text-sm mt-0.5">•</span>
                          <p className="text-gray-100 text-sm leading-relaxed flex-1">{cleanText(point)}</p>
                        </div>
                      ));
                    })()}
                  </div>
                  {/* Temporarily hardcoded to 8/10 */}
                  {(
                    <div className="mt-3 bg-gray-900 rounded-lg p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Effectiveness Score</span>
                        <span className="text-yellow-400 font-semibold">{analysis.bodyScore || analysis.body_score || 8}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${(analysis.bodyScore || analysis.body_score || 8) * 10}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CTA Analysis */}
              {(analysis.cta || analysis.callToAction || analysis.contentStructure?.cta || analysis.cta_analysis) && (
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
                  <h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-lg">📢</span> CALL TO ACTION
                  </h4>
                  <p className="text-gray-100 text-sm leading-relaxed">
                    {cleanText(analysis.cta || analysis.callToAction || analysis.contentStructure?.cta || analysis.cta_analysis)}
                  </p>
                  {/* Temporarily hardcoded to 8/10 */}
                  {(
                    <div className="mt-3 bg-gray-900 rounded-lg p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Effectiveness Score</span>
                        <span className="text-red-400 font-semibold">{analysis.ctaScore || analysis.cta_score || 8}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${(analysis.ctaScore || analysis.cta_score || 8) * 10}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Content Strategy */}
              {(analysis.contentStrategy && !analysis.body_analysis) && (
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
                  <h4 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-lg">📊</span> CONTENT STRATEGY
                  </h4>
                  <p className="text-gray-100 text-sm leading-relaxed">{cleanText(analysis.contentStrategy)}</p>
                </div>
              )}

              {/* Video Transcript - Separate section */}
              {(processedData.transcript || content.platform === 'youtube') && (
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
                  <h4 className="text-purple-400 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-lg">📝</span> VIDEO TRANSCRIPT
                  </h4>
                  <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {(() => {
                        // The transcript is stored in processedData.transcript
                        const transcript = processedData.transcript;
                        
                        // Log for debugging
                        console.log('[AnalysisPanel] Transcript check:', {
                          hasTranscript: !!transcript,
                          transcriptLength: transcript?.length,
                          transcriptPreview: transcript?.substring(0, 50)
                        });
                        
                        if (transcript) {
                          // We have the actual video transcript
                          return cleanText(transcript);
                        }
                        
                        // Check if this is a video that should have a transcript
                        if (content.platform === 'youtube') {
                          // Check if it's still being processed
                          if (metadata.isScraping || metadata.isAnalyzing) {
                            return 'Transcript is being processed...';
                          }
                          
                          // Check if this content was scraped before transcript feature was added
                          if (!processedData.transcriptionSource && metadata.isAnalyzed) {
                            return 'This content was analyzed before transcript extraction was available. Re-analyze to fetch the transcript.';
                          }
                          
                          return 'Video transcript not available. This video may not have captions enabled.';
                        }
                        
                        // For other platforms
                        return 'Transcript not available for this content type.';
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Comments */}
          {processedData.topComments && processedData.topComments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Top Comments</h4>
              <div className="space-y-2">
                {processedData.topComments.slice(0, 3).map((comment: any, index: number) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-300 text-sm">{comment.text || comment}</p>
                    {comment.likes && (
                      <div className="flex items-center gap-1 mt-1">
                        <Heart className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500 text-xs">{formatNumber(comment.likes)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => window.open(content.url, '_blank')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors"
          >
            View Original
          </button>
        </div>
      </div>
    </div>
  );
};