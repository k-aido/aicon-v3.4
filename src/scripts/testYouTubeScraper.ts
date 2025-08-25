/**
 * Test script for YouTube scraper functionality
 * Run with: npx tsx src/scripts/testYouTubeScraper.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import ApifyService from '../services/apifyService';
import YouTubePostProcessor from '../services/youtubePostProcessor';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Test URLs
const TEST_URLS = {
  regularVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  shortVideo: 'https://www.youtube.com/shorts/abcdefghijk',
  playlistUrl: 'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
  shortUrl: 'https://youtu.be/dQw4w9WgXcQ'
};

async function testUrlValidation() {
  console.log('\n=== Testing URL Validation ===\n');
  
  const urls = [
    ...Object.values(TEST_URLS),
    'https://www.youtube.com/invalid',
    'https://www.instagram.com/p/test123',
    'https://invalid-url.com'
  ];
  
  for (const url of urls) {
    const result = ApifyService.validateUrl(url);
    console.log(`URL: ${url}`);
    console.log(`Valid: ${result.isValid}, Platform: ${result.platform || 'N/A'}, Error: ${result.error || 'None'}`);
    console.log('---');
  }
}

async function testYouTubeScraping(url: string, description: string) {
  console.log(`\n=== Testing ${description} ===\n`);
  console.log(`URL: ${url}`);
  
  try {
    // Validate URL
    const validation = ApifyService.validateUrl(url);
    if (!validation.isValid) {
      console.error('Invalid URL:', validation.error);
      return;
    }
    
    // Initialize services
    const apifyService = new ApifyService();
    const postProcessor = new YouTubePostProcessor();
    
    // Start scraping
    console.log('Starting scrape...');
    const { runId } = await apifyService.scrapeYouTube(url);
    console.log('Scrape started with run ID:', runId);
    
    // Poll for results
    console.log('Polling for results...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    let scrapedContent = null;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const status = await apifyService.getRunStatus(runId);
      console.log(`Attempt ${attempts + 1}: Status = ${status.status}`);
      
      if (status.status === 'SUCCEEDED') {
        scrapedContent = await apifyService.getRunResults(runId);
        break;
      } else if (status.status === 'FAILED' || status.status === 'ABORTED') {
        console.error('Scrape failed with status:', status.status);
        return;
      }
      
      attempts++;
    }
    
    if (!scrapedContent) {
      console.error('Timeout waiting for scrape results');
      return;
    }
    
    // Display initial results
    console.log('\n--- Initial Scraped Content ---');
    console.log('Title:', scrapedContent.title);
    console.log('Author:', scrapedContent.authorName);
    console.log('Views:', scrapedContent.viewCount);
    console.log('Likes:', scrapedContent.likeCount);
    console.log('Has Thumbnail:', !!scrapedContent.thumbnailUrl);
    console.log('Has Video URL:', !!scrapedContent.videoUrl);
    console.log('Has Initial Transcript:', !!scrapedContent.transcript);
    console.log('Initial Transcript Length:', scrapedContent.transcript?.length || 0);
    
    // Post-process for transcripts
    console.log('\n--- Post-Processing for Transcripts ---');
    const processedContent = await postProcessor.processYouTubeContent(scrapedContent);
    
    console.log('Has Transcript After Processing:', !!processedContent.transcript);
    console.log('Transcript Length:', processedContent.transcript?.length || 0);
    console.log('Transcript Source:', processedContent.rawData?.transcriptSource || 'none');
    
    if (processedContent.transcript) {
      console.log('Transcript Preview (first 200 chars):');
      console.log(processedContent.transcript.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function runAllTests() {
  console.log('YouTube Scraper Test Suite');
  console.log('========================\n');
  
  // Test URL validation
  await testUrlValidation();
  
  // Test scraping (only test one URL to avoid excessive API usage)
  // Uncomment the tests you want to run
  
  // await testYouTubeScraping(TEST_URLS.regularVideo, 'Regular Video');
  // await testYouTubeScraping(TEST_URLS.shortVideo, 'YouTube Shorts');
  // await testYouTubeScraping(TEST_URLS.shortUrl, 'Short URL (youtu.be)');
  
  console.log('\n=== Test Suite Complete ===');
  console.log('\nNote: Scraping tests are commented out to avoid API usage.');
  console.log('Uncomment specific tests in the script to run them.');
}

// Run tests
runAllTests().catch(console.error);