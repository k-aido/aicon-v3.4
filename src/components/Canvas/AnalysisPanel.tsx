import React from 'react';
import { X, Eye, Heart, MessageCircle, Share2, Clock, User, Hash } from 'lucide-react';
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
              <div className="grid grid-cols-2 gap-3">
                {metrics.views !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-400 text-xs">Views</p>
                    </div>
                    <p className="text-white text-lg font-medium">{formatNumber(metrics.views)}</p>
                  </div>
                )}
                {metrics.likes !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-400 text-xs">Likes</p>
                    </div>
                    <p className="text-white text-lg font-medium">{formatNumber(metrics.likes)}</p>
                  </div>
                )}
                {metrics.comments !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-400 text-xs">Comments</p>
                    </div>
                    <p className="text-white text-lg font-medium">{formatNumber(metrics.comments)}</p>
                  </div>
                )}
                {metrics.shares !== undefined && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-gray-400" />
                      <p className="text-gray-400 text-xs">Shares</p>
                    </div>
                    <p className="text-white text-lg font-medium">{formatNumber(metrics.shares)}</p>
                  </div>
                )}
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
            <>
              {/* Hook Analysis */}
              {analysis.hook && (
                <div className="mb-6">
                  <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Hook Analysis</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-300 text-sm">{analysis.hook}</p>
                    {analysis.hookScore && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">Effectiveness</span>
                          <span className="text-gray-400">{analysis.hookScore}/10</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${analysis.hookScore * 10}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Strategy */}
              {analysis.contentStrategy && (
                <div className="mb-6">
                  <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Content Strategy</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-300 text-sm">{analysis.contentStrategy}</p>
                  </div>
                </div>
              )}

              {/* Key Insights */}
              {analysis.keyInsights && analysis.keyInsights.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Key Insights</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <ul className="text-gray-300 text-sm space-y-2">
                      {analysis.keyInsights.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Improvement Suggestions */}
              {analysis.improvements && analysis.improvements.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Improvement Suggestions</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <ul className="text-gray-300 text-sm space-y-2">
                      {analysis.improvements.map((improvement: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-400 mr-2">→</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
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

          {/* Additional Info */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Platform</p>
                <p className="text-white text-sm font-medium capitalize">{content.platform}</p>
              </div>
              {processedData.duration && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Duration</p>
                  <p className="text-white text-sm font-medium">{formatDuration(processedData.duration)}</p>
                </div>
              )}
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Status</p>
                <p className={`text-sm font-medium ${
                  metadata.isAnalyzed ? 'text-green-400' : 
                  metadata.isAnalyzing ? 'text-yellow-400' : 
                  metadata.isScraping ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {metadata.isAnalyzed ? 'Analyzed' : 
                   metadata.isAnalyzing ? 'Analyzing' : 
                   metadata.isScraping ? 'Scraping' : 'Not Analyzed'}
                </p>
              </div>
              {metadata.scrapeId && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Scrape ID</p>
                  <p className="text-white text-xs font-mono truncate">{metadata.scrapeId}</p>
                </div>
              )}
            </div>
          </div>
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