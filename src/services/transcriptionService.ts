import FormData from 'form-data';
// Note: This service is server-side only and uses Node.js-specific modules

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
      
      // Add timeout and better error handling for download
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      // Download audio file with headers that might help with some CDNs
      const audioResponse = await fetch(audioUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'video/*,audio/*,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Referer': audioUrl.includes('tiktok') ? 'https://www.tiktok.com/' : 
                     audioUrl.includes('instagram') ? 'https://www.instagram.com/' : 
                     'https://www.youtube.com/'
        }
      });
      
      clearTimeout(timeout);
      
      if (!audioResponse.ok) {
        console.error('[TranscriptionService] Failed to download audio:', {
          status: audioResponse.status,
          statusText: audioResponse.statusText,
          url: audioUrl.substring(0, 100) + '...'
        });
        throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = Buffer.from(audioArrayBuffer);
      
      console.log('[TranscriptionService] Downloaded audio:', {
        bufferSize: audioBuffer.length,
        contentType: audioResponse.headers.get('content-type'),
        contentLength: audioResponse.headers.get('content-length')
      });
      
      if (audioBuffer.length === 0) {
        throw new Error('Downloaded audio file is empty');
      }
      
      // Check if file is too large (Groq has a 25MB limit)
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      if (audioBuffer.length > MAX_FILE_SIZE) {
        console.error('[TranscriptionService] File too large for transcription:', {
          size: audioBuffer.length,
          maxSize: MAX_FILE_SIZE
        });
        throw new Error(`File too large for transcription: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB (max 25MB)`);
      }
      
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
        else if (contentType.includes('quicktime')) {
          extension = 'mp4'; // Treat QuickTime as MP4
          contentType = 'video/mp4';
        }
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
    } catch (error: any) {
      console.error('[TranscriptionService] Error transcribing from URL:', {
        message: error.message,
        name: error.name,
        url: audioUrl.substring(0, 100) + '...'
      });
      
      // Check if it's an abort error
      if (error.name === 'AbortError') {
        console.error('[TranscriptionService] Download timed out after 60 seconds');
      }
      
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
      
      // Add audio file to form data - use Buffer directly for Node.js
      formData.append('file', audioBuffer, {
        filename: filename,
        contentType: contentType
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
      
      // Make request to Groq API using form-data's buffer
      // Get the buffer and calculate content length
      const formBuffer = formData.getBuffer();
      const formHeaders = formData.getHeaders();
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formHeaders,
          'Content-Length': formBuffer.length.toString()
        },
        body: formBuffer
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
        return { text: result as string };
      } else if (responseFormat === 'verbose_json') {
        return result as TranscriptionResult;
      } else {
        return { text: (result as any).text || result as string };
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
             content.rawData?.mediaUrls ||  // TikTok uses mediaUrls array
             (content.rawData?.formats && Array.isArray(content.rawData.formats)));
  }

  /**
   * Extract audio URL from content data
   */
  static getAudioUrl(content: any): string | null {
    // Log what we're working with
    console.log('[TranscriptionService] Extracting audio URL from content:', {
      platform: content.platform,
      hasVideoUrl: !!content.videoUrl,
      hasRawData: !!content.rawData,
      rawDataKeys: content.rawData ? Object.keys(content.rawData).slice(0, 10) : []
    });
    
    // Try to get direct video URL first - check more fields for TikTok
    let videoUrl = content.videoUrl || 
                  content.rawData?.videoUrl || 
                  content.rawData?.video_url ||
                  content.rawData?.videoUrlNoWatermark ||
                  content.rawData?.video_url_no_watermark ||
                  content.rawData?.downloadUrl ||  // TikTok might use this
                  content.rawData?.download_url ||
                  content.rawData?.videoMeta?.downloadUrl || // Or nested in videoMeta
                  content.rawData?.video?.playUrl || // Or in video object
                  content.rawData?.video?.downloadUrl ||
                  content.rawData?.videoUrl_hd || // HD version
                  content.rawData?.videoUrl_sd || // SD version
                  content.rawData?.playAddr || // Another TikTok field
                  content.rawData?.downloadAddr; // Another TikTok field
    
    // Check mediaUrls array for TikTok
    if (!videoUrl && content.rawData?.mediaUrls && Array.isArray(content.rawData.mediaUrls)) {
      if (content.rawData.mediaUrls.length > 0) {
        videoUrl = content.rawData.mediaUrls[0];
        console.log('[TranscriptionService] Found video URL in mediaUrls array');
      }
    }
    
    // For Instagram, check additional fields
    if (!videoUrl && content.platform === 'instagram') {
      videoUrl = content.rawData?.videoUrl ||
                content.rawData?.video_url ||
                content.rawData?.videoVersions?.[0]?.url ||
                content.rawData?.video_versions?.[0]?.url ||
                content.rawData?.media?.[0]?.video_url ||
                content.rawData?.carousel_media?.[0]?.video_url;
      
      if (videoUrl) {
        console.log('[TranscriptionService] Found Instagram video URL in alternative fields');
      }
    }
    
    // Log all available URLs in rawData for debugging
    if (!videoUrl && content.rawData) {
      const urlFields = Object.entries(content.rawData)
        .filter(([key, value]) => 
          (key.toLowerCase().includes('url') || key.toLowerCase().includes('video')) && 
          typeof value === 'string' && 
          (value.startsWith('http') || value.startsWith('//'))
        )
        .slice(0, 10);
      
      if (urlFields.length > 0) {
        console.log('[TranscriptionService] Found URL fields in rawData:', urlFields);
        // Try the first URL that looks like a video
        const potentialVideoUrl = urlFields.find(([key, value]) => {
          if (typeof value === 'string') {
            return value.includes('.mp4') || value.includes('video') || key.includes('video');
          }
          return false;
        });
        if (potentialVideoUrl) {
          videoUrl = potentialVideoUrl[1] as string;
          console.log('[TranscriptionService] Using potential video URL from rawData');
        }
      }
    }
    
    if (videoUrl) {
      // Clean up the URL if needed
      if (videoUrl.startsWith('//')) {
        videoUrl = 'https:' + videoUrl;
      }
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
      
      // Check adaptiveFormats as fallback
      if (content.rawData.streamingData?.adaptiveFormats) {
        const audioFormat = content.rawData.streamingData.adaptiveFormats.find((f: any) => 
          f.mimeType?.includes('audio') && f.url
        );
        
        if (audioFormat) {
          console.log('[TranscriptionService] Found YouTube audio URL from adaptiveFormats');
          return audioFormat.url;
        }
      }
      
      console.log('[TranscriptionService] No suitable YouTube format found in streamingData');
    }
    
    console.log('[TranscriptionService] No video URL found after checking all fields');
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
    
    return parts.join('. ') || '';
  }
}

export default TranscriptionService;
export type { TranscriptionResult, TranscriptionOptions };