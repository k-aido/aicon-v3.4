import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { ContentElement } from '@/types';

interface ContentAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string | null;
  content: ContentElement | null;
}

interface AnalysisData {
  hook: string;
  body: string[];
  callToAction: string;
  summary?: string;
}

export const ContentAnalysisPanel: React.FC<ContentAnalysisPanelProps> = ({
  isOpen,
  onClose,
  contentId,
  content
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const contentWithAnalysis = content as any;
    if (contentWithAnalysis?.analysis) {
      // Transform the analysis data to match our expected format
      const analysis = contentWithAnalysis.analysis;
      setAnalysisData({
        hook: analysis.hook || analysis.summary || "This content demonstrates strong engagement potential.",
        body: analysis.body || analysis.keyPoints || [],
        callToAction: analysis.callToAction || "Implement similar strategies to boost your content performance."
      });
      setIsLoading(false);
      setError(null);
    } else if (contentId && isOpen && !contentWithAnalysis?.analysis) {
      // Simulate loading if no analysis exists
      setIsLoading(true);
      setError(null);
      
      // Simulate API call delay
      setTimeout(() => {
        setAnalysisData({
          hook: "This captivating piece grabs attention with its unique perspective and engaging visual storytelling.",
          body: [
            "The content demonstrates strong audience appeal through its authentic approach",
            "Visual elements are well-composed and maintain viewer interest throughout",
            "Narrative structure follows proven engagement patterns for the platform",
            "Use of trending elements increases discoverability without sacrificing originality"
          ],
          callToAction: "Consider incorporating similar storytelling techniques in your content strategy to boost engagement and reach."
        });
        setIsLoading(false);
      }, 1500);
    }
  }, [contentId, content, isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-[400px] bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Content Analysis</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400">Analyzing content...</p>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            ) : content && analysisData ? (
              <div className="space-y-6">
                {/* Thumbnail */}
                {content.thumbnail && (
                  <div className="w-full rounded-lg overflow-hidden bg-gray-800">
                    <img 
                      src={content.thumbnail} 
                      alt={content.title}
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Thumbnail';
                      }}
                    />
                  </div>
                )}
                
                {/* Title */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">{content.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="capitalize">{content.platform}</span>
                    <span>•</span>
                    <a 
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                      View original
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                {/* Analysis Sections */}
                <div className="space-y-6">
                  {/* Hook */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      HOOK
                    </h4>
                    <p className="text-gray-100 leading-relaxed">
                      {analysisData.hook || 'No hook analysis available'}
                    </p>
                  </div>
                  
                  {/* Body */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      BODY
                    </h4>
                    {analysisData.body && analysisData.body.length > 0 ? (
                      <ul className="space-y-2">
                        {analysisData.body.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span className="text-gray-100 leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic">No body analysis available</p>
                    )}
                  </div>
                  
                  {/* Call to Action */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      CALL TO ACTION
                    </h4>
                    <p className="text-gray-100 leading-relaxed">
                      {analysisData.callToAction || 'No call to action available'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 mt-8">
                <p>No content selected</p>
              </div>
            )}
          </div>
          
          {/* Footer with View Original button */}
          {content && !isLoading && !error && (
            <div className="p-6 border-t border-gray-800">
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                View Original
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
};