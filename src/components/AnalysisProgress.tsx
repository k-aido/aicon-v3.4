import React, { useState, useEffect } from 'react';
import { Loader2, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  startTime?: number;
  stage?: 'extracting' | 'analyzing' | 'complete' | 'error';
  extractionMethod?: string;
  fallbackUsed?: boolean;
  error?: string;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  isAnalyzing,
  startTime,
  stage = 'extracting',
  extractionMethod,
  fallbackUsed,
  error
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState(0);

  useEffect(() => {
    if (!isAnalyzing || !startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      setElapsed(elapsedMs);

      // Estimate remaining time based on stage
      let totalEstimate = 15000; // 15 seconds default
      
      if (stage === 'extracting') {
        // Content extraction: 2-15 seconds depending on method
        if (extractionMethod === 'youtube-transcript') totalEstimate = 8000;
        else if (extractionMethod === 'web-scraping') totalEstimate = 12000;
        else if (extractionMethod === 'instagram-oembed') totalEstimate = 6000;
        else totalEstimate = 10000;
      } else if (stage === 'analyzing') {
        // AI analysis: 3-10 seconds typically
        totalEstimate = elapsedMs + 7000;
      }

      const remaining = Math.max(0, totalEstimate - elapsedMs);
      setEstimatedRemaining(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [isAnalyzing, startTime, stage, extractionMethod]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getStageInfo = () => {
    switch (stage) {
      case 'extracting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
          text: 'Extracting content...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'analyzing':
        return {
          icon: <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />,
          text: 'AI analyzing content...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
      case 'complete':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: 'Analysis complete',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: 'Analysis failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-gray-500" />,
          text: 'Processing...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const stageInfo = getStageInfo();

  if (!isAnalyzing && stage !== 'complete' && stage !== 'error') {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${stageInfo.bgColor} ${stageInfo.color}`}>
      {stageInfo.icon}
      
      <span className="font-medium">{stageInfo.text}</span>
      
      {isAnalyzing && elapsed > 0 && (
        <div className="flex items-center space-x-1 text-xs opacity-75">
          <Clock className="w-3 h-3" />
          <span>{formatTime(elapsed)}</span>
          {estimatedRemaining > 0 && stage !== 'complete' && (
            <span>/ ~{formatTime(estimatedRemaining)}</span>
          )}
        </div>
      )}
      
      {fallbackUsed && (
        <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">
          Fallback
        </span>
      )}
      
      {extractionMethod && (
        <span className="text-xs opacity-60">
          {extractionMethod.replace('-', ' ')}
        </span>
      )}
      
      {error && stage === 'error' && (
        <span className="text-xs max-w-xs truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
};

export default AnalysisProgress;