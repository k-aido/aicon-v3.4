/**
 * Test script to verify YouTube creator search functionality
 * Run with: npx tsx src/scripts/testYouTubeCreatorSearch.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testYouTubeCreatorSearch() {
  console.log('Testing YouTube Creator Search API');
  console.log('=================================\n');

  // Test configuration
  const apiUrl = 'http://localhost:3000/api/creators/search';
  const testHandle = 'mkbhd'; // Popular tech YouTube channel
  const userId = '5cedf725-3b56-4764-bbe0-0117a0ba7f49';

  console.log('Testing YouTube creator search...');
  console.log('Handle:', testHandle);

  try {
    // Make search request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'youtube',
        searchQuery: testHandle,
        filter: 'top_views',
        contentType: 'videos',
        userId: userId
      })
    });

    const data = await response.json();
    
    console.log('\nResponse status:', response.status);
    
    if (response.ok) {
      console.log('✅ Search initiated successfully!');
      console.log('Search ID:', data.searchId);
      console.log('Status:', data.status);
      
      if (data.status === 'completed' && data.content) {
        console.log('\n🎉 YouTube search returned immediate results!');
        console.log(`Found ${data.content.length} videos`);
        
        // Display first few videos
        console.log('\nFirst 3 videos:');
        data.content.slice(0, 3).forEach((video: any, index: number) => {
          console.log(`\n${index + 1}. ${video.caption}`);
          console.log(`   URL: ${video.content_url}`);
          console.log(`   Views: ${video.views?.toLocaleString() || 0}`);
          console.log(`   Likes: ${video.likes?.toLocaleString() || 0}`);
          console.log(`   Comments: ${video.comments?.toLocaleString() || 0}`);
          console.log(`   Thumbnail: ${video.thumbnail_url ? '✅' : '❌'}`);
        });
      } else {
        console.log('\nNote: Search is processing asynchronously.');
        console.log('In production, the UI would poll for results.');
      }
    } else {
      console.error('\n❌ Search failed:', data.error);
      if (data.details) {
        console.error('Details:', data.details);
      }
    }

  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }

  console.log('\n\nConfiguration Summary:');
  console.log('- YouTube API Key:', process.env.YOUTUBE_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('- Server URL:', apiUrl);
}

// Note about running locally
console.log('Note: This test requires the Next.js server to be running.');
console.log('Start the server with: npm run dev\n');

// Run the test
testYouTubeCreatorSearch().catch(console.error);