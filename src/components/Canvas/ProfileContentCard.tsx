import React from 'react';
import { ExternalLink, Heart, MessageCircle, Eye, Share } from 'lucide-react';

interface ProfileContentItem {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  type: 'post' | 'video' | 'story';
  title: string;
  description?: string;
  thumbnail: string;
  url: string;
  publishedAt: Date;
  metrics: {
    likes: number;
    comments: number;
    views?: number;
    shares?: number;
  };
  hashtags: string[];
  analysis?: {
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
    engagement: number;
  };
}

interface ProfileContentCardProps {
  content: ProfileContentItem;
  onDoubleClick: (content: ProfileContentItem) => void;
  onExternalLink: (url: string) => void;
  selected?: boolean;
}

const ProfileContentCard: React.FC<ProfileContentCardProps> = ({
  content,
  onDoubleClick,
  onExternalLink,
  selected = false
}) => {
  const platformConfig = {
    instagram: {
      headerColor: '#E4405F',
      label: 'Instagram Post',
      bgGradient: 'from-purple-500 to-pink-500'
    },
    tiktok: {
      headerColor: '#000000',
      label: 'TikTok Video',
      bgGradient: 'from-black to-gray-800'
    },
    youtube: {
      headerColor: '#FF0000',
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

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExternalLink(content.url);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
        selected ? 'border-purple-500 shadow-purple-200' : 'border-gray-200 hover:border-gray-300'
      }`}
      onDoubleClick={() => onDoubleClick(content)}
    >
      {/* Platform Header */}
      <div 
        className={`h-8 rounded-t-lg bg-gradient-to-r ${config.bgGradient} flex items-center justify-between px-3`}
      >
        <span className="text-white text-xs font-medium">
          {config.label}
        </span>
        <button
          onClick={handleExternalClick}
          className="text-white hover:text-gray-200 transition-colors"
          title="Open original post"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="relative">
        <img
          src={content.thumbnail}
          alt={content.title}
          className="w-full h-32 object-cover"
          loading="lazy"
        />
        {/* Platform overlay for videos */}
        {(content.platform === 'youtube' || content.platform === 'tiktok') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-50 rounded-full p-2">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-2 border-l-black border-y-transparent border-y border-r-0 ml-0.5"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-3">
        {/* Title */}
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
          {content.title}
        </h4>

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>{formatMetric(content.metrics.likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{formatMetric(content.metrics.comments)}</span>
          </div>
          {content.metrics.views && (
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{formatMetric(content.metrics.views)}</span>
            </div>
          )}
        </div>

        {/* Hashtags */}
        {content.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {content.hashtags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {content.hashtags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{content.hashtags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Analysis indicator */}
        {content.analysis && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Analysis available</span>
              <div 
                className={`w-2 h-2 rounded-full ${
                  content.analysis.sentiment === 'positive' ? 'bg-green-400' :
                  content.analysis.sentiment === 'negative' ? 'bg-red-400' : 'bg-yellow-400'
                }`}
                title={`Sentiment: ${content.analysis.sentiment}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileContentCard;