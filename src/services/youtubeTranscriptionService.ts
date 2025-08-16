import * as ytdl from 'ytdl-core';
import { put, del } from '@vercel/blob';
import TranscriptionService from './transcriptionService';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

class YouTubeTranscriptionService {
  private transcriptionService: TranscriptionService;
  
  constructor() {
    // Only initialize if we have a valid Groq API key
    try {
      this.transcriptionService = new TranscriptionService();
    } catch (error) {
      console.warn('[YouTubeTranscription] Transcription service not available:', error);
    }
  }

  /**
   * Extract and transcribe audio from a YouTube URL
   */
  async transcribeYouTubeVideo(url: string, videoId?: string): Promise<string | null> {
    if (!this.transcriptionService) {
      console.log('[YouTubeTranscription] Transcription service not configured');
      return null;
    }

    try {
      console.log('[YouTubeTranscription] Starting YouTube transcription for:', url);
      
      // Check if we're in development or production
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      
      if (isProduction) {
        return await this.transcribeYouTubeProduction(url, videoId);
      } else {
        return await this.transcribeYouTubeDevelopment(url, videoId);
      }
    } catch (error) {
      console.error('[YouTubeTranscription] Error transcribing YouTube video:', error);
      return null;
    }
  }

  /**
   * Development mode: Download to local filesystem
   */
  private async transcribeYouTubeDevelopment(url: string, videoId?: string): Promise<string | null> {
    try {
      console.log('[YouTubeTranscription] Starting development transcription');
      console.log('[YouTubeTranscription] URL:', url);
      console.log('[YouTubeTranscription] Video ID:', videoId);
      
      // Log environment info
      console.log('[YouTubeTranscription] Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      });
      
      // Check ytdl cache
      const ytdlCachePath = path.join(require('os').homedir(), '.ytdl-cache');
      console.log('[YouTubeTranscription] ytdl cache path:', ytdlCachePath);
      console.log('[YouTubeTranscription] Cache exists:', fs.existsSync(ytdlCachePath));
      
      // Validate YouTube URL
      const isValid = ytdl.validateURL(url);
      console.log('[YouTubeTranscription] URL validation result:', isValid);
      
      if (!isValid) {
        console.error('[YouTubeTranscription] Invalid YouTube URL:', url);
        return null;
      }

      // Try to download without getting info first (sometimes this works when getInfo fails)
      console.log('[YouTubeTranscription] Attempting direct download without getInfo...');
      
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Download audio stream directly
      const audioPath = path.join(tempDir, `youtube_${videoId || Date.now()}.mp4`);
      
      return new Promise(async (resolve, reject) => {
        console.log('[YouTubeTranscription] Creating audio stream with ytdl (direct approach)...');
        console.log('[YouTubeTranscription] Target path:', audioPath);
        
        // Try different filter options
        const downloadOptions: any = {
          quality: 'lowestaudio',
          filter: 'audioonly',
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cookie': '' // Sometimes helps with age-restricted videos
            }
          },
          // Try to bypass signature extraction
          highWaterMark: 1 << 16 // 64KB chunks
        };
        
        console.log('[YouTubeTranscription] Download options:', JSON.stringify(downloadOptions, null, 2));
        console.log('[YouTubeTranscription] Available filter types:', {
          audioonly: typeof ytdl.filterFormats,
          hasAudio: !!ytdl.chooseFormat
        });
        
        let audioStream;
        try {
          // Log ytdl-core version and internals
          console.log('[YouTubeTranscription] ytdl-core internals:', {
            version: require('ytdl-core/package.json').version,
            validateURL: typeof ytdl.validateURL,
            validateID: typeof ytdl.validateID,
            getURLVideoID: typeof ytdl.getURLVideoID,
            getVideoID: typeof ytdl.getVideoID
          });
          
          // Try to extract video ID
          try {
            const extractedId = ytdl.getVideoID(url);
            console.log('[YouTubeTranscription] Extracted video ID:', extractedId);
          } catch (idError: any) {
            console.error('[YouTubeTranscription] Failed to extract video ID:', idError.message);
          }
          
          // Try getBasicInfo as it might work when getInfo fails
          console.log('[YouTubeTranscription] Attempting getBasicInfo...');
          let basicInfo: any = null;
          try {
            basicInfo = await ytdl.getBasicInfo(url);
            console.log('[YouTubeTranscription] Basic info retrieved:', {
              title: basicInfo.videoDetails?.title,
              videoId: basicInfo.videoDetails?.videoId,
              lengthSeconds: basicInfo.videoDetails?.lengthSeconds,
              isLive: basicInfo.videoDetails?.isLiveContent,
              isPrivate: basicInfo.videoDetails?.isPrivate,
              formatCount: basicInfo.formats?.length || 0,
              playerResponseExists: !!basicInfo.player_response
            });
            
            // Check if we have formats with direct URLs
            if (basicInfo.formats && basicInfo.formats.length > 0) {
              const audioFormats = basicInfo.formats.filter((f: any) => f.hasAudio && !f.hasVideo);
              console.log('[YouTubeTranscription] Found audio formats:', audioFormats.length);
              
              // Log all audio formats to see what's available
              audioFormats.forEach((format: any, index: number) => {
                console.log(`[YouTubeTranscription] Audio format ${index}:`, {
                  itag: format.itag,
                  mimeType: format.mimeType,
                  audioQuality: format.audioQuality,
                  hasUrl: !!format.url,
                  hasSignatureCipher: !!format.signatureCipher,
                  container: format.container,
                  codecs: format.codecs
                });
              });
              
              // Try to find a format with a direct URL (no signature cipher)
              const directUrlFormat = audioFormats.find((f: any) => f.url && !f.signatureCipher);
              
              if (directUrlFormat) {
                console.log('[YouTubeTranscription] Found format with direct URL:', {
                  itag: directUrlFormat.itag,
                  mimeType: directUrlFormat.mimeType,
                  bitrate: directUrlFormat.bitrate,
                  audioQuality: directUrlFormat.audioQuality,
                  urlLength: directUrlFormat.url.length
                });
                
                console.log('[YouTubeTranscription] Attempting direct download from URL...');
                try {
                  const fetch = require('node-fetch');
                  const response = await fetch(directUrlFormat.url, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                      'Accept': '*/*',
                      'Accept-Language': 'en-US,en;q=0.9',
                      'Range': 'bytes=0-' // Request partial content
                    }
                  });
                  
                  if (response.ok) {
                    console.log('[YouTubeTranscription] Direct URL download successful, status:', response.status);
                    const buffer = await response.buffer();
                    console.log('[YouTubeTranscription] Downloaded buffer size:', buffer.length);
                    
                    // Save to file
                    fs.writeFileSync(audioPath, buffer);
                    console.log('[YouTubeTranscription] Audio saved to:', audioPath);
                    
                    // Transcribe the audio
                    try {
                      const audioBuffer = fs.readFileSync(audioPath);
                      const result = await this.transcriptionService.transcribeFromBuffer(
                        audioBuffer,
                        'audio.mp4',
                        'audio/mp4',
                        { response_format: 'verbose_json' }
                      );
                      
                      // Clean up temp file
                      fs.unlinkSync(audioPath);
                      
                      if (result) {
                        console.log('[YouTubeTranscription] Transcription successful via direct URL');
                        resolve(result.text);
                        return;
                      }
                    } catch (transcribeError) {
                      console.error('[YouTubeTranscription] Transcription error:', transcribeError);
                      if (fs.existsSync(audioPath)) {
                        fs.unlinkSync(audioPath);
                      }
                    }
                  } else {
                    console.log('[YouTubeTranscription] Direct URL download failed, status:', response.status);
                  }
                } catch (directDownloadError: any) {
                  console.error('[YouTubeTranscription] Direct download error:', directDownloadError.message);
                }
              } else {
                console.log('[YouTubeTranscription] No formats with direct URLs found');
                // Log why each format can't be used
                audioFormats.slice(0, 3).forEach((f: any, i: number) => {
                  console.log(`[YouTubeTranscription] Format ${i} cannot be used:`, {
                    hasUrl: !!f.url,
                    hasSignatureCipher: !!f.signatureCipher,
                    reason: !f.url ? 'No URL' : (f.signatureCipher ? 'Requires signature decryption' : 'Unknown')
                  });
                });
              }
            }
          } catch (basicInfoError: any) {
            console.error('[YouTubeTranscription] getBasicInfo failed:', {
              message: basicInfoError.message,
              name: basicInfoError.name
            });
          }
          
          // Check if we can get basic info
          console.log('[YouTubeTranscription] Attempting to create stream...');
          
          // Try to create stream directly without getInfo
          audioStream = ytdl(url, downloadOptions);
          console.log('[YouTubeTranscription] Stream created successfully');
        } catch (streamError: any) {
          console.error('[YouTubeTranscription] Failed to create audio stream:', {
            message: streamError.message,
            name: streamError.name,
            code: streamError.code,
            statusCode: streamError.statusCode,
            stack: streamError.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
          });
          reject(streamError);
          return;
        }

        const writeStream = fs.createWriteStream(audioPath);
        
        // Track download progress
        let downloadedBytes = 0;
        let videoInfo: any = null;
        
        audioStream.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          // Log progress every 100KB
          if (downloadedBytes % (100 * 1024) < chunk.length) {
            console.log(`[YouTubeTranscription] Downloaded: ${(downloadedBytes / 1024).toFixed(0)}KB`);
          }
        });
        
        audioStream.on('info', (info: any, format: any) => {
          videoInfo = info;
          console.log('[YouTubeTranscription] Stream info received:', {
            videoId: info.videoDetails?.videoId,
            title: info.videoDetails?.title,
            duration: info.videoDetails?.lengthSeconds,
            author: info.videoDetails?.author?.name
          });
          
          console.log('[YouTubeTranscription] Format being used:', {
            itag: format?.itag,
            container: format?.container,
            audioCodec: format?.audioCodec,
            audioQuality: format?.audioQuality
          });
          
          // Check video duration
          const duration = parseInt(info.videoDetails?.lengthSeconds || '0');
          if (duration > 600) { // 10 minutes
            console.log('[YouTubeTranscription] Video too long:', duration, 'seconds');
            audioStream.destroy();
            writeStream.destroy();
            reject(new Error('Video too long for transcription (max 10 minutes)'));
          }
        });
        
        // Add response event to catch early errors
        audioStream.on('response', (response: any) => {
          console.log('[YouTubeTranscription] Stream response received:', {
            statusCode: response.statusCode,
            headers: response.headers ? Object.keys(response.headers) : null
          });
        });
        
        audioStream.on('error', (error: any) => {
          console.error('[YouTubeTranscription] Download stream error:', {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n'),
            name: error.name,
            code: error.code,
            statusCode: error.statusCode
          });
          
          // Clean up file if it exists
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
          
          reject(error);
        });
        
        writeStream.on('error', (error: any) => {
          console.error('[YouTubeTranscription] Write stream error:', {
            message: error.message,
            code: error.code
          });
          reject(error);
        });
        
        audioStream.pipe(writeStream);
        
        writeStream.on('finish', async () => {
          console.log('[YouTubeTranscription] Audio downloaded successfully');
          console.log('[YouTubeTranscription] File size:', fs.statSync(audioPath).size, 'bytes');
          
          try {
            // Read the file into a buffer
            const audioBuffer = fs.readFileSync(audioPath);
            
            // Transcribe the audio
            const result = await this.transcriptionService.transcribeFromBuffer(
              audioBuffer,
              'audio.mp4',
              'audio/mp4',
              { response_format: 'verbose_json' }
            );
            
            // Clean up temp file
            fs.unlinkSync(audioPath);
            
            if (result) {
              console.log('[YouTubeTranscription] Transcription successful, length:', result.text.length);
              resolve(result.text);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('[YouTubeTranscription] Transcription error:', error);
            // Clean up temp file if it exists
            if (fs.existsSync(audioPath)) {
              fs.unlinkSync(audioPath);
            }
            resolve(null);
          }
        });
        
        writeStream.on('error', (error) => {
          console.error('[YouTubeTranscription] Write error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('[YouTubeTranscription] Development transcription error:', error);
      return null;
    }
  }

  /**
   * Production mode: Use Vercel Blob storage
   */
  private async transcribeYouTubeProduction(url: string, videoId?: string): Promise<string | null> {
    try {
      // Validate YouTube URL
      if (!ytdl.validateURL(url)) {
        console.error('[YouTubeTranscription] Invalid YouTube URL:', url);
        return null;
      }

      // Get video info
      const info = await ytdl.getInfo(url);
      console.log('[YouTubeTranscription] Video info:', {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        videoId: info.videoDetails.videoId
      });

      // Check if video is too long
      const maxDuration = 600; // 10 minutes
      if (parseInt(info.videoDetails.lengthSeconds) > maxDuration) {
        console.log('[YouTubeTranscription] Video too long for transcription');
        return null;
      }

      // Download audio stream
      console.log('[YouTubeTranscription] Downloading audio stream...');
      
      const audioStream = ytdl(url, {
        quality: 'lowestaudio',
        filter: 'audioonly'
      });

      // Convert stream to buffer for Vercel Blob
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        audioStream.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });
        
        audioStream.on('error', (error) => {
          console.error('[YouTubeTranscription] Stream error:', error);
          reject(error);
        });
        
        audioStream.on('end', async () => {
          try {
            const audioBuffer = Buffer.concat(chunks);
            console.log('[YouTubeTranscription] Audio buffer size:', audioBuffer.length);
            
            // Upload to Vercel Blob temporarily
            const blobName = `youtube_temp_${videoId || Date.now()}.mp4`;
            const blob = await put(blobName, audioBuffer, {
              access: 'public',
              contentType: 'audio/mp4'
            });
            
            console.log('[YouTubeTranscription] Uploaded to blob:', blob.url);
            
            // Transcribe from the blob URL
            const result = await this.transcriptionService.transcribeFromUrl(
              blob.url,
              { response_format: 'verbose_json' }
            );
            
            // Clean up the blob
            await del(blob.url);
            
            if (result) {
              console.log('[YouTubeTranscription] Transcription successful');
              resolve(result.text);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('[YouTubeTranscription] Production transcription error:', error);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('[YouTubeTranscription] Production error:', error);
      return null;
    }
  }

  /**
   * Check if a YouTube URL can be transcribed
   */
  static async canTranscribe(url: string): Promise<boolean> {
    try {
      if (!ytdl.validateURL(url)) {
        return false;
      }
      
      const info = await ytdl.getInfo(url);
      // Check if video is less than 10 minutes
      return parseInt(info.videoDetails.lengthSeconds) <= 600;
    } catch {
      return false;
    }
  }
}

export default YouTubeTranscriptionService;