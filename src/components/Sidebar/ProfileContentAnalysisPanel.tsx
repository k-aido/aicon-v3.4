import React from 'react';
import { X, ExternalLink, Heart, MessageCircle, Eye, Share, TrendingUp, Hash, Calendar } from 'lucide-react';
import { ProfileContentItem } from '@/data/mockProfileContent';

interface ProfileContentAnalysisPanelProps {
  isOpen: boolean;
  content: ProfileContentItem | null;
  onClose: () => void;
}

const ProfileContentAnalysisPanel: React.FC<ProfileContentAnalysisPanelProps> = ({
  isOpen,
  content,
  onClose
}) => {
  if (!isOpen || !content) return null;

  const platformConfig = {
    instagram: {
      color: '#E4405F',
      label: 'Instagram Post',
      bgGradient: 'from-purple-500 to-pink-500'
    },
    tiktok: {
      color: '#000000',
      label: 'TikTok Video',
      bgGradient: 'from-black to-gray-800'
    },
    youtube: {
      color: '#FF0000',
      label: 'YouTube Video',
      bgGradient: 'from-red-500 to-red-600'
    }
  };

  const config = platformConfig[content.platform];

  const formatMetric = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.bgGradient} text-white p-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium opacity-90">{config.label}</span>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-lg font-semibold line-clamp-2">
          {content.title}
        </h2>
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pb-16">
        {/* Thumbnail */}
        <div className="relative">
          <img
            src={content.thumbnail}
            alt={content.title}
            className="w-full h-48 object-cover"
          />
          <button
            onClick={() => window.open(content.url, '_blank')}
            className="absolute top-3 right-3 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatMetric(content.metrics.likes)}
                </div>
                <div className="text-xs text-gray-500">Likes</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatMetric(content.metrics.comments)}
                </div>
                <div className="text-xs text-gray-500">Comments</div>
              </div>
            </div>
            {content.metrics.views && (
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatMetric(content.metrics.views)}
                  </div>
                  <div className="text-xs text-gray-500">Views</div>
                </div>
              </div>
            )}
            {content.metrics.shares && (
              <div className="flex items-center gap-2">
                <Share className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatMetric(content.metrics.shares)}
                  </div>
                  <div className="text-xs text-gray-500">Shares</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Publishing Details */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Publishing Details</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Published {formatDate(content.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ExternalLink className="w-4 h-4" />
              <span>Type: {content.type}</span>
            </div>
          </div>
        </div>

        {/* Hashtags */}
        {content.hashtags.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Hashtags</h3>
            <div className="flex flex-wrap gap-2">
              {content.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Analysis */}
        {content.analysis && (
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Analysis</h3>
            
            {/* Sentiment */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sentiment
              </label>
              <div className="mt-1">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(content.analysis.sentiment)}`}>
                  {content.analysis.sentiment.charAt(0).toUpperCase() + content.analysis.sentiment.slice(1)}
                </span>
              </div>
            </div>

            {/* Engagement Rate */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Engagement Rate
              </label>
              <div className="mt-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-lg font-semibold text-gray-900">
                  {content.analysis.engagement.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Summary
              </label>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                {content.analysis.summary}
              </p>
            </div>

            {/* Topics */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Topics
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {content.analysis.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => window.open(content.url, '_blank')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Original Post
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
              <TrendingUp className="w-4 h-4" />
              Analyze with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileContentAnalysisPanel;