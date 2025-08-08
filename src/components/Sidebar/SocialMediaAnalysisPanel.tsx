import React, { useState, useEffect } from 'react';
import { 
  X, ExternalLink, TrendingUp, Clock, Eye, ThumbsUp, MessageSquare, 
  Share2, Youtube, Instagram, Music2, CheckCircle, AlertCircle, 
  ChevronDown, ChevronUp, Copy, RefreshCw, Loader2, UserCheck,
  Users, Calendar, BarChart3
} from 'lucide-react';
import { formatNumber, formatDuration, formatRelativeTime, calculateEngagementRate } from '@/utils/formatters';
import { supabase } from '@/lib/supabase/client';
import type { ExtendedContentAnalysis, SocialMediaContent } from '@/types/social-media';

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

const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const MetricCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  loading?: boolean;
}> = ({ icon, label, value, loading = false }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center gap-2 text-gray-600 mb-1">
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </div>
    {loading ? (
      <SkeletonLoader className="h-6 w-20" />
    ) : (
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    )}
  </div>
);

const AnalysisSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = '' }) => (
  <div className={`border-t pt-4 ${className}`}>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
    </button>
  );
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
  const [rawDataOpen, setRawDataOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Fetch analysis data when panel opens
  useEffect(() => {
    if (!isOpen || !element?.metadata?.contentPiece?.id) {
      return;
    }

    fetchAnalysisData();
  }, [isOpen, element?.metadata?.contentPiece?.id]);

  const fetchAnalysisData = async () => {
    if (!element?.metadata?.contentPiece?.id) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch content analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('content_analysis')
        .select('*, hook_analysis, body_analysis, cta_analysis')
        .eq('content_piece_id', element.metadata.contentPiece.id)
        .single();

      if (analysisError) throw analysisError;
      setAnalysis(analysisData);

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
  const isProcessing = ['creating', 'pending', 'processing'].includes(jobStatus);
  const isFailed = jobStatus === 'failed';
  const contentPiece = element.metadata?.contentPiece;

  return (
    <div className={`fixed right-0 top-0 h-full bg-white shadow-xl transition-transform z-40 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`} style={{ width: '420px' }}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Social Media Analysis</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-full pb-20">
        <div className="p-4 space-y-4">
          {/* Platform & Basic Info */}
          <div>
            {/* Thumbnail */}
            {element.thumbnail && (
              <img 
                src={element.thumbnail} 
                alt={element.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            
            {/* Platform Badge & URL */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={element.platform || 'unknown'} />
                <span className="font-medium capitalize">{element.platform || 'Unknown'}</span>
              </div>
              <a 
                href={element.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <span>View Original</span>
                <ExternalLink size={14} />
              </a>
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-gray-900 mb-2">
              {contentPiece?.title || element.title || 'Untitled Content'}
            </h3>

            {/* URL */}
            <p className="text-xs text-gray-500 truncate">{element.url}</p>
          </div>

          {/* Status Messages */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 size={16} className="animate-spin" />
                <span className="font-medium">Analysis in progress...</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                This may take 30-60 seconds. The panel will update automatically.
              </p>
            </div>
          )}

          {isFailed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={16} />
                  <span className="font-medium">Analysis failed</span>
                </div>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
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
                <p className="text-sm text-red-600 mt-1">{element.metadata.error}</p>
              )}
            </div>
          )}

          {/* Content Metrics */}
          {!isProcessing && !isFailed && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Content Metrics</h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  icon={<Eye size={16} />} 
                  label="Views" 
                  value={formatNumber(socialMediaContent?.view_count || contentPiece?.viewCount)}
                  loading={loading}
                />
                <MetricCard 
                  icon={<ThumbsUp size={16} />} 
                  label="Likes" 
                  value={formatNumber(socialMediaContent?.like_count || contentPiece?.likeCount)}
                  loading={loading}
                />
                <MetricCard 
                  icon={<MessageSquare size={16} />} 
                  label="Comments" 
                  value={formatNumber(socialMediaContent?.comment_count || contentPiece?.commentCount)}
                  loading={loading}
                />
                <MetricCard 
                  icon={<Share2 size={16} />} 
                  label="Shares" 
                  value={formatNumber(socialMediaContent?.share_count || 0)}
                  loading={loading}
                />
              </div>
              
              {/* Engagement Rate */}
              {socialMediaContent?.view_count && (
                <div className="mt-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700">
                      <BarChart3 size={16} />
                      <span className="text-sm font-medium">Engagement Rate</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-700">
                      {calculateEngagementRate(
                        socialMediaContent.like_count,
                        socialMediaContent.comment_count,
                        socialMediaContent.share_count,
                        socialMediaContent.view_count
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Creator Information */}
          {socialMediaContent?.author_username && !isProcessing && !isFailed && (
            <AnalysisSection 
              title="Creator Information" 
              icon={<Users size={18} className="text-gray-600" />}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {socialMediaContent.author_avatar_url && (
                      <img 
                        src={socialMediaContent.author_avatar_url} 
                        alt={socialMediaContent.author_name || socialMediaContent.author_username}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {socialMediaContent.author_name || socialMediaContent.author_username}
                        </p>
                        {socialMediaContent.author_metadata?.verified && (
                          <UserCheck size={16} className="text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">@{socialMediaContent.author_username}</p>
                    </div>
                  </div>
                  {socialMediaContent.author_profile_url && (
                    <a 
                      href={socialMediaContent.author_profile_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                
                {socialMediaContent.author_metadata?.follower_count && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={14} />
                    <span>{formatNumber(socialMediaContent.author_metadata.follower_count)} followers</span>
                  </div>
                )}
                
                {socialMediaContent.author_metadata?.description && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                    {socialMediaContent.author_metadata.description}
                  </p>
                )}
              </div>
            </AnalysisSection>
          )}

          {/* AI Analysis Results */}
          {analysis && !isProcessing && !isFailed && (
            <>
              {/* Hook Analysis */}
              {analysis.hook_analysis && (
                <AnalysisSection 
                  title="Hook Analysis" 
                  icon={<TrendingUp size={18} className="text-gray-600" />}
                >
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Effectiveness Score</p>
                        <span className="text-lg font-semibold text-blue-600">
                          {Math.round((analysis.hook_analysis.effectiveness_score || 0) * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Type: <span className="font-medium">{analysis.hook_analysis.hook_type}</span>
                      </p>
                    </div>
                    
                    {analysis.hook_analysis.emotional_triggers?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Emotional Triggers</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.hook_analysis.emotional_triggers.map((trigger, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysis.hook_analysis.improvements?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">Suggested Improvements</p>
                          <CopyButton text={analysis.hook_analysis.improvements.join('\n')} />
                        </div>
                        <ul className="space-y-1">
                          {analysis.hook_analysis.improvements.map((improvement, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-gray-400 mt-0.5">•</span>
                              <span>{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AnalysisSection>
              )}

              {/* Body Analysis */}
              {analysis.body_analysis && (
                <AnalysisSection 
                  title="Body Analysis" 
                  icon={<BarChart3 size={18} className="text-gray-600" />}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Structure Type</p>
                        <p className="text-sm font-medium capitalize">
                          {analysis.body_analysis.structure_type?.replace('-', ' ')}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Flow Score</p>
                        <p className="text-sm font-medium">
                          {Math.round((analysis.body_analysis.flow_score || 0) * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    {analysis.body_analysis.key_points?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">Key Points</p>
                          <CopyButton text={analysis.body_analysis.key_points.join('\n')} />
                        </div>
                        <ul className="space-y-1">
                          {analysis.body_analysis.key_points.map((point, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.body_analysis.pacing_analysis && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Pacing Analysis</p>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Intro</span>
                            <span>{analysis.body_analysis.pacing_analysis.intro_length}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Main Content</span>
                            <span>{analysis.body_analysis.pacing_analysis.main_content_length}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Conclusion</span>
                            <span>{analysis.body_analysis.pacing_analysis.conclusion_length}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AnalysisSection>
              )}

              {/* CTA Analysis */}
              {analysis.cta_analysis && (
                <AnalysisSection 
                  title="Call-to-Action Analysis" 
                  icon={<MessageSquare size={18} className="text-gray-600" />}
                >
                  <div className="space-y-3">
                    {analysis.cta_analysis.primary_cta && (
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">Primary CTA</p>
                          <CopyButton text={analysis.cta_analysis.primary_cta} />
                        </div>
                        <p className="text-sm text-gray-900 font-medium">
                          "{analysis.cta_analysis.primary_cta}"
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-gray-600">
                            Strength: <span className="font-medium capitalize">{analysis.cta_analysis.cta_strength}</span>
                          </span>
                          <span className="text-gray-600">
                            Urgency: <span className="font-medium capitalize">{analysis.cta_analysis.urgency_level}</span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {analysis.cta_analysis.secondary_ctas?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Secondary CTAs</p>
                        <ul className="space-y-1">
                          {analysis.cta_analysis.secondary_ctas.map((cta, i) => (
                            <li key={i} className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                              {cta}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.cta_analysis.recommendations?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommendations</p>
                        <ul className="space-y-1">
                          {analysis.cta_analysis.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AnalysisSection>
              )}
            </>
          )}

          {/* Raw Data */}
          {!isProcessing && !isFailed && (analysis || socialMediaContent) && (
            <div className="border-t pt-4">
              <button
                onClick={() => setRawDataOpen(!rawDataOpen)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900">Raw Data</h3>
                {rawDataOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {rawDataOpen && (
                <div className="mt-3 space-y-3">
                  {socialMediaContent && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-700">Social Media Content</p>
                        <CopyButton text={JSON.stringify(socialMediaContent, null, 2)} />
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                        <code>{JSON.stringify(socialMediaContent, null, 2)}</code>
                      </pre>
                    </div>
                  )}
                  
                  {analysis && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-700">Analysis Data</p>
                        <CopyButton text={JSON.stringify(analysis, null, 2)} />
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                        <code>{JSON.stringify(analysis, null, 2)}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && !isProcessing && !analysis && !socialMediaContent && (
            <div className="text-center py-8">
              <AlertCircle size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No analysis data available</p>
              <button
                onClick={handleRetry}
                className="mt-3 text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto text-sm"
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};