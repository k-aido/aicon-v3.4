import React from 'react';
import { X, ExternalLink, TrendingUp, Clock, Eye, ThumbsUp, MessageSquare, Youtube, Instagram, Video, Trash2 } from 'lucide-react';
import { ContentPiece } from '@/types/canvas';

interface ContentDetailsPanelProps {
  content: ContentPiece | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (contentId: string) => void;
}

const PlatformIcon: React.FC<{ platform: string }> = ({ platform }) => {
  switch (platform) {
    case 'youtube':
      return <Youtube className="w-5 h-5 text-red-500" />;
    case 'instagram':
      return <Instagram className="w-5 h-5 text-pink-500" />;
    case 'tiktok':
      return <Video className="w-5 h-5 text-white" />;
    default:
      return null;
  }
};

const formatNumber = (num: number | undefined): string => {
  if (!num) return '0';
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatDuration = (seconds: number | undefined): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ContentDetailsPanel: React.FC<ContentDetailsPanelProps> = ({
  content,
  isOpen,
  onClose,
  onDelete
}) => {
  if (!content) return null;

  const hasAnalysis = !!content.analysis;
  const analysis = content.analysis;

  return (
    <div className={`fixed right-0 top-0 h-full bg-gray-900 shadow-2xl transition-transform duration-300 z-50 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } w-96 overflow-hidden`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Content Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Thumbnail Section */}
          <div className="p-4">
            <div className="relative rounded-lg overflow-hidden bg-gray-800 aspect-video">
              <img 
                src={content.thumbnail} 
                alt={content.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 rounded px-2 py-1">
                <span className="text-white text-xs">{formatDuration(content.duration)}</span>
              </div>
            </div>
          </div>

          {/* Title & Platform */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <PlatformIcon platform={content.platform} />
              <span className="text-gray-400 text-sm capitalize">{content.platform}</span>
              {content.publishedAt && (
                <span className="text-gray-500 text-xs">
                  • {new Date(content.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="text-white font-medium">{content.title}</h3>
            {content.author && (
              <p className="text-gray-400 text-sm mt-1">by {content.author.name}</p>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="px-4 pb-4">
            <h4 className="text-white text-sm font-semibold mb-3">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs">Views</span>
                </div>
                <p className="text-white text-lg font-semibold">
                  {formatNumber(content.viewCount)}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-xs">Likes</span>
                </div>
                <p className="text-white text-lg font-semibold">
                  {formatNumber(content.likeCount)}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">Comments</span>
                </div>
                <p className="text-white text-lg font-semibold">
                  {formatNumber(content.commentCount)}
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Engagement</span>
                </div>
                <p className="text-white text-lg font-semibold">
                  {content.likeCount && content.viewCount 
                    ? `${((content.likeCount / content.viewCount) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="px-4 pb-4">
            <h4 className="text-white text-sm font-semibold mb-3">Content Analysis</h4>
            
            {hasAnalysis ? (
              <>
                {/* Hook Section */}
                <div className="mb-4">
                  <h5 className="text-green-400 text-xs font-semibold uppercase mb-2 tracking-wider">🎯 Hook</h5>
                  <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-green-400">
                    <p className="text-gray-300 text-sm">
                      {analysis?.keyPoints?.[0] || 'Strong opening that captures attention and addresses viewer pain points effectively.'}
                    </p>
                  </div>
                </div>

                {/* Body Section */}
                <div className="mb-4">
                  <h5 className="text-blue-400 text-xs font-semibold uppercase mb-2 tracking-wider">📝 Body</h5>
                  <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-blue-400">
                    <p className="text-gray-300 text-sm mb-2">{analysis?.summary}</p>
                    {analysis?.keyPoints?.slice(1, 3).map((point: string, index: number) => (
                      <p key={index} className="text-gray-400 text-sm mb-1">• {point}</p>
                    ))}
                  </div>
                </div>

                {/* CTA Section */}
                <div className="mb-4">
                  <h5 className="text-purple-400 text-xs font-semibold uppercase mb-2 tracking-wider">🚀 Call to Action</h5>
                  <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-purple-400">
                    <p className="text-gray-300 text-sm">
                      {analysis?.keyPoints?.[analysis?.keyPoints?.length - 1] || 'Clear call-to-action encouraging engagement and follow-up actions.'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Hook Section - No Analysis */}
                <div className="mb-4">
                  <h5 className="text-gray-500 text-xs font-semibold uppercase mb-2 tracking-wider">🎯 Hook</h5>
                  <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-gray-600">
                    <p className="text-gray-500 text-sm italic">
                      Click &quot;Analyze&quot; to evaluate hook effectiveness and audience engagement strategies.
                    </p>
                  </div>
                </div>

                {/* Body Section - No Analysis */}
                <div className="mb-4">
                  <h5 className="text-gray-500 text-xs font-semibold uppercase mb-2 tracking-wider">📝 Body</h5>
                  <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-gray-600">
                    <p className="text-gray-500 text-sm italic">
                      Content structure, key points, and educational value will be analyzed here.
                    </p>
                  </div>
                </div>

                {/* CTA Section - No Analysis */}
                <div className="mb-4">
                  <h5 className="text-gray-500 text-xs font-semibold uppercase mb-2 tracking-wider">🚀 Call to Action</h5>
                  <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-gray-600">
                    <p className="text-gray-500 text-sm italic">
                      Call-to-action effectiveness and conversion potential will be evaluated here.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Additional Analysis Info */}
          {hasAnalysis && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800 rounded px-2 py-1">
                  <span className="text-gray-400">Sentiment: </span>
                  <span className={`capitalize ${
                    analysis?.sentiment === 'positive' ? 'text-green-400' :
                    analysis?.sentiment === 'negative' ? 'text-red-400' :
                    analysis?.sentiment === 'mixed' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    {analysis?.sentiment}
                  </span>
                </div>
                <div className="bg-gray-800 rounded px-2 py-1">
                  <span className="text-gray-400">Complexity: </span>
                  <span className="text-gray-300 capitalize">{analysis?.complexity}</span>
                </div>
              </div>

              {/* Topics */}
              {(analysis?.topics?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <h5 className="text-gray-400 text-xs font-semibold uppercase mb-2">Topics</h5>
                  <div className="flex flex-wrap gap-2">
                    {analysis?.topics?.map((topic: any, index: number) => (
                      <span 
                        key={index}
                        className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded"
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {content.tags && content.tags.length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-white text-sm font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={() => window.open(content.url, '_blank')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Watch Original
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this content?')) {
                  onDelete(content.id);
                  onClose();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDetailsPanel;