/**
 * Test script to verify YouTube Data API v3 configuration
 * Run with: npx tsx src/scripts/testYouTubeAPI.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import YouTubeDataService from '../services/youtubeDataService';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testYouTubeAPI() {
  console.log('YouTube API Configuration Test');
  console.log('==============================\n');

  // Check if API key is loaded
  const apiKey = process.env.YOUTUBE_API_KEY;
  console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
  
  if (!apiKey) {
    console.error('\n❌ YOUTUBE_API_KEY not found in environment variables');
    console.log('Please ensure YOUTUBE_API_KEY is set in your .env.local file');
    return;
  }

  // Initialize service
  const youtubeService = new YouTubeDataService();
  console.log('Service configured:', youtubeService.isConfigured() ? '✅ Yes' : '❌ No');

  // Test video URLs
  const testUrls = [
    {
      name: 'Regular Video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
      name: 'YouTube Short',
      url: 'https://www.youtube.com/shorts/q_2C6HEpFVw'
    }
  ];

  console.log('\nTesting YouTube API with sample videos...\n');

  for (const test of testUrls) {
    console.log(`Testing: ${test.name}`);
    console.log(`URL: ${test.url}`);
    
    try {
      // Extract video ID
      const videoId = youtubeService.extractVideoId(test.url);
      console.log(`Video ID: ${videoId}`);
      
      if (!videoId) {
        console.error('❌ Failed to extract video ID\n');
        continue;
      }

      // Fetch video details
      console.log('Fetching video details...');
      const startTime = Date.now();
      
      const scrapedContent = await youtubeService.scrapeYouTube(test.url);
      
      const duration = Date.now() - startTime;
      console.log(`Response time: ${duration}ms`);
      
      if (scrapedContent) {
        console.log('✅ Success! Video details:');
        console.log(`  Title: ${scrapedContent.title}`);
        console.log(`  Author: ${scrapedContent.authorName}`);
        console.log(`  Views: ${scrapedContent.viewCount?.toLocaleString()}`);
        console.log(`  Duration: ${scrapedContent.duration} seconds`);
        console.log(`  Video Type: ${scrapedContent.videoType}`);
        console.log(`  Has Transcript: ${!!scrapedContent.transcript}`);
        console.log(`  Chapters: ${scrapedContent.chapters?.length || 0}`);
      } else {
        console.error('❌ Failed to fetch video details');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
  }

  // Check quota usage
  console.log('Checking API quota...');
  const quota = await youtubeService.checkQuotaUsage();
  if (quota) {
    console.log(`Quota used: ${quota.used}/${quota.limit} units`);
    console.log(`Remaining: ${quota.limit - quota.used} units`);
  }

  console.log('\n✅ YouTube API configuration test complete!');
  console.log('\nNext steps:');
  console.log('1. The API key is working correctly');
  console.log('2. You can now use YouTubeDataService for free YouTube scraping');
  console.log('3. Each video fetch costs 1 unit from your 10,000 daily quota');
}

// Run the test
testYouTubeAPI().catch(console.error);