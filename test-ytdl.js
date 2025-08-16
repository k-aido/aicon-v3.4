const ytdl = require('ytdl-core');

async function testYtdl() {
  const url = 'https://www.youtube.com/shorts/V5CSSGYLwcQ';
  
  console.log('Testing ytdl-core with URL:', url);
  console.log('ytdl-core version:', require('ytdl-core/package.json').version);
  
  try {
    // Test URL validation
    console.log('\n1. Testing URL validation...');
    const isValid = ytdl.validateURL(url);
    console.log('   URL is valid:', isValid);
    
    if (!isValid) {
      console.log('   URL validation failed!');
      return;
    }
    
    // Test getting video info
    console.log('\n2. Testing getInfo...');
    const info = await ytdl.getInfo(url);
    
    console.log('   Video info retrieved successfully!');
    console.log('   Title:', info.videoDetails.title);
    console.log('   Duration:', info.videoDetails.lengthSeconds, 'seconds');
    console.log('   Video ID:', info.videoDetails.videoId);
    console.log('   Total formats:', info.formats.length);
    
    // Check audio formats
    const audioFormats = info.formats.filter(f => f.hasAudio && !f.hasVideo);
    console.log('   Audio-only formats:', audioFormats.length);
    
    if (audioFormats.length > 0) {
      console.log('   First audio format:', {
        itag: audioFormats[0].itag,
        container: audioFormats[0].container,
        audioCodec: audioFormats[0].audioCodec,
        audioQuality: audioFormats[0].audioQuality
      });
    }
    
    console.log('\n✅ ytdl-core is working properly!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testYtdl();