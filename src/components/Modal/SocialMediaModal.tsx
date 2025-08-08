import React, { useState } from 'react';
import { X, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { detectPlatform } from '@/utils/platform';
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();

interface SocialMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform?: string;
}

type ContentScope = 'single' | 'profile';

export const SocialMediaModal: React.FC<SocialMediaModalProps> = ({ isOpen, onClose, platform }) => {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addElement, elements } = useCanvasStore();

  // Detect platform and content type from URL
  const detectContentInfo = (inputUrl: string) => {
    const platform = detectPlatform(inputUrl);
    let scope: ContentScope = 'single';
    
    // Profile URL patterns
    const profilePatterns = {
      youtube: /youtube\.com\/@[\w-]+$/,
      instagram: /instagram\.com\/[\w.]+\/?$/,
      tiktok: /tiktok\.com\/@[\w.-]+\/?$/,
    };

    if (platform && profilePatterns[platform as keyof typeof profilePatterns]?.test(inputUrl)) {
      scope = 'profile';
    }

    return { platform, scope };
  };

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      const platform = detectPlatform(inputUrl);
      return ['youtube', 'instagram', 'tiktok'].includes(platform || '');
    } catch {
      return false;
    }
  };

  const generateId = (): number => {
    return elements.length > 0 ? Math.max(...elements.map(el => el.id)) + 1 : 1;
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!validateUrl(url)) {
      setError('Please enter a valid YouTube, Instagram, or TikTok URL');
      return;
    }

    setIsSubmitting(true);

    try {
      const { platform: detectedPlatform, scope } = detectContentInfo(url);
      const webhookToken = `svc_webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create social media element with pending state
      const newElement = {
        id: generateId(),
        type: 'content' as const,
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        width: 320,
        height: 280,
        title: `${detectedPlatform} ${scope === 'profile' ? 'Profile' : 'Content'} Analysis`,
        url: url.trim(),
        platform: detectedPlatform,
        metadata: {
          webhookToken,
          contentScope: scope,
          jobStatus: 'creating',
          jobId: null,
          error: null,
          startedAt: new Date().toISOString()
        }
      };

      addElement(newElement);

      // Call webhook API to create job
      const response = await fetch('/api/webhooks/make', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${webhookToken}`
        },
        body: JSON.stringify({
          action: 'job.create',
          timestamp: new Date().toISOString(),
          execution_id: `manual_${Date.now()}`,
          scenario_id: 'manual_analysis',
          content: {
            url: url.trim(),
            platform: detectedPlatform,
            metadata: {
              content_scope: scope,
              source: 'canvas_tool',
              element_id: newElement.id
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create analysis job');
      }

      const result = await response.json();
      
      // Update element with job ID
      const canvasStore = useCanvasStore.getState();
      canvasStore.updateElement(newElement.id, {
        metadata: {
          ...newElement.metadata,
          jobId: result.job_id,
          jobStatus: 'pending'
        }
      });

      // Close modal and reset
      onClose();
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create analysis job');
      
      // Remove element if job creation failed
      const canvasStore = useCanvasStore.getState();
      canvasStore.deleteElement(generateId() - 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const { platform: detectedPlatform, scope } = detectContentInfo(url);
  const isValidUrl = url && validateUrl(url);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[480px] max-w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 text-center">
            <h3 className="text-xl font-semibold">Social Media Analysis</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Info Box - moved above URL input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-1">How it works</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enter a URL from Instagram, TikTok, or YouTube</li>
              <li>• Auto-detects if it's a single post or profile</li>
              <li>• Creates a canvas element to track progress</li>
              <li>• Analysis typically takes 30-60 seconds</li>
            </ul>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/... or https://tiktok.com/@username"
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  error 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                autoFocus
              />
              <div className="absolute right-3 top-2.5">
                {url && (
                  <div className={`text-sm ${isValidUrl ? 'text-green-600' : 'text-gray-400'}`}>
                    {detectedPlatform ? (
                      <span className="capitalize">{detectedPlatform}</span>
                    ) : (
                      <Globe size={18} />
                    )}
                  </div>
                )}
              </div>
            </div>
            {url && isValidUrl && (
              <p className="text-sm text-gray-600 mt-2">
                Detected: {detectedPlatform} {scope === 'profile' ? 'Profile' : 'Content'}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValidUrl || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Job...
              </>
            ) : (
              'Add to Canvas'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};