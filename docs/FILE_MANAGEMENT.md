# AICON v3 File Management System Specification

## Overview
This document defines the complete file management system for AICON v3, handling all file uploads, processing, storage, and delivery. The system manages user uploads, scraped content, generated media, and temporary processing files with comprehensive security, optimization, and lifecycle management.

## Technology Stack
- **Storage**: Supabase Storage (S3-compatible)
- **CDN**: Supabase CDN with global edge caching
- **Image Processing**: Sharp for image optimization
- **Video Processing**: FFmpeg for video processing
- **Audio Processing**: Built-in audio utilities
- **File Validation**: Custom validation with virus scanning
- **Background Processing**: Queue-based file processing

## Storage Architecture

### 1. Bucket Structure

```typescript
interface StorageBuckets {
  'user-uploads': {
    description: 'Original user-uploaded content';
    public: false;
    allowedTypes: ['image/*', 'video/*', 'audio/*'];
    maxFileSize: '100MB';
    path: '/{user_id}/{project_id}/{content_id}/original.{ext}';
  };
  'processed-content': {
    description: 'Optimized and processed versions';
    public: false;
    allowedTypes: ['image/*', 'video/*', 'audio/*'];
    maxFileSize: '200MB';
    path: '/{user_id}/{content_id}/processed/{type}.{ext}';
  };
  'generated-media': {
    description: 'AI-generated audio and video content';
    public: false;
    allowedTypes: ['audio/*', 'video/*'];
    maxFileSize: '500MB';
    path: '/{user_id}/{generation_id}/final.{ext}';
  };
  'voice-samples': {
    description: 'Voice training samples for ElevenLabs';
    public: false;
    allowedTypes: ['audio/*'];
    maxFileSize: '50MB';
    path: '/{user_id}/voice/{voice_model_id}/samples/{sample_id}.{ext}';
  };
  'avatar-photos': {
    description: 'Photos for HeyGen avatar creation';
    public: false;
    allowedTypes: ['image/*'];
    maxFileSize: '20MB';
    path: '/{user_id}/avatar/{avatar_model_id}/photos/{photo_id}.{ext}';
  };
  'thumbnails': {
    description: 'Generated thumbnails and previews';
    public: true;
    allowedTypes: ['image/*'];
    maxFileSize: '5MB';
    path: '/{user_id}/{content_id}/thumb_{size}.{ext}';
  };
  'temp-processing': {
    description: 'Temporary files during processing';
    public: false;
    allowedTypes: ['*'];
    maxFileSize: '1GB';
    path: '/temp/{job_id}/{file_id}.{ext}';
    ttl: '24h';
  };
}
```

### 2. File Naming Convention

```typescript
interface FileNamingScheme {
  original: '{timestamp}_{uuid_short}_{original_name}.{ext}';
  processed: '{timestamp}_{uuid_short}_{type}_{quality}.{ext}';
  thumbnail: '{timestamp}_{uuid_short}_thumb_{width}x{height}.{ext}';
  generated: '{timestamp}_{uuid_short}_{service}_{type}.{ext}';
  
  examples: {
    original: '20240721_a1b2c3d4_instagram_reel.mp4';
    processed: '20240721_a1b2c3d4_optimized_720p.mp4';
    thumbnail: '20240721_a1b2c3d4_thumb_300x300.jpg';
    generated: '20240721_a1b2c3d4_elevenlabs_audio.mp3';
  };
}
```

## File Upload System

### 1. Upload Configuration

```typescript
interface UploadConfig {
  maxFileSize: {
    image: 20 * 1024 * 1024;      // 20MB
    video: 100 * 1024 * 1024;     // 100MB
    audio: 50 * 1024 * 1024;      // 50MB
    document: 10 * 1024 * 1024;   // 10MB
  };
  
  allowedMimeTypes: {
    image: [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'image/gif'
    ];
    video: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/webm',
      'audio/ogg'
    ];
  };
  
  imageOptimization: {
    maxWidth: 1920;
    maxHeight: 1080;
    quality: 85;
    format: 'webp';
    progressive: true;
  };
  
  videoOptimization: {
    maxWidth: 1920;
    maxHeight: 1080;
    videoBitrate: '2M';
    audioBitrate: '128k';
    format: 'mp4';
    codec: 'h264';
  };
  
  audioOptimization: {
    bitrate: '128k';
    sampleRate: 44100;
    format: 'mp3';
    normalize: true;
  };
}
```

### 2. File Upload Service

```typescript
class FileUploadService {
  private supabase: SupabaseClient;
  private config: UploadConfig;
  
  constructor() {
    this.supabase = createSupabaseClient();
    this.config = uploadConfig;
  }
  
  async uploadFile(
    file: File,
    bucket: string,
    path: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // 1. Validate file
      await this.validateFile(file, bucket);
      
      // 2. Generate unique file path
      const filePath = await this.generateFilePath(file, bucket, path);
      
      // 3. Process file if needed
      const processedFile = await this.processFile(file, bucket, options);
      
      // 4. Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: options.upsert || false
        });
      
      if (error) throw error;
      
      // 5. Generate thumbnail if image/video
      if (this.needsThumbnail(file.type)) {
        await this.generateThumbnail(filePath, file);
      }
      
      // 6. Extract metadata
      const metadata = await this.extractMetadata(processedFile, file.type);
      
      // 7. Update database record
      await this.updateFileRecord(filePath, {
        originalName: file.name,
        mimeType: file.type,
        fileSize: processedFile.size,
        metadata
      });
      
      return {
        path: filePath,
        url: this.getPublicUrl(bucket, filePath),
        size: processedFile.size,
        mimeType: file.type,
        metadata
      };
      
    } catch (error) {
      await this.handleUploadError(error, file, bucket);
      throw error;
    }
  }
  
  private async validateFile(file: File, bucket: string): Promise<void> {
    const