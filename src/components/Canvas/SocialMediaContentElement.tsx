// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Instagram, Youtube, Music2, Loader2, AlertCircle, RefreshCw, CheckCircle, Clock, Globe } from 'lucide-react';
import { TikTokDarkIcon } from '../icons/PngIcons';
import { useCanvasStore } from '@/store/canvasStore';
import { supabase } from '@/lib/supabase/client';
import type { SocialMediaJob } from '@/types/social-media';

interface SocialMediaContentElementProps {
  element: {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    title?: string;
    url?: string;
    platform?: string;
    thumbnail?: string;
    metadata?: {
      webhookToken?: string;
      analysisCondition?: string;
      contentScope?: string;
      jobStatus?: string;
      jobId?: string;
      error?: string;
      startedAt?: string;
      completedAt?: string;
      resultData?: any;
      contentPiece?: any;
    };
  };
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
  viewTransform: { scale: number };
}

const platformIcons = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: TikTokDarkIcon,
};

const platformColors = {
  youtube: '#FF0000',
  instagram: '#E4405F',
  tiktok: '#000000',
};

const statusMessages = {
  creating: 'Creating job...',
  pending: 'Queued for processing',
  processing: 'Analyzing content',
  completed: 'Analysis complete',
  failed: 'Analysis failed',
  cancelled: 'Analysis cancelled',
};

export const SocialMediaContentElement: React.FC<SocialMediaContentElementProps> = ({
  element,
  isSelected,
  onSelect,
  onDoubleClick,
  viewTransform
}) => {
  const updateElement = useCanvasStore((state) => state.updateElement);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [job, setJob] = useState<SocialMediaJob | null>(null);

  const PlatformIcon = element.platform ? platformIcons[element.platform as keyof typeof platformIcons] : Globe;
  const platformColor = element.platform ? platformColors[element.platform as keyof typeof platformColors] : '#666';
  const jobStatus = element.metadata?.jobStatus || 'creating';
  const isProcessing = ['creating', 'pending', 'processing'].includes(jobStatus);
  const isCompleted = jobStatus === 'completed';
  const isFailed = jobStatus === 'failed';

  // Calculate elapsed time
  useEffect(() => {
    if (!isProcessing || !element.metadata?.startedAt) return;

    const interval = setInterval(() => {
      const startTime = new Date(element.metadata.startedAt!).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, element.metadata?.startedAt]);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Subscribe to job updates
  useEffect(() => {
    if (!element.metadata?.jobId) return;

    const subscription = supabase
      .channel(`job-${element.metadata.jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_jobs',
          filter: `id=eq.${element.metadata.jobId}`
        },
        (payload) => {
          const updatedJob = payload.new as SocialMediaJob;
          setJob(updatedJob);
          
          // Update element metadata with job status
          updateElement(element.id, {
            metadata: {
              ...element.metadata,
              jobStatus: updatedJob.status,
              error: updatedJob.error_message,
              resultData: updatedJob.result_data,
              completedAt: updatedJob.completed_at
            }
          });

          // If job completed, fetch the content piece
          if (updatedJob.status === 'completed' && updatedJob.result_data?.content_piece_id) {
            fetchContentPiece(updatedJob.result_data.content_piece_id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [element.metadata?.jobId, element.id, updateElement]);

  const fetchContentPiece = async (contentPieceId: string) => {
    try {
      const { data, error } = await supabase
        .from('content_pieces')
        .select('*')
        .eq('id', contentPieceId)
        .single();

      if (error) throw error;

      // Update element with content data
      updateElement(element.id, {
        title: data.title || element.title,
        thumbnail: data.thumbnail_url || element.thumbnail,
        metadata: {
          ...element.metadata,
          contentPiece: data
        }
      });
    } catch (error) {
      console.error('Failed to fetch content piece:', error);
    }
  };

  const handleRetry = async () => {
    if (!element.metadata?.webhookToken || !element.url) return;

    // Reset status
    updateElement(element.id, {
      metadata: {
        ...element.metadata,
        jobStatus: 'creating',
        error: null,
        startedAt: new Date().toISOString()
      }
    });

    try {
      const response = await fetch('/api/webhooks/make', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${element.metadata.webhookToken}`
        },
        body: JSON.stringify({
          action: 'job.create',
          timestamp: new Date().toISOString(),
          execution_id: `retry_${Date.now()}`,
          scenario_id: 'manual_analysis',
          content: {
            url: element.url,
            platform: element.platform,
            metadata: {
              analysis_condition: element.metadata.analysisCondition,
              content_scope: element.metadata.contentScope,
              source: 'canvas_tool_retry',
              element_id: element.id
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to retry analysis');
      }

      const result = await response.json();
      
      updateElement(element.id, {
        metadata: {
          ...element.metadata,
          jobId: result.job_id,
          jobStatus: 'pending'
        }
      });
    } catch (error) {
      updateElement(element.id, {
        metadata: {
          ...element.metadata,
          jobStatus: 'failed',
          error: 'Failed to retry analysis'
        }
      });
    }
  };

  // Timeout warning
  const showTimeoutWarning = isProcessing && elapsedTime > 90;

  return (
    <div
      className={`absolute bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:shadow-xl'
      }`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        cursor: 'pointer'
      }}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onDoubleClick) {
          onDoubleClick();
        }
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ backgroundColor: `${platformColor}10` }}
      >
        <div className="flex items-center gap-2">
          <PlatformIcon size={20} style={{ color: platformColor }} />
          <span className="font-medium text-sm truncate">
            {element.title || 'Social Media Analysis'}
          </span>
        </div>
        {isProcessing && (
          <Loader2 size={16} className="animate-spin text-gray-500" />
        )}
        {isCompleted && (
          <CheckCircle size={16} className="text-green-500" />
        )}
        {isFailed && (
          <AlertCircle size={16} className="text-red-500" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Thumbnail or Status Display */}
        {element.thumbnail && isCompleted ? (
          <img 
            src={element.thumbnail} 
            alt={element.title}
            className="w-full h-32 object-cover rounded mb-3"
          />
        ) : (
          <div className="h-32 bg-gray-50 rounded flex items-center justify-center mb-3">
            {isProcessing && (
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{statusMessages[jobStatus]}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTime(elapsedTime)}</p>
              </div>
            )}
            {isCompleted && !element.thumbnail && (
              <div className="text-center">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Analysis Complete</p>
              </div>
            )}
            {isFailed && (
              <div className="text-center">
                <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">Analysis Failed</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry();
                  }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* URL Display */}
        <div className="mb-2">
          <p className="text-xs text-gray-500 truncate">{element.url}</p>
        </div>

        {/* Analysis Info */}
        {element.metadata?.analysisCondition && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              {element.metadata.contentScope === 'profile' ? 'Profile' : 'Content'} Analysis
            </span>
            <span className="text-gray-500 capitalize">
              {element.metadata.analysisCondition}
            </span>
          </div>
        )}

        {/* Timeout Warning */}
        {showTimeoutWarning && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="flex items-center gap-1 text-yellow-700">
              <Clock size={12} />
              <span>Analysis taking longer than expected</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {element.metadata?.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {element.metadata.error}
          </div>
        )}

        {/* Result Preview (if completed) */}
        {isCompleted && element.metadata?.contentPiece && (
          <div className="mt-3 pt-3 border-t">
            <h4 className="text-xs font-semibold text-gray-700 mb-1">Quick Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {element.metadata.contentPiece.view_count && (
                <div>
                  <span className="text-gray-500">Views:</span>
                  <span className="ml-1 font-medium">
                    {element.metadata.contentPiece.view_count.toLocaleString()}
                  </span>
                </div>
              )}
              {element.metadata.contentPiece.like_count && (
                <div>
                  <span className="text-gray-500">Likes:</span>
                  <span className="ml-1 font-medium">
                    {element.metadata.contentPiece.like_count.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};