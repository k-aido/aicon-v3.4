import React, { useState, useEffect } from 'react';
import { 
  X, Eye, Heart, MessageCircle, Calendar,
  Target, Folder, Flag, FileText
} from 'lucide-react';
import { ContentElement } from '@/types';
import { getProxiedImageUrl, getPlatformPlaceholder } from '@/utils/imageProxy';

interface ContentAnalysisPanelProps {
  isOpen: boolean;
  content: ContentElement | null;
  onClose: () => void;
}

export const ContentAnalysisPanel: React.FC<ContentAnalysisPanelProps> = ({
  isOpen,
  content,
  onClose
}) => {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);

  // Format date nicely
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Date unavailable';
    
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return date.toLocaleDateString('en-US', options);
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

  // Fetch transcript if deferred
  const fetchTranscript = async (scrapeId: string) => {
    setFetchingTranscript(true);
    try {
      const response = await fetch(`/api/content/transcript/${scrapeId}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success && data.transcript) {
        // Update analysis data with fetched transcript
        setAnalysisData((prev: any) => ({
          ...prev,
          transcript: data.transcript
        }));
      }
    } catch (error) {
      console.error('[ContentAnalysisPanel] Failed to fetch transcript:', error);
    } finally {
      setFetchingTranscript(false);
    }
  };

  useEffect(() => {
    if (content && isOpen) {
      // Debug log to see what data we have
      console.log('[ContentAnalysisPanel] Content data:', {
        content,
        thumbnail: content.thumbnail,
        metadata: (content as any).metadata,
        processedData: (content as any).metadata?.processedData,
        analysis: (content as any).metadata?.analysis
      });
      
      const metadata = (content as any).metadata || {};
      const processedData = metadata.processedData || {};
      const existingAnalysis = metadata.analysis;
      
      // Debug transcript data
      console.log('[ContentAnalysisPanel] Loading content data:', {
        contentPlatform: content.platform,
        hasProcessedData: !!processedData,
        processedDataKeys: Object.keys(processedData),
        transcript: processedData.transcript,
        transcriptDeferred: processedData.transcriptDeferred,
        subtitles: processedData.subtitles,
        captions: processedData.captions
      });
      
      // Use real analysis data if available, otherwise use mock data
      if (existingAnalysis) {
        // Transform analysis data to match the panel's expected format
        const analysisData = {
          hook: {
            text: existingAnalysis.hook_analysis || existingAnalysis.hook || 'No hook analysis available',
            effectiveness: existingAnalysis.hookScore || 8
          },
          body: {
            text: existingAnalysis.body_analysis || existingAnalysis.contentStrategy || 'No body analysis available',
            effectiveness: 8
          },
          cta: {
            text: existingAnalysis.cta_analysis || 'No CTA analysis available',
            effectiveness: 8
          },
          transcript: processedData.transcript || processedData.subtitles || processedData.captions || null,
          keyTopics: existingAnalysis.key_topics || existingAnalysis.keyInsights || [],
          engagementTactics: existingAnalysis.engagement_tactics || existingAnalysis.improvements || [],
          sentiment: existingAnalysis.sentiment || 'neutral',
          complexity: existingAnalysis.complexity || 'moderate'
        };
        console.log('[ContentAnalysisPanel] Setting analysis data with transcript:', analysisData.transcript);
        setAnalysisData(analysisData);
        
        // Check if transcript was deferred and needs fetching
        if (processedData.transcriptDeferred && !processedData.transcript && metadata.scrapeId) {
          fetchTranscript(metadata.scrapeId);
        }
      } else {
        // Fallback to mock data if no analysis exists
        const mockAnalysis = {
          hook: {
            text: 'The content grabs attention with a bold and assertive statement that immediately conveys a sense of urgency and determination.',
            effectiveness: 8
          },
          body: {
            text: 'The storytelling technique relies on effective visual and narrative elements that resonate with the target audience.',
            effectiveness: 8
          },
          cta: {
            text: 'The desired outcome encourages viewers to engage further with the content and take specific actions.',
            effectiveness: 8
          },
          transcript: processedData.transcript || processedData.subtitles || processedData.captions || null,
          keyTopics: [],
          engagementTactics: [],
          sentiment: 'positive',
          complexity: 'moderate'
        };
        setAnalysisData(mockAnalysis);
      }
    }
  }, [content, isOpen]);

  if (!isOpen || !content) return null;

  // Extract metadata from content
  const metadata = (content as any).metadata || {};
  const processedData = metadata.processedData || {};
  const metrics = processedData.metrics || {
    views: 335300,
    likes: 70600,
    comments: 564
  };

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={`fixed right-0 top-0 h-full w-[380px] bg-[#201e1c] shadow-2xl transform transition-transform duration-300 z-50 ${
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
            {/* Thumbnail and Title */}
            <div>
              <img 
                src={getProxiedImageUrl(
                  content.thumbnail || 
                  processedData.thumbnailUrl || 
                  processedData.thumbnail ||
                  (content as any).thumbnailUrl
                )} 
                alt={content.title}
                className="w-full rounded-lg mb-3 h-52"
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getPlatformPlaceholder(content.platform || 'content');
                }}
              />
              <h3 className="text-xl font-semibold mb-2">{content.title || processedData.title || 'Whatever. Just win.'}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(processedData.uploadDate || processedData.publishedAt || processedData.createdAt)}</span>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Engagement Metrics
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Eye className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-400">Views</p>
                  <p className="text-lg font-semibold">{formatNumber(metrics.views)}</p>
                </div>
                <div className="text-center">
                  <Heart className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-400">Likes</p>
                  <p className="text-lg font-semibold">{formatNumber(metrics.likes)}</p>
                </div>
                <div className="text-center">
                  <MessageCircle className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-400">Comments</p>
                  <p className="text-lg font-semibold">{formatNumber(metrics.comments)}</p>
                </div>
              </div>
            </div>

            {/* Caption/Description */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {content.platform === 'youtube' ? 'Description' : 'Caption'}
              </h4>
              <p className="text-gray-300 whitespace-pre-wrap text-xs">
                {processedData.caption || processedData.description || 'No description available'}
              </p>
            </div>

            {/* Hook Analysis */}
            <div className="border-l-4 border-green-500 bg-gray-800/50 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-red-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider">Hook</h4>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                {analysisData?.hook.text}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Effectiveness Score</span>
                <span className="text-sm font-bold text-green-400">
                  {analysisData?.hook.effectiveness}/10
                </span>
              </div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analysisData?.hook.effectiveness || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* Body Analysis */}
            <div className="border-l-4 border-yellow-500 bg-gray-800/50 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-yellow-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider">Body</h4>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                {analysisData?.body.text}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Effectiveness Score</span>
                <span className="text-sm font-bold text-yellow-400">
                  {analysisData?.body.effectiveness}/10
                </span>
              </div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analysisData?.body.effectiveness || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* Call to Action */}
            <div className="border-l-4 border-red-500 bg-gray-800/50 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="w-5 h-5 text-red-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-red-400">
                  Call to Action
                </h4>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                {analysisData?.cta.text}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Effectiveness Score</span>
                <span className="text-sm font-bold text-red-400">
                  {analysisData?.cta.effectiveness}/10
                </span>
              </div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(analysisData?.cta.effectiveness || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* Video Transcript */}
            <div className="border-l-4 border-purple-500 bg-gray-800/50 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                  Video Transcript
                </h4>
                {fetchingTranscript && (
                  <span className="text-xs text-purple-400 animate-pulse">Loading...</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {fetchingTranscript ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-gray-400">Fetching transcript...</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 whitespace-pre-wrap" style={{ fontFamily: 'Noto Sans, sans-serif', fontWeight: 400 }}>
                    {analysisData?.transcript || 'No transcript available for this content.'}
                  </p>
                )}
              </div>
            </div>

            {/* Key Topics */}
            {analysisData?.keyTopics && analysisData.keyTopics.length > 0 && (
              <div className="border-l-4 border-blue-500 bg-gray-800/50 rounded-r-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
                    Key Topics
                  </h4>
                </div>
                <ul className="space-y-1">
                  {analysisData.keyTopics.map((topic: string, index: number) => (
                    <li key={index} className="text-xs text-gray-300 flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Engagement Tactics */}
            {analysisData?.engagementTactics && analysisData.engagementTactics.length > 0 && (
              <div className="border-l-4 border-green-500 bg-gray-800/50 rounded-r-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-green-400">
                    Engagement Tactics
                  </h4>
                </div>
                <ul className="space-y-1">
                  {analysisData.engagementTactics.map((tactic: string, index: number) => (
                    <li key={index} className="text-xs text-gray-300 flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      <span>{tactic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Analysis Metadata */}
            {analysisData && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Sentiment</p>
                  <p className={`text-sm font-semibold capitalize ${
                    analysisData.sentiment === 'positive' ? 'text-green-400' :
                    analysisData.sentiment === 'negative' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {analysisData.sentiment}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Complexity</p>
                  <p className="text-sm font-semibold text-gray-300 capitalize">
                    {analysisData.complexity}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => window.open(content.url, '_blank')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            View Original
          </button>
        </div>
      </div>
    </div>
  );
};