import { useState, useCallback } from 'react';

interface ScrapingResult {
  success: boolean;
  scrapeId?: string;
  analysisData?: any;
  error?: string;
}

interface UseContentScrapingProps {
  onScrapingStart?: () => void;
  onScrapingComplete?: (data: any) => void;
  onAnalysisComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useContentScraping = ({
  onScrapingStart,
  onScrapingComplete,
  onAnalysisComplete,
  onError
}: UseContentScrapingProps = {}) => {
  const [isScraping, setIsScraping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  const scrapeContent = useCallback(async (
    elementId: string | number,
    url: string,
    projectId: string,
    platform: string
  ): Promise<ScrapingResult> => {
    setIsScraping(true);
    setScrapingError(null);
    
    if (onScrapingStart) {
      onScrapingStart();
    }

    try {
      // Start scraping
      const scrapeResponse = await fetch('/api/content/scrape-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementId, url, projectId, platform })
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        throw new Error(scrapeData.error || 'Failed to start scraping');
      }

      // If content was cached, it's already complete
      if (scrapeData.cached && scrapeData.status === 'completed') {
        setIsScraping(false);
        setIsAnalyzing(true);
        
        // Proceed directly to analysis
        const analysisResult = await analyzeContent(scrapeData.scrapeId);
        return analysisResult;
      }

      // Poll for scraping completion
      const scrapedData = await pollScrapeStatus(scrapeData.scrapeId);
      
      if (onScrapingComplete) {
        onScrapingComplete(scrapedData);
      }

      setIsScraping(false);
      setIsAnalyzing(true);

      // Analyze the scraped content
      const analysisResult = await analyzeContent(scrapeData.scrapeId);
      
      return analysisResult;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to scrape content';
      setScrapingError(errorMessage);
      setIsScraping(false);
      setIsAnalyzing(false);
      
      if (onError) {
        onError(errorMessage);
      }
      
      return { success: false, error: errorMessage };
    }
  }, [onScrapingStart, onScrapingComplete, onError]);

  const pollScrapeStatus = async (scrapeId: string, maxAttempts = 30): Promise<any> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/content/scrape/${scrapeId}/status`);
      const data = await response.json();

      if (data.status === 'completed') {
        return data.processedData;
      }

      if (data.status === 'failed') {
        throw new Error(data.error || 'Scraping failed');
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Scraping timeout - please try again');
  };

  const analyzeContent = async (scrapeId: string): Promise<ScrapingResult> => {
    try {
      const response = await fetch(`/api/content/analyze/${scrapeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addToLibrary: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze content');
      }

      setIsAnalyzing(false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }

      return {
        success: true,
        scrapeId,
        analysisData: data.analysis
      };

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to analyze content';
      setScrapingError(errorMessage);
      setIsAnalyzing(false);
      
      throw error;
    }
  };

  const reset = useCallback(() => {
    setIsScraping(false);
    setIsAnalyzing(false);
    setScrapingError(null);
  }, []);

  return {
    scrapeContent,
    isScraping,
    isAnalyzing,
    scrapingError,
    reset
  };
};