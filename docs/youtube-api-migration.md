# YouTube API Migration Guide

## Overview
Your YouTube API key has been successfully configured. This guide explains how to migrate from Apify to the YouTube Data API for cost-effective scraping.

## Configuration Status ✅
- **YouTube API Key**: Configured in `.env.local`
- **Key**: `AIzaSyD7o29yTgmdCckB3n5HpFSMjLfd2izL3sM`
- **Daily Quota**: 10,000 units (free)

## Testing Your Configuration

Run the test script to verify everything is working:

```bash
cd /Users/kdo/Downloads/v.3.4-aicon/aicon-v3.4
npx tsx src/scripts/testYouTubeAPI.ts
```

This will:
- Verify the API key is loaded correctly
- Test fetching video metadata
- Show response times and data quality
- Display remaining quota

## New API Endpoint

A new scraping endpoint has been created at `/api/content/scrape/v2` that:
- Uses YouTube Data API for YouTube content (free)
- Falls back to Apify only if needed
- Maintains compatibility with existing code

### Using the New Endpoint

```javascript
// Frontend usage remains the same, just update the endpoint
const response = await fetch('/api/content/scrape/v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=...',
    projectId: projectId,
    preferFreeMethod: true // Default is true
  })
});
```

## Migration Steps

### Option 1: Gradual Migration (Recommended)
1. Keep existing `/api/content/scrape` endpoint as-is
2. Update frontend components to use `/api/content/scrape/v2`
3. Monitor both endpoints during transition
4. Remove old endpoint after verification

### Option 2: Direct Update
1. Update the existing scrape route to use YouTube API
2. Add logic from `v2/route.ts` to main route
3. Test thoroughly before deploying

## Cost Comparison

| Method | Cost per YouTube Scrape | Daily Limit |
|--------|------------------------|-------------|
| Old (Apify) | 50 credits + $0.05 | Based on credits |
| New (YouTube API) | FREE | 10,000 videos |

## What You Get with YouTube API

### Included Data ✅
- Video title, description
- View/like/comment counts
- Channel information
- Upload date and duration
- Thumbnails (all sizes)
- Video type detection
- Chapter extraction from description

### Not Included ❌
- Direct video download URLs
- Comments (requires additional API calls)
- Live status (requires additional API calls)

### Transcript Handling
The system will try multiple methods:
1. Direct caption fetch (free)
2. Whisper transcription for short videos
3. Skip transcription for long videos

## Monitoring Usage

Check your YouTube API usage:
- [Google Cloud Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics)
- Or use the built-in quota check in the test script

## Rollback Plan

If you need to rollback:
1. Simply use the original `/api/content/scrape` endpoint
2. Remove `YOUTUBE_API_KEY` from `.env.local` to disable
3. Everything will work as before with Apify

## Next Steps

1. **Test the implementation**:
   ```bash
   npx tsx src/scripts/testYouTubeAPI.ts
   ```

2. **Update your frontend** to use the new endpoint:
   - Change `/api/content/scrape` to `/api/content/scrape/v2`
   - No other changes needed

3. **Monitor the results**:
   - Check scraping success rates
   - Verify transcript quality
   - Monitor API quota usage

4. **Optimize further**:
   - Implement caching for frequently accessed videos
   - Add batch processing for multiple videos
   - Consider premium YouTube API quota if needed

## Troubleshooting

### API Key Issues
- Ensure the key is in `.env.local` not `.env`
- Restart your dev server after adding the key
- Check for typos in the key

### Quota Exceeded
- YouTube API has 10,000 units/day quota
- Each video fetch = 1 unit
- Resets at midnight Pacific Time

### Missing Data
- Some data requires additional API calls
- Transcripts use fallback methods
- Long videos skip audio transcription

## Support

The implementation includes:
- Automatic fallback to Apify if YouTube API fails
- Detailed error logging
- Credit protection (free methods don't consume credits)

Your YouTube scraping is now configured for maximum efficiency and minimum cost!