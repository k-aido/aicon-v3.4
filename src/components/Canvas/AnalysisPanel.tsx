import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Play, RefreshCw, Copy, Check } from 'lucide-react';
import { ContentAnalysis, VideoTranscript, AnalysisPanelProps } from '@/types/analysis';

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  contentId,
  analysis,
  transcript,
  status,
  onReanalyze,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    hook: false,
    body: false,
    cta: false,
    transcript: false
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'analyzing': return 'text-yellow-500';
      case 'transcribing': return 'text-blue-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Analysis Complete';
      case 'analyzing': return 'Analyzing Content...';
      case 'transcribing': return 'Transcribing Video...';
      case 'failed': return 'Analysis Failed';
      default: return 'Pending Analysis';
    }
  };

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'high': return 'text-green-500 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getClarityColor = (clarity: string) => {
    switch (clarity) {
      case 'high': return 'text-green-500 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  // Handle click outside to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Content Analysis</h2>
            <p className={`text-sm ${getStatusColor(status)} flex items-center gap-2`}>
              {status === 'analyzing' || status === 'transcribing' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : null}
              {getStatusText(status)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={onReanalyze}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Re-analyze
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {status === 'pending' && (
            <div className="p-6 text-center">
              <div className="text-gray-500 mb-4">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <p>Start analysis to see detailed breakdown</p>
              </div>
              <button
                onClick={onReanalyze}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Start Analysis
              </button>
            </div>
          )}

          {(status === 'analyzing' || status === 'transcribing') && (
            <div className="p-6 text-center">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
              <p className="text-gray-600">
                {status === 'transcribing' ? 'Extracting video transcript...' : 'Analyzing content structure...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <X className="w-12 h-12 mx-auto mb-2" />
                <p>Analysis failed</p>
              </div>
              <button
                onClick={onReanalyze}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {status === 'completed' && analysis && (
            <div className="p-6 space-y-6">
              {/* Summary Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('summary')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.summary ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <h3 className="font-semibold text-gray-900">Summary</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(analysis.summary, 'summary');
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copiedField === 'summary' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </button>
                {expandedSections.summary && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                  </div>
                )}
              </div>

              {/* Hook Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('hook')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.hook ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <h3 className="font-semibold text-gray-900">Hook Analysis</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getEffectivenessColor(analysis.hook.effectiveness)}`}>
                      {analysis.hook.effectiveness} effectiveness
                    </span>
                  </div>
                </button>
                {expandedSections.hook && (
                  <div className="px-4 pb-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Hook Text</h4>
                      <div className="flex items-start justify-between">
                        <p className="text-gray-700 italic bg-gray-50 p-3 rounded-md flex-1">
                          "{analysis.hook.text}"
                        </p>
                        <button
                          onClick={() => copyToClipboard(analysis.hook.text, 'hook-text')}
                          className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedField === 'hook-text' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Analysis</h4>
                      <p className="text-gray-700 leading-relaxed">{analysis.hook.analysis}</p>
                    </div>
                    {analysis.hook.techniques.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Techniques Used</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.hook.techniques.map((technique, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {technique}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Body Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('body')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.body ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <h3 className="font-semibold text-gray-900">Body Analysis</h3>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                      {analysis.body.structure}
                    </span>
                  </div>
                </button>
                {expandedSections.body && (
                  <div className="px-4 pb-4 space-y-4">
                    {analysis.body.mainPoints.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Main Points</h4>
                        <ul className="space-y-2">
                          {analysis.body.mainPoints.map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Structure Analysis</h4>
                      <p className="text-gray-700 leading-relaxed">{analysis.body.analysis}</p>
                    </div>
                    {analysis.body.engagement.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Engagement Techniques</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.body.engagement.map((technique, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                            >
                              {technique}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CTA Section */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('cta')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.cta ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <h3 className="font-semibold text-gray-900">Call-to-Action Analysis</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getClarityColor(analysis.cta.clarity)}`}>
                      {analysis.cta.clarity} clarity
                    </span>
                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                      {analysis.cta.type}
                    </span>
                  </div>
                </button>
                {expandedSections.cta && (
                  <div className="px-4 pb-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">CTA Text</h4>
                      <div className="flex items-start justify-between">
                        <p className="text-gray-700 italic bg-gray-50 p-3 rounded-md flex-1">
                          "{analysis.cta.text}"
                        </p>
                        <button
                          onClick={() => copyToClipboard(analysis.cta.text, 'cta-text')}
                          className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedField === 'cta-text' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Analysis</h4>
                      <p className="text-gray-700 leading-relaxed">{analysis.cta.analysis}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript Section */}
              {transcript && (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('transcript')}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.transcript ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                      <h3 className="font-semibold text-gray-900">Video Transcript</h3>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                        {transcript.source}
                      </span>
                    </div>
                  </button>
                  {expandedSections.transcript && (
                    <div className="px-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="bg-gray-50 p-4 rounded-md flex-1 max-h-64 overflow-y-auto">
                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {transcript.text}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(transcript.text, 'transcript')}
                          className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {copiedField === 'transcript' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {transcript.confidence && (
                        <p className="text-xs text-gray-500 mt-2">
                          Confidence: {Math.round(transcript.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {analysis.metadata && (
                <div className="text-xs text-gray-500 border-t pt-4">
                  <p>
                    Analyzed with {analysis.metadata.aiModel} • 
                    Processing time: {analysis.metadata.processingTime}ms • 
                    Cost: {analysis.metadata.costCredits} credits
                  </p>
                  <p>Analyzed on {new Date(analysis.metadata.analyzedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};