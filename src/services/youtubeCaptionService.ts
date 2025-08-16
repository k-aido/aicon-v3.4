import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

class YouTubeCaptionService {
  /**
   * Extract captions/transcript from YouTube video data
   */
  static async extractCaptions(videoData: any): Promise<string | null> {
    try {
      // Check if we have caption tracks
      if (!videoData.captions?.captionTracks || !Array.isArray(videoData.captions.captionTracks)) {
        console.log('[YouTubeCaptions] No caption tracks available');
        return null;
      }

      // Find English captions - check multiple possible field names
      const englishTrack = videoData.captions.captionTracks.find((track: any) => 
        track.languageCode === 'en' || 
        track.language_code === 'en' || 
        track.vss_id === '.en' ||
        track.languageName?.toLowerCase().includes('english') ||
        track.name?.text?.toLowerCase().includes('english')
      );

      if (!englishTrack) {
        console.log('[YouTubeCaptions] No English caption track found');
        console.log('[YouTubeCaptions] Available tracks:', videoData.captions.captionTracks.map((t: any) => ({
          languageCode: t.languageCode,
          languageName: t.languageName,
          url: t.url ? 'present' : 'missing'
        })));
        return null;
      }
      
      const captionUrl = englishTrack.url || englishTrack.base_url;
      if (!captionUrl) {
        console.log('[YouTubeCaptions] No caption URL found in track');
        return null;
      }

      console.log('[YouTubeCaptions] Found English caption track:', {
        languageCode: englishTrack.languageCode,
        languageName: englishTrack.languageName,
        hasUrl: !!captionUrl
      });

      // Fetch the captions
      const response = await fetch(captionUrl);
      
      if (!response.ok) {
        console.error('[YouTubeCaptions] Failed to fetch captions:', response.status);
        return null;
      }

      const captionXml = await response.text();
      
      console.log('[YouTubeCaptions] Caption XML length:', captionXml.length);
      console.log('[YouTubeCaptions] Caption response preview:', captionXml.substring(0, 200));
      console.log('[YouTubeCaptions] Caption response ends with:', captionXml.substring(captionXml.length - 200));
      
      // Parse the XML captions
      let parsed;
      try {
        parsed = await parseStringPromise(captionXml);
      } catch (parseError) {
        console.error('[YouTubeCaptions] Failed to parse caption XML:', parseError);
        console.log('[YouTubeCaptions] Raw response:', captionXml.substring(0, 500));
        return null;
      }
      
      if (!parsed.transcript?.text) {
        console.log('[YouTubeCaptions] No text found in caption XML');
        console.log('[YouTubeCaptions] Parsed structure:', JSON.stringify(Object.keys(parsed || {})));
        return null;
      }

      // Extract text from all caption segments
      console.log('[YouTubeCaptions] Number of text segments:', parsed.transcript.text.length);
      
      const textSegments = parsed.transcript.text.map((segment: any, index: number) => {
        // Decode HTML entities and clean up
        const text = segment._ || segment;
        const decoded = this.decodeHtmlEntities(text).trim();
        
        // Log last few segments to see if we're getting all of them
        if (index >= parsed.transcript.text.length - 3) {
          console.log(`[YouTubeCaptions] Segment ${index}:`, decoded.substring(0, 50));
        }
        
        return decoded;
      });

      const fullTranscript = textSegments.join(' ');
      
      console.log('[YouTubeCaptions] Extracted caption text, length:', fullTranscript.length);
      console.log('[YouTubeCaptions] Last 100 chars of transcript:', fullTranscript.substring(fullTranscript.length - 100));
      console.log('[YouTubeCaptions] Full transcript ends with:', fullTranscript.substring(fullTranscript.length - 200));
      return fullTranscript;

    } catch (error) {
      console.error('[YouTubeCaptions] Error extracting captions:', error);
      return null;
    }
  }

  /**
   * Decode HTML entities in text
   */
  private static decodeHtmlEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '='
    };
    
    return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Try to get YouTube video ID from URL
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Fetch transcript using YouTube's internal API (alternative method)
   */
  static async fetchTranscriptDirect(videoId: string): Promise<string | null> {
    try {
      // This is an alternative approach using YouTube's transcript endpoint
      // Note: This may not always work due to CORS or authentication requirements
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`;
      
      console.log('[YouTubeCaptions] Attempting direct transcript fetch for video:', videoId);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.log('[YouTubeCaptions] Direct transcript fetch failed:', response.status);
        return null;
      }

      const data = await response.text();
      
      // Parse the response (format varies)
      if (data.includes('<?xml')) {
        // XML format
        const parsed = await parseStringPromise(data);
        if (parsed.transcript?.text) {
          const text = parsed.transcript.text.map((t: any) => t._ || t).join(' ');
          return this.decodeHtmlEntities(text);
        }
      } else if (data.includes('"events"')) {
        // JSON format
        const json = JSON.parse(data);
        if (json.events) {
          const text = json.events
            .filter((e: any) => e.segs)
            .flatMap((e: any) => e.segs.map((s: any) => s.utf8))
            .join(' ');
          return text;
        }
      }

      return null;
    } catch (error) {
      console.error('[YouTubeCaptions] Direct transcript fetch error:', error);
      return null;
    }
  }
}

export default YouTubeCaptionService;