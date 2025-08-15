import React, { useState } from 'react';
import { Loader2, Link2, CheckCircle, AlertCircle, Youtube, Instagram, Music, Sparkles } from 'lucide-react';

interface ContentScraperProps {
  projectId: string;
  onAnalysisComplete?: (analysisData: any) => void;
  onAddToCanvas?: (content: any) => void;
}

type Platform = 'youtube' | 'instagram' | 'tiktok' | null;
type Status = 'idle' | 'scraping' | 'analyzing' | 'completed' | 'error';

const ContentScraper: React.FC<ContentScraperProps> = ({ 
  projectId, 
  onAnalysisComplete,
  onAddToCanvas 
}) => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scrapeId, setScrapeId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [processedData, setProcessedData] = useState<any>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>(null);

  // Detect platform from URL
  const detectPlatform = (inputUrl: string): Platform => {
    try {
      const urlObj = new URL(inputUrl);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return 'youtube';
      }
      if (hostname.includes('instagram.com')) {
        return 'instagram';
      }
      if (hostname.includes('tiktok.com')) {
        return 'tiktok';
      }
    } catch {
      // Invalid URL
    }
    return null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setDetectedPlatform(detectPlatform(newUrl));
    setError(null);
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-500" />;
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'tiktok':
        return <Music className="w-5 h-5 text-black" />;
      default:
        return <Link2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const startScraping = async () => {
    if (!url || !detectedPlatform) {
      setError('Please enter a valid YouTube, Instagram, or TikTok URL');
      return;
    }

    setStatus('scraping');
    setError(null);

    try {
      // Start scraping
      const scrapeResponse = await fetch('/api/content/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, projectId })
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        // Handle insufficient credits
        if (scrapeResponse.status === 402) {
          throw new Error(scrapeData.error || 'Insufficient credits for scraping');
        }
        throw new Error(scrapeData.error || 'Failed to start scraping');
      }

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Scraping failed');
      }

      setScrapeId(scrapeData.scrapeId);

      // If content was cached, it's already complete
      if (scrapeData.cached && scrapeData.status === 'completed') {
        setStatus('analyzing');
        await analyzeContent(scrapeData.scrapeId);
        return;
      }

      // Poll for scraping completion
      await pollScrapeStatus(scrapeData.scrapeId);

    } catch (err: any) {
      console.error('Scraping error:', err);
      setError(err.message || 'Failed to scrape content');
      setStatus('error');
    }
  };

  const pollScrapeStatus = async (id: string) => {
    const maxAttempts = 30; // 30 seconds timeout
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/content/scrape/${id}/status`);
        const data = await response.json();

        if (data.status === 'completed') {
          setProcessedData(data.processedData);
          setStatus('analyzing');
          
          // Trigger credit update if credits were deducted
          if (data.creditsDeducted) {
            window.dispatchEvent(new Event('creditUpdate'));
          }
          
          await analyzeContent(id);
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Scraping failed');
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000); // Check every second
        } else {
          throw new Error('Scraping timeout - please try again');
        }
      } catch (err: any) {
        console.error('Status check error:', err);
        setError(err.message || 'Failed to check scraping status');
        setStatus('error');
      }
    };

    await checkStatus();
  };

  const analyzeContent = async (scrapeIdToAnalyze: string) => {
    try {
      const response = await fetch(`/api/content/analyze/${scrapeIdToAnalyze}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addToLibrary: true })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle insufficient credits
        if (response.status === 402) {
          throw new Error(data.error || 'Insufficient credits for analysis');
        }
        throw new Error(data.error || 'Failed to analyze content');
      }

      setAnalysisData(data.analysis);
      setStatus('completed');
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze content');
      setStatus('error');
    }
  };

  const handleAddToCanvas = () => {
    if (onAddToCanvas && analysisData && processedData) {
      onAddToCanvas({
        type: 'content',
        url: url,
        platform: detectedPlatform,
        title: analysisData.title || processedData.title,
        thumbnail: processedData.thumbnailUrl,
        analysis: analysisData,
        metadata: processedData
      });
    }
  };

  const reset = () => {
    setUrl('');
    setStatus('idle');
    setError(null);
    setScrapeId(null);
    setAnalysisData(null);
    setProcessedData(null);
    setDetectedPlatform(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Scraper & Analyzer</h2>
        <p className="text-gray-600">
          Analyze content from YouTube, Instagram, or TikTok to understand what makes it successful
        </p>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="Paste a YouTube, Instagram, or TikTok URL..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getPlatformIcon(detectedPlatform)}
              </div>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            onClick={startScraping}
            disabled={!url || !detectedPlatform}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Scrape & Analyze Content
            </span>
          </button>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Youtube className="w-4 h-4 text-red-500" />
              YouTube
            </span>
            <span className="flex items-center gap-1">
              <Instagram className="w-4 h-4 text-pink-500" />
              Instagram
            </span>
            <span className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              TikTok
            </span>
          </div>
        </div>
      )}

      {status === 'scraping' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Scraping Content...</h3>
          <p className="text-gray-600">Fetching content data from {detectedPlatform}</p>
        </div>
      )}

      {status === 'analyzing' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Content...</h3>
          <p className="text-gray-600">Using AI to extract insights and patterns</p>
        </div>
      )}

      {status === 'completed' && analysisData && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Analysis Complete!</span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📝 Title</h3>
              <p className="text-gray-700">{analysisData.title || 'Untitled'}</p>
            </div>

            {analysisData.metrics && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">📊 Metrics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {analysisData.metrics.views?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-600">Views</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {analysisData.metrics.likes?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-600">Likes</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {analysisData.metrics.comments?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-600">Comments</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Hook Analysis</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                {analysisData.hook_analysis}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📚 Key Topics</h3>
              <div className="flex flex-wrap gap-2">
                {analysisData.key_topics?.map((topic: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">💡 Engagement Tactics</h3>
              <ul className="space-y-1">
                {analysisData.engagement_tactics?.map((tactic: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>{tactic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            {onAddToCanvas && (
              <button
                onClick={handleAddToCanvas}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Add to Canvas
              </button>
            )}
            <button
              onClick={reset}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Analyze Another
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={reset}
            className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentScraper;