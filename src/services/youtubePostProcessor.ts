import YouTubeCaptionService from './youtubeCaptionService';
import YouTubeTranscriptionService from './youtubeTranscriptionService';
import { ScrapedContent } from './apifyService';

interface YouTubePostProcessorOptions {
  preferCaptions?: boolean;
  transcribeIfNoCaptions?: boolean;
  maxTranscriptionDuration?: number; // in seconds
  handleLongForm?: boolean;
  chunkLongTranscripts?: boolean;
  maxChunkSize?: number; // characters per chunk
}

class YouTubePostProcessor {
  private captionService: typeof YouTubeCaptionService;
  private transcriptionService: YouTubeTranscriptionService | null;

  constructor() {
    this.captionService = YouTubeCaptionService;
    
    // Initialize transcription service if available
    try {
      this.transcriptionService = new YouTubeTranscriptionService();
    } catch (error) {
      console.warn('[YouTubePostProcessor] Transcription service not available:', error);
      this.transcriptionService = null;
    }
  }

  /**
   * Post-process YouTube scraped data to extract transcripts
   */
  async processYouTubeContent(
    scrapedData: ScrapedContent,
    options: YouTubePostProcessorOptions = {}
  ): Promise<ScrapedContent> {
    const {
      preferCaptions = true,
      transcribeIfNoCaptions = true,
      maxTranscriptionDuration = 600, // 10 minutes default
      handleLongForm = true,
      chunkLongTranscripts = true,
      maxChunkSize = 3000 // 3000 chars per chunk for analysis
    } = options;

    console.log('[YouTubePostProcessor] Processing YouTube content:', {
      url: scrapedData.url,
      hasTranscript: !!scrapedData.transcript,
      hasCaptionUrl: !!(scrapedData.rawData?._captionUrl)
    });

    // If we already have a transcript, return as-is
    if (scrapedData.transcript && scrapedData.transcript.length > 50) {
      console.log('[YouTubePostProcessor] Content already has transcript');
      return scrapedData;
    }

    // Try to extract transcript using different methods
    let transcript: string | null = null;

    // Method 1: Try to fetch captions from stored URL
    if (scrapedData.rawData?._captionUrl && preferCaptions) {
      console.log('[YouTubePostProcessor] Attempting to fetch captions from URL');
      try {
        const captionData = {
          captions: {
            captionTracks: [{
              url: scrapedData.rawData._captionUrl,
              languageCode: 'en'
            }]
          }
        };
        transcript = await this.captionService.extractCaptions(captionData);
        if (transcript) {
          console.log('[YouTubePostProcessor] Successfully extracted captions');
        }
      } catch (error) {
        console.error('[YouTubePostProcessor] Caption extraction failed:', error);
      }
    }

    // Method 2: Try direct caption fetch using video ID
    if (!transcript && scrapedData.rawData?.videoId && preferCaptions) {
      console.log('[YouTubePostProcessor] Attempting direct caption fetch');
      try {
        transcript = await this.captionService.fetchTranscriptDirect(scrapedData.rawData.videoId);
        if (transcript) {
          console.log('[YouTubePostProcessor] Successfully fetched captions directly');
        }
      } catch (error) {
        console.error('[YouTubePostProcessor] Direct caption fetch failed:', error);
      }
    }

    // Method 3: Try audio transcription if no captions available
    if (!transcript && transcribeIfNoCaptions && this.transcriptionService) {
      // Check video duration
      const duration = scrapedData.duration || scrapedData.rawData?.videoDetails?.lengthSeconds;
      if (duration && parseInt(duration.toString()) > maxTranscriptionDuration) {
        console.log('[YouTubePostProcessor] Video too long for transcription:', duration, 'seconds');
      } else {
        console.log('[YouTubePostProcessor] Attempting audio transcription');
        try {
          transcript = await this.transcriptionService.transcribeYouTubeVideo(
            scrapedData.url,
            scrapedData.rawData?.videoId
          );
          if (transcript) {
            console.log('[YouTubePostProcessor] Successfully transcribed audio');
          }
        } catch (error) {
          console.error('[YouTubePostProcessor] Audio transcription failed:', error);
        }
      }
    }

    // Update the scraped data with transcript if found
    if (transcript) {
      // Handle long-form videos differently
      if (handleLongForm && scrapedData.videoType === 'long-form') {
        console.log('[YouTubePostProcessor] Processing long-form video transcript');
        
        // For long-form videos, we might want to chunk the transcript
        if (chunkLongTranscripts && transcript.length > maxChunkSize * 2) {
          const chunks = this.chunkTranscript(transcript, maxChunkSize);
          console.log(`[YouTubePostProcessor] Split transcript into ${chunks.length} chunks`);
          
          // Store chunks in rawData for later processing
          return {
            ...scrapedData,
            transcript: transcript, // Keep full transcript
            rawData: {
              ...scrapedData.rawData,
              transcriptSource: scrapedData.rawData?._captionUrl ? 'captions' : 'audio_transcription',
              transcriptChunks: chunks,
              isChunked: true
            }
          };
        }
      }
      
      return {
        ...scrapedData,
        transcript,
        // Add metadata about transcript source
        rawData: {
          ...scrapedData.rawData,
          transcriptSource: scrapedData.rawData?._captionUrl ? 'captions' : 'audio_transcription',
          isChunked: false
        }
      };
    }

    console.log('[YouTubePostProcessor] No transcript could be extracted');
    return scrapedData;
  }

  /**
   * Process multiple YouTube URLs in batch
   */
  async processBatch(
    scrapedItems: ScrapedContent[],
    options?: YouTubePostProcessorOptions
  ): Promise<ScrapedContent[]> {
    const results = await Promise.all(
      scrapedItems.map(item => 
        item.platform === 'youtube' 
          ? this.processYouTubeContent(item, options)
          : Promise.resolve(item)
      )
    );
    return results;
  }

  /**
   * Check if a YouTube video can be processed for transcripts
   */
  static canProcess(scrapedData: ScrapedContent): boolean {
    return (
      scrapedData.platform === 'youtube' &&
      !scrapedData.transcript &&
      (!!scrapedData.rawData?._captionUrl || !!scrapedData.rawData?.videoId || !!scrapedData.url)
    );
  }

  /**
   * Chunk a long transcript into smaller pieces for analysis
   */
  private chunkTranscript(transcript: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Process long-form video with special handling
   */
  async processLongFormVideo(
    scrapedData: ScrapedContent,
    options: YouTubePostProcessorOptions = {}
  ): Promise<ScrapedContent> {
    console.log('[YouTubePostProcessor] Special handling for long-form video');
    
    // For long-form videos, we might want to:
    // 1. Only get captions (no audio transcription due to length)
    // 2. Extract key timestamps/chapters
    // 3. Prepare data for chunked analysis
    
    const processedData = await this.processYouTubeContent(scrapedData, {
      ...options,
      transcribeIfNoCaptions: false, // Don't attempt audio transcription for long videos
      handleLongForm: true,
      chunkLongTranscripts: true
    });
    
    // Add long-form specific metadata
    return {
      ...processedData,
      rawData: {
        ...processedData.rawData,
        processedAsLongForm: true,
        requiresChunkedAnalysis: processedData.transcript && processedData.transcript.length > 10000
      }
    };
  }
}

export default YouTubePostProcessor;