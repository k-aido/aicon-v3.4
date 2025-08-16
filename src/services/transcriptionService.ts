import FormData from 'form-data';
import fetch from 'node-fetch';

interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

class TranscriptionService {
  private apiKey: string;
  private apiEndpoint = 'https://api.groq.com/openai/v1/audio/transcriptions';
  private model = 'whisper-large-v3-turbo';
  
  constructor(apiKey?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key || key === 'your_groq_api_key_here') {
      throw new Error('GROQ_API_KEY is required for transcription. Please add your Groq API key to .env.local');
    }
    this.apiKey = key;
  }

  /**
   * Transcribe audio from a URL using Groq's Whisper model
   */
  async transcribeFromUrl(
    audioUrl: string, 
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult | null> {
    try {
      console.log('[TranscriptionService] Starting transcription for URL:', audioUrl);
      
      // Download audio file
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }
      
      const audioBuffer = await audioResponse.buffer();
      
      // Better file extension detection
      let extension = 'mp4'; // Default to mp4
      let contentType = audioResponse.headers.get('content-type') || 'video/mp4';
      
      // Try to extract extension from URL (before query params)
      const urlPath = audioUrl.split('?')[0];
      const urlParts = urlPath.split('.');
      const urlExtension = urlParts[urlParts.length - 1]?.toLowerCase();
      
      // Map common extensions to supported formats
      const supportedExtensions = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'opus', 'wav', 'webm', 'flac'];
      if (urlExtension && supportedExtensions.includes(urlExtension)) {
        extension = urlExtension;
      } else if (audioUrl.includes('.mp4')) {
        extension = 'mp4';
        contentType = 'video/mp4';
      } else if (audioUrl.includes('.mp3')) {
        extension = 'mp3';
        contentType = 'audio/mpeg';
      } else if (contentType) {
        // Try to map content-type to extension
        if (contentType.includes('mp4')) extension = 'mp4';
        else if (contentType.includes('mpeg') || contentType.includes('mp3')) extension = 'mp3';
        else if (contentType.includes('webm')) extension = 'webm';
        else if (contentType.includes('ogg')) extension = 'ogg';
        else if (contentType.includes('wav')) extension = 'wav';
        else if (contentType.includes('flac')) extension = 'flac';
      }
      
      // Create filename with proper extension
      const filename = `audio.${extension}`;
      
      console.log('[TranscriptionService] File details:', {
        extension,
        contentType,
        filename,
        bufferSize: audioBuffer.length
      });
      
      return await this.transcribeFromBuffer(audioBuffer, filename, contentType, options);
    } catch (error) {
      console.error('[TranscriptionService] Error transcribing from URL:', error);
      return null;
    }
  }

  /**
   * Transcribe audio from a buffer
   */
  async transcribeFromBuffer(
    audioBuffer: Buffer,
    filename: string,
    contentType: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult | null> {
    try {
      const formData = new FormData();
      
      // Add audio file to form data
      formData.append('file', audioBuffer, {
        filename,
        contentType
      });
      
      // Add model
      formData.append('model', this.model);
      
      // Add optional parameters
      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      
      // Default to verbose_json for more detailed output
      const responseFormat = options.response_format || 'verbose_json';
      formData.append('response_format', responseFormat);
      
      console.log('[TranscriptionService] Sending request to Groq API...', {
        model: this.model,
        filename,
        contentType,
        bufferSize: audioBuffer.length,
        responseFormat
      });
      
      // Make request to Groq API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[TranscriptionService] Groq API error details:', {
          status: response.status,
          error,
          filename,
          contentType
        });
        throw new Error(`Groq API error: ${response.status} - ${error}`);
      }
      
      const result = await response.json();
      
      console.log('[TranscriptionService] Transcription successful');
      
      // Handle different response formats
      if (responseFormat === 'text') {
        return { text: result };
      } else if (responseFormat === 'verbose_json') {
        return result as TranscriptionResult;
      } else {
        return { text: result.text || result };
      }
      
    } catch (error) {
      console.error('[TranscriptionService] Error during transcription:', error);
      return null;
    }
  }

  /**
   * Check if content has audio/video available for transcription
   * For now, always transcribe if audio is available
   */
  static needsTranscription(content: any): boolean {
    // Check if it's YouTube content (has URL or video ID)
    if (content.platform === 'youtube') {
      return !!(content.url || 
               content.rawData?.url || 
               content.rawData?.videoId || 
               content.rawData?.id ||
               content.rawData?.embedUrl);
    }
    
    // For other platforms, check for video URL
    return !!(content.videoUrl || 
             content.rawData?.videoUrl || 
             content.rawData?.video_url ||
             content.rawData?.videoUrlNoWatermark ||
             content.rawData?.video_url_no_watermark ||
             (content.rawData?.formats && Array.isArray(content.rawData.formats)));
  }

  /**
   * Extract audio URL from content data
   */
  static getAudioUrl(content: any): string | null {
    // Try to get direct video URL first
    const videoUrl = content.videoUrl || 
                    content.rawData?.videoUrl || 
                    content.rawData?.video_url ||
                    content.rawData?.videoUrlNoWatermark ||
                    content.rawData?.video_url_no_watermark;
    
    if (videoUrl) {
      console.log('[TranscriptionService] Found video URL:', videoUrl.substring(0, 100) + '...');
      return videoUrl;
    }
    
    // For YouTube, check streamingData
    if (content.platform === 'youtube' && content.rawData) {
      // Check for streamingData formats from apidojo scraper
      if (content.rawData.streamingData?.formats && Array.isArray(content.rawData.streamingData.formats)) {
        // Find the best format with both video and audio
        const mp4Format = content.rawData.streamingData.formats.find((f: any) => 
          f.mimeType?.includes('video/mp4') && f.url
        );
        
        if (mp4Format) {
          console.log('[TranscriptionService] Found YouTube video URL from streamingData');
          return mp4Format.url;
        }
      }
      
      console.log('[TranscriptionService] No suitable YouTube format found in streamingData');
    }
    
    return null;
  }

  /**
   * Generate a contextual prompt based on content metadata
   */
  static generatePrompt(content: any): string {
    const parts = [];
    
    if (content.title) {
      parts.push(`Title: ${content.title}`);
    }
    
    if (content.authorName) {
      parts.push(`Creator: ${content.authorName}`);
    }
    
    if (content.hashtags && content.hashtags.length > 0) {
      parts.push(`Topics: ${content.hashtags.join(', ')}`);
    }
    
    return parts.join('. ') || undefined;
  }
}

export default TranscriptionService;
export type { TranscriptionResult, TranscriptionOptions };