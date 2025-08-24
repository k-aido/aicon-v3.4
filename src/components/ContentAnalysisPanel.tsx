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

  useEffect(() => {
    if (content && isOpen) {
      // Debug log to see what data we have
      console.log('[ContentAnalysisPanel] Content data:', {
        content,
        thumbnail: content.thumbnail,
        metadata: (content as any).metadata,
        processedData: (content as any).metadata?.processedData
      });
      
      // For now, using mock data. In production, this would fetch from your API
      const mockAnalysis = {
        hook: {
          text: 'The content grabs attention with a bold and assertive statement, "Just win," which immediately conveys a sense of urgency and determination. The simplicity of the title "Whatever" adds an element of intrigue, prompting viewers to engage further.',
          effectiveness: 8
        },
        body: {
          text: 'The storytelling technique relies on minimalism, using short, impactful phrases that resonate with a competitive mindset. The value is delivered through the emphasis on winning, appealing to viewers\' aspirations and motivating them to take action.',
          effectiveness: 8
        },
        cta: {
          text: 'The desired outcome is implicit; it encourages viewers to adopt a winning mentality and focus on success, rather than getting bogged down by distractions.',
          effectiveness: 8
        },
        transcript: processedData.transcript || processedData.subtitles || processedData.captions || null
      };
      setAnalysisData(mockAnalysis);
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

            {/* Caption */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Caption
              </h4>
              <p className="text-gray-300 whitespace-pre-wrap text-xs">
                {processedData.caption || processedData.description || 'Whatever.\n\nJust win.'}
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
              </div>
              <div className="max-h-96 overflow-y-auto">
                <p className="text-xs text-gray-300 whitespace-pre-wrap" style={{ fontFamily: 'Noto Sans, sans-serif', fontWeight: 400 }}>
                  {analysisData?.transcript || 'No transcript available for this content.'}
                </p>
              </div>
            </div>
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