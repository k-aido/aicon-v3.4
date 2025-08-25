/**
 * Test script to verify the updated scraping API with YouTube integration
 * Run with: npx tsx src/scripts/testUpdatedScraping.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testScraping() {
  console.log('Testing Updated Scraping API');
  console.log('============================\n');

  // Test configuration
  const apiUrl = 'http://localhost:3000/api/content/scrape';
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const projectId = 'test-project-123';

  console.log('Testing YouTube scraping with integrated API...');
  console.log('URL:', testUrl);

  try {
    // Make scraping request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add mock auth cookie if needed
      },
      body: JSON.stringify({
        url: testUrl,
        projectId: projectId,
        preferFreeMethod: true
      })
    });

    const data = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Scraping initiated successfully!');
      console.log('Scrape ID:', data.scrapeId);
      console.log('Method used:', data.method || 'unknown');
      console.log('Status:', data.status);
      
      // If completed immediately (YouTube API), show the data
      if (data.status === 'completed') {
        console.log('\n🎉 YouTube API returned immediate results!');
        console.log('This means the free API is working correctly.');
      } else {
        console.log('\nScraping is processing. Check status endpoint for updates.');
      }
    } else {
      console.error('\n❌ Scraping failed:', data.error);
    }

  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }

  console.log('\n\nAPI Integration Summary:');
  console.log('- YouTube API Key:', process.env.YOUTUBE_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('- Apify Token:', process.env.APIFY_API_TOKEN ? '✅ Configured' : '❌ Missing');
  console.log('- Expected behavior: YouTube videos should use free API first');
}

// Note about running locally
console.log('Note: This test requires the Next.js server to be running.');
console.log('Start the server with: npm run dev\n');

// Run the test
testScraping().catch(console.error);