# YouTube Scraper Enhancements

## Overview
This document describes the enhancements made to the YouTube scraping functionality in AICON v3.4.

## Key Improvements

### 1. Enhanced URL Support
- **YouTube Shorts**: Now supports `/shorts/` URLs
- **Playlists**: Added support for playlist URLs with `list=` parameter
- **Embed URLs**: Supports `/embed/` format
- **Short URLs**: Full support for `youtu.be` links
- **Long-form Videos**: Special handling for videos over 20 minutes

### 2. Improved Video URL Extraction
The ApifyService now checks multiple sources for video URLs:
- Direct `videoUrl` fields in scraped data
- `streamingData.formats` array with intelligent format selection
- `adaptiveFormats` as a fallback
- Standard YouTube URL construction as final fallback

### 3. Enhanced Transcript Extraction
Multiple methods are attempted in order:
1. Direct caption text from scraped data
2. Caption URL extraction for later processing
3. Direct YouTube transcript API fetch
4. Audio download and transcription via Whisper

### 4. YouTube Post-Processor Service
Created `YouTubePostProcessor` service that:
- Centralizes transcript extraction logic
- Provides configurable options for caption preference
- Handles fallback to audio transcription
- Tracks transcript source (captions vs audio)

### 5. Integration Updates
- Updated status route to use the new post-processor
- Cleaner error handling and logging
- Better transcript source tracking

### 6. Long-form Video Support
- **Video Type Detection**: Automatically categorizes videos as 'short' (≤60s), 'regular' (60s-20min), or 'long-form' (>20min)
- **Chapter Extraction**: Extracts chapters from video data or timestamps in description
- **Transcript Chunking**: Splits long transcripts into manageable chunks for analysis
- **Special Processing**: Long-form videos skip audio transcription and rely on captions only
- **Duration Parsing**: Handles ISO 8601 duration format (PT1H2M10S)

## Architecture

### Service Layer
```
ApifyService
├── scrapeYouTube() - Enhanced with better input configuration
├── validateUrl() - Extended for more YouTube URL formats
└── normalizeScrapedData() - Improved data extraction

YouTubePostProcessor
├── processYouTubeContent() - Main processing method
├── processBatch() - Batch processing support
├── canProcess() - Eligibility check
├── processLongFormVideo() - Special handling for long videos
└── chunkTranscript() - Split long transcripts

YouTubeLongFormAnalyzer
├── analyzeLongFormContent() - Main analysis method
├── analyzeChunkedContent() - Process chunked transcripts
├── analyzeRegularContent() - Process regular content
└── generateContentStrategy() - Content recommendations

YouTubeCaptionService
├── extractCaptions() - Extract from scraped data
├── fetchTranscriptDirect() - Direct API fetch
└── extractVideoId() - Video ID extraction

YouTubeTranscriptionService
├── transcribeYouTubeVideo() - Audio transcription
├── transcribeYouTubeDevelopment() - Local dev mode
└── transcribeYouTubeProduction() - Production mode
```

### Data Flow
1. User submits YouTube URL
2. ApifyService validates and starts scrape
3. Apify actor returns raw data
4. ApifyService normalizes the data
5. YouTubePostProcessor attempts transcript extraction
6. Final data includes transcript and source metadata

## Usage Examples

### Scraping a YouTube Video
```typescript
const apifyService = new ApifyService();
const postProcessor = new YouTubePostProcessor();

// Start scraping
const { runId } = await apifyService.scrapeYouTube('https://youtube.com/watch?v=...');

// Get results
const scrapedContent = await apifyService.getRunResults(runId);

// Post-process for transcripts
const processedContent = await postProcessor.processYouTubeContent(scrapedContent);
```

### Supported URL Formats
- Regular videos: `https://youtube.com/watch?v=VIDEO_ID`
- Shorts: `https://youtube.com/shorts/VIDEO_ID`
- Playlists: `https://youtube.com/playlist?list=PLAYLIST_ID`
- Short URLs: `https://youtu.be/VIDEO_ID`
- Embedded: `https://youtube.com/embed/VIDEO_ID`

## Configuration

### Post-Processor Options
```typescript
{
  preferCaptions: true,           // Try captions before audio
  transcribeIfNoCaptions: true,   // Fall back to audio transcription
  maxTranscriptionDuration: 600,  // Max video length in seconds
  handleLongForm: true,           // Special handling for long videos
  chunkLongTranscripts: true,     // Split long transcripts
  maxChunkSize: 3000              // Characters per chunk
}
```

### Video Type Classification
- **Short**: ≤ 60 seconds (or `/shorts/` URL)
- **Regular**: 60 seconds to 20 minutes
- **Long-form**: > 20 minutes

### Long-form Video Features
1. **Automatic Chapter Detection**
   - From video metadata
   - From timestamps in description
   - With start/end time calculation

2. **Transcript Chunking**
   - Splits at sentence boundaries
   - Maintains context within chunks
   - Stored for separate analysis

3. **Optimized Processing**
   - Skips audio transcription for long videos
   - Relies on YouTube captions only
   - Faster processing time

## Testing
A test script is available at `src/scripts/testYouTubeScraper.ts`:
```bash
npx tsx src/scripts/testYouTubeScraper.ts
```

## Example: Long-form Video Processing
```typescript
// Scraping a 45-minute tutorial
const longFormVideo = await apifyService.scrapeYouTube('https://youtube.com/watch?v=...');

// Result includes:
{
  videoType: 'long-form',
  duration: 2700, // 45 minutes in seconds
  chapters: [
    { title: 'Introduction', startTime: 0, endTime: 120 },
    { title: 'Main Content', startTime: 120, endTime: 2400 },
    { title: 'Conclusion', startTime: 2400 }
  ],
  rawData: {
    isChunked: true,
    transcriptChunks: [...], // Array of text chunks
    requiresChunkedAnalysis: true
  }
}
```

## Future Enhancements
1. Support for YouTube Live streams
2. Channel-level content scraping
3. Comment sentiment analysis
4. Enhanced chapter-based navigation
5. Multilingual caption support
6. AI-powered summary generation for long-form content
7. Automatic highlight extraction from long videos