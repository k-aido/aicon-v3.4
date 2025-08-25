import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';
import type { 
  CreatorSearchRequest, 
  CreatorSearchResponse, 
  Creator, 
  CreatorContent,
  ApifyTikTokVideo,
  ApifyTikTokProfile
} from '@/types/creator-search';

// Instagram handle/URL validation
function validateInstagramInput(input: string): { isValid: boolean; handle: string; error?: string } {
  const trimmed = input.trim();
  
  // Remove @ if present
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  
  // Handle URL format
  if (withoutAt.includes('instagram.com')) {
    const urlMatch = withoutAt.match(/instagram\.com\/([^\/\?]+)/);
    if (!urlMatch || !urlMatch[1]) {
      return { isValid: false, handle: '', error: 'Invalid Instagram URL format' };
    }
    const handle = urlMatch[1];
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
      return { isValid: false, handle: '', error: 'Invalid Instagram handle format' };
    }
    return { isValid: true, handle };
  }
  
  // Handle direct username
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(withoutAt)) {
    return { isValid: false, handle: '', error: 'Instagram handle must be 1-30 characters and contain only letters, numbers, periods, and underscores' };
  }
  
  return { isValid: true, handle: withoutAt };
}

// TikTok handle/URL validation
function validateTikTokInput(input: string): { isValid: boolean; handle: string; error?: string } {
  const trimmed = input.trim();
  
  // Remove @ if present
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  
  // Handle URL format
  if (withoutAt.includes('tiktok.com')) {
    // TikTok URLs can be tiktok.com/@username or vm.tiktok.com/...
    const urlMatch = withoutAt.match(/tiktok\.com\/@?([^\/\?]+)/);
    if (!urlMatch || !urlMatch[1]) {
      return { isValid: false, handle: '', error: 'Invalid TikTok URL format' };
    }
    const handle = urlMatch[1].replace('@', '');
    if (!/^[a-zA-Z0-9._]{1,24}$/.test(handle)) {
      return { isValid: false, handle: '', error: 'Invalid TikTok handle format' };
    }
    return { isValid: true, handle };
  }
  
  // Handle direct username
  if (!/^[a-zA-Z0-9._]{1,24}$/.test(withoutAt)) {
    return { isValid: false, handle: '', error: 'TikTok handle must be 1-24 characters and contain only letters, numbers, periods, and underscores' };
  }
  
  return { isValid: true, handle: withoutAt };
}

// Check if content is cached and still valid
async function getCachedContent(handle: string, platform: 'instagram' | 'tiktok'): Promise<{ creator: Creator | null; content: CreatorContent[] }> {
  try {
    // Find creator by platform handle
    const handleField = platform === 'instagram' ? 'instagram_handle' : 'tiktok_handle';
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('*')
      .eq(handleField, handle)
      .single();

    if (!creator) {
      return { creator: null, content: [] };
    }

    // Check for valid cached content
    const { data: content } = await supabaseAdmin
      .from('creator_content')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('platform', platform)
      .gt('cached_until', new Date().toISOString())
      .order('posted_date', { ascending: false });

    return { 
      creator, 
      content: content || [] 
    };
  } catch (error) {
    console.error('Error checking cached content:', error);
    return { creator: null, content: [] };
  }
}

// Scrape Instagram data using Apify synchronous API - Always fetches reels
async function scrapeInstagramReels(handle: string, filter: string): Promise<{ content: any[]; error?: string }> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  
  if (!apifyToken) {
    return { content: [], error: 'Apify API token not configured' };
  }

  try {
    // Only fetch reels
    const reelsPayload = {
      username: [handle.replace('@', '')],
      resultsLimit: 10,
    };
    
    console.log('[Creator Search] Instagram Reel Scraper request:', {
      url: 'https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items',
      handle: handle.replace('@', ''),
      payload: reelsPayload
    });
    
    const reelsResponse = await fetch(`https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reelsPayload)
    });

    // Handle reels response
    let reels: any[] = [];
    if (reelsResponse && reelsResponse.ok) {
      const reelsData = await reelsResponse.json();
      console.log(`[Creator Search] Reel Scraper response type:`, typeof reelsData, 'isArray:', Array.isArray(reelsData));
      if (Array.isArray(reelsData)) {
        // Transform reel data to match post format for consistency
        reels = reelsData.map((reel: any) => {
          // Extract thumbnail URL from available data
          // Instagram Reel Scraper may provide thumbnail in different fields
          let thumbnailUrl = reel.thumbnailUrl || 
                           reel.displayUrl || 
                           reel.imageUrl || 
                           reel.thumbnail ||
                           reel.coverImageUrl ||
                           reel.videoCoverImageUrl ||
                           '';
          
          // Debug: Log what data we're getting for the first reel
          if (reelsData.indexOf(reel) === 0) {
            console.log('[Creator Search] First reel full data:', JSON.stringify(reel, null, 2));
          }
          
          return {
            ...reel,
            url: reel.url || `https://www.instagram.com/reel/${reel.shortCode}/`,
            displayUrl: thumbnailUrl, // Use our extracted/constructed thumbnail
            thumbnailUrl: thumbnailUrl, // Also set thumbnailUrl directly
            isVideo: true,
            productType: 'clips',
            type: 'reel',
            likesCount: reel.likesCount,
            commentsCount: reel.commentsCount,
            videoViewCount: reel.videoViewCount,
            videoDuration: reel.videoDuration,
            caption: reel.caption,
            timestamp: reel.timestamp,
            ownerFullName: reel.ownerFullName,
            ownerUsername: reel.ownerUsername,
            ownerId: reel.ownerId,
          };
        });
        console.log(`[Creator Search] Successfully fetched ${reels.length} reels for ${handle}`);
      } else {
        console.error('[Creator Search] Unexpected reels response format:', reelsData);
      }
    } else if (reelsResponse) {
      const errorText = await reelsResponse.text();
      console.error('[Creator Search] Failed to fetch reels:', {
        status: reelsResponse.status,
        statusText: reelsResponse.statusText,
        errorBody: errorText,
        handle: handle
      });
      
      if (reelsResponse.status === 403) {
        return { content: [], error: 'This account is private and cannot be accessed' };
      }
      if (reelsResponse.status === 404) {
        return { content: [], error: 'Instagram account not found' };
      }
      if (reelsResponse.status === 429) {
        return { content: [], error: 'Rate limit exceeded. Please try again later' };
      }
      
      return { content: [], error: 'Failed to fetch reels' };
    }

    // Check if we have reels
    if (reels.length === 0) {
      return { content: [], error: 'No reels found for this creator' };
    }

    // Sort reels based on filter
    let sortedContent = reels;
    switch (filter) {
      case 'top_likes':
        sortedContent = reels.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
        break;
      case 'top_comments':
        sortedContent = reels.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
        break;
      case 'top_views':
        sortedContent = reels.sort((a, b) => (b.videoViewCount || b.likesCount || 0) - (a.videoViewCount || a.likesCount || 0));
        break;
      case 'most_recent':
        sortedContent = reels.sort((a, b) => {
          const dateA = new Date(a.timestamp || 0).getTime();
          const dateB = new Date(b.timestamp || 0).getTime();
          return dateB - dateA;
        });
        break;
    }

    // Limit to top 10 results after sorting
    return { content: sortedContent.slice(0, 10) };
  } catch (error) {
    console.error('Error scraping Instagram data:', error);
    return { content: [], error: 'Failed to connect to scraping service' };
  }
}

// Scrape TikTok data using Apify synchronous API
async function scrapeTikTokVideos(handle: string, filter: string): Promise<{ content: any[]; profile?: any; error?: string }> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  
  if (!apifyToken) {
    return { content: [], error: 'Apify API token not configured' };
  }

  try {
    const payload = {
      profiles: [`@${handle.replace('@', '')}`],
      resultsPerPage: 10,
      shouldDownloadVideos: false,
      shouldDownloadCovers: true,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false
    };
    
    console.log('[Creator Search] TikTok Profile Scraper request:', {
      url: 'https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items',
      handle: handle.replace('@', ''),
      payload
    });
    
    const response = await fetch(`https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response || !response.ok) {
      const errorText = await response.text();
      console.error('[Creator Search] Failed to fetch TikTok videos:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        handle: handle
      });
      
      if (response.status === 403) {
        return { content: [], error: 'This account is private and cannot be accessed' };
      }
      if (response.status === 404) {
        return { content: [], error: 'TikTok account not found' };
      }
      if (response.status === 429) {
        return { content: [], error: 'Rate limit exceeded. Please try again later' };
      }
      
      return { content: [], error: 'Failed to fetch TikTok videos' };
    }

    const data = await response.json();
    console.log(`[Creator Search] TikTok Scraper response type:`, typeof data, 'isArray:', Array.isArray(data));
    console.log(`[Creator Search] TikTok response length:`, Array.isArray(data) ? data.length : 'not array');
    
    // The response should be an array
    if (!Array.isArray(data) || data.length === 0) {
      console.error('[Creator Search] Unexpected TikTok response format:', JSON.stringify(data, null, 2));
      return { content: [], error: 'No data found for this TikTok creator' };
    }

    // Check if the response is an array of videos directly or an array with profile objects
    let videos: any[] = [];
    let profileData: any = {};
    
    // First item structure check
    const firstItem = data[0];
    console.log('[Creator Search] First item structure:', {
      type: typeof firstItem,
      keys: firstItem ? Object.keys(firstItem).slice(0, 10) : [],
      hasId: !!firstItem?.id,
      hasVideoUrl: !!firstItem?.videoUrl || !!firstItem?.webVideoUrl,
      hasAuthorMeta: !!firstItem?.authorMeta,
      isVideoObject: !!(firstItem?.id && (firstItem?.videoUrl || firstItem?.webVideoUrl || firstItem?.playUrl))
    });
    
    // If the first item looks like a video object (has id and video URLs), treat the array as videos
    if (firstItem?.id && (firstItem?.videoUrl || firstItem?.webVideoUrl || firstItem?.playUrl || firstItem?.downloadLink)) {
      videos = data;
      // Extract profile data from the first video's author metadata
      if (firstItem.authorMeta) {
        profileData = firstItem.authorMeta;
      }
      console.log(`[Creator Search] Response contains ${videos.length} videos directly`);
    } else {
      // Otherwise, assume it's a profile object with nested videos
      profileData = firstItem;
      videos = profileData?.videos || profileData?.posts || profileData?.itemList || [];
      console.log(`[Creator Search] Response contains profile with ${videos.length} nested videos`);
    }
    
    if (videos.length === 0) {
      console.error('[Creator Search] No videos found. Full first item structure:', JSON.stringify(firstItem, null, 2).substring(0, 2000));
      return { content: [], error: 'No videos found for this creator' };
    }

    console.log(`[Creator Search] Successfully fetched ${videos.length} TikTok videos for ${handle}`);
    
    // Debug: Log first video structure
    if (videos.length > 0) {
      console.log('[Creator Search] First TikTok video data:', JSON.stringify(videos[0], null, 2));
    }

    // Sort videos based on filter
    let sortedContent = videos;
    switch (filter) {
      case 'top_likes':
        sortedContent = videos.sort((a, b) => (b.diggCount || 0) - (a.diggCount || 0));
        break;
      case 'top_comments':
        sortedContent = videos.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
        break;
      case 'top_views':
        sortedContent = videos.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        break;
      case 'most_recent':
        sortedContent = videos.sort((a, b) => {
          const dateA = a.createTime || 0;
          const dateB = b.createTime || 0;
          return dateB - dateA;
        });
        break;
    }

    // Limit to top 10 results after sorting
    return { 
      content: sortedContent.slice(0, 10),
      profile: profileData || {}
    };
  } catch (error) {
    console.error('Error scraping TikTok data:', error);
    return { content: [], error: 'Failed to connect to scraping service' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatorSearchRequest = await request.json();
    const { platform, searchQuery, filter, contentType = 'all', userId } = body;

    // Validate request
    if (!platform || !['instagram', 'tiktok'].includes(platform)) {
      return NextResponse.json({ 
        error: 'Invalid platform. Only Instagram and TikTok are supported.' 
      }, { status: 400 });
    }

    if (!searchQuery || typeof searchQuery !== 'string') {
      return NextResponse.json({ 
        error: 'Search query is required' 
      }, { status: 400 });
    }

    if (!filter || !['top_likes', 'top_comments', 'top_views', 'most_recent'].includes(filter)) {
      return NextResponse.json({ 
        error: 'Invalid filter. Must be one of: top_likes, top_comments, top_views, most_recent' 
      }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 401 });
    }

    // Validate handle/URL based on platform
    let validation;
    if (platform === 'instagram') {
      validation = validateInstagramInput(searchQuery);
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: validation.error || 'Invalid Instagram handle or URL' 
        }, { status: 400 });
      }
    } else if (platform === 'tiktok') {
      validation = validateTikTokInput(searchQuery);
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: validation.error || 'Invalid TikTok handle or URL' 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid platform' 
      }, { status: 400 });
    }

    const handle = validation.handle;
    console.log(`[Creator Search] Processing ${platform} handle: ${handle}`);

    // Check cache first
    const { creator, content: cachedContent } = await getCachedContent(handle, platform);
    
    if (cachedContent.length > 0) {
      console.log(`[Creator Search] Returning cached content for ${handle}: ${cachedContent.length} posts`);
      
      // Update existing creator search or create new one
      const { data: searchRecord } = await supabaseAdmin
        .from('creator_searches')
        .insert({
          user_id: userId,
          search_query: searchQuery,
          platform: platform,
          search_type: searchQuery.includes(`.com`) ? 'url' : 'handle',
          results_count: cachedContent.length,
          status: 'completed'
        })
        .select()
        .single();

      const response: CreatorSearchResponse = {
        searchId: searchRecord?.id || 'cached',
        status: 'completed',
        content: cachedContent,
        message: `Found ${cachedContent.length} cached posts for @${handle}`
      };

      return NextResponse.json(response);
    }

    // No cache, scrape data directly based on platform
    console.log(`[Creator Search] No cached content, starting scrape for ${handle} on ${platform}`);
    
    let scrapedContent: any[];
    let error: string | undefined;
    let profileData: any = {};
    
    if (platform === 'instagram') {
      const result = await scrapeInstagramReels(handle, filter);
      scrapedContent = result.content;
      error = result.error;
    } else if (platform === 'tiktok') {
      const result = await scrapeTikTokVideos(handle, filter);
      scrapedContent = result.content;
      profileData = result.profile;
      error = result.error;
    } else {
      return NextResponse.json({ 
        error: 'Invalid platform' 
      }, { status: 400 });
    }
    
    if (error) {
      return NextResponse.json({ 
        error: error 
      }, { status: 500 });
    }

    // Process and store the Instagram posts immediately
    if (scrapedContent && scrapedContent.length > 0) {
      try {
        // Debug: Log sample post structure to understand Apify response format
        console.log('Sample post from Apify:', JSON.stringify(scrapedContent[0], null, 2));
        
        // Helper function to safely parse integers
        const safeParseInt = (value: any, fallback: number = 0): number => {
          if (value === null || value === undefined || value === '') return fallback;
          const parsed = parseInt(String(value), 10);
          return isNaN(parsed) ? fallback : parsed;
        };

        // Helper function to safely parse timestamp
        const safeParseTimestamp = (timestamp: any): string => {
          if (!timestamp) return new Date().toISOString();
          
          // Handle Unix timestamp (seconds)
          if (typeof timestamp === 'number' && timestamp < 9999999999) {
            return new Date(timestamp * 1000).toISOString();
          }
          
          // Handle Unix timestamp (milliseconds) or ISO string
          try {
            return new Date(timestamp).toISOString();
          } catch {
            return new Date().toISOString();
          }
        };
        
        // Create or update creator record
        let creatorRecord = creator;
        if (!creatorRecord) {
          let creatorData: any = {
            platform: platform,
            username: handle,
            profile_url: platform === 'instagram' 
              ? `https://www.instagram.com/${handle}` 
              : `https://www.tiktok.com/@${handle}`,
            last_scraped_at: new Date().toISOString()
          };

          if (platform === 'instagram') {
            creatorData.instagram_handle = handle;
            creatorData.display_name = scrapedContent[0]?.ownerFullName || handle;
            creatorData.metadata = {
              followers: safeParseInt(scrapedContent[0]?.ownerFollowersCount),
              biography: scrapedContent[0]?.ownerBiography || '',
              profile_image_url: scrapedContent[0]?.ownerProfilePicUrl || '',
              verified: scrapedContent[0]?.ownerIsVerified || false,
              is_private: scrapedContent[0]?.ownerIsPrivate || false,
              following_count: safeParseInt(scrapedContent[0]?.ownerFollowsCount)
            };
          } else if (platform === 'tiktok') {
            creatorData.tiktok_handle = handle;
            creatorData.display_name = profileData?.nickname || profileData?.uniqueId || handle;
            creatorData.metadata = {
              biography: profileData?.signature || '',
              profile_image_url: profileData?.avatarLarger || profileData?.avatarMedium || ''
            };
          }

          const { data: newCreator, error: creatorError } = await supabaseAdmin
            .from('creators')
            .insert(creatorData)
            .select()
            .single();

          if (creatorError) {
            console.error('Error creating creator:', {
              code: creatorError.code,
              message: creatorError.message,
              details: creatorError.details,
              hint: creatorError.hint
            });
            return NextResponse.json({ 
              error: `Failed to save creator data: ${creatorError.message}`,
              errorCode: creatorError.code,
              details: creatorError.details
            }, { status: 500 });
          }
          creatorRecord = newCreator;
        }

        // Process and insert content with proper type conversion
        const contentRecords = scrapedContent.map((post: any) => {
          if (platform === 'instagram') {
            // Instagram content processing
            let contentUrl = post.url || post.link || '';
            
            // Check if this is a reel based on various indicators
            const isReel = post.productType === 'clips' || 
                          post.type === 'reel' || 
                          contentUrl.includes('/reel/') ||
                          (post.isVideo && post.videoDuration && post.videoDuration <= 90);
            
            // Ensure reel URLs are in the correct format
            if (isReel && contentUrl && !contentUrl.includes('/reel/')) {
              // Convert regular post URL to reel URL if it's actually a reel
              const shortCode = contentUrl.match(/\/p\/([^\/]+)/)?.[1] || post.shortCode;
              if (shortCode) {
                contentUrl = `https://www.instagram.com/reel/${shortCode}/`;
                console.log(`[Creator Search] Converted to reel URL: ${contentUrl}`);
              }
            }
            
            return {
              creator_id: creatorRecord!.id,
              platform: 'instagram',
              content_url: contentUrl,
              thumbnail_url: post.thumbnailUrl || post.displayUrl || post.images?.[0] || post.thumbnailSrc || post.thumbnail || '',
              video_url: post.videoUrl || null,
              caption: post.caption || post.text || '',
              likes: safeParseInt(post.likesCount || post.likes),
              comments: safeParseInt(post.commentsCount || post.comments),
              views: safeParseInt(post.videoViewCount || post.views),
              posted_date: safeParseTimestamp(post.timestamp),
              duration_seconds: safeParseInt(post.videoDuration || post.duration),
              cached_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Cache for 30 days
              raw_data: {
                media_type: isReel ? 'reel' : (post.isVideo ? 'video' : (post.sidecarItems?.length > 1 ? 'carousel' : 'image')),
                productType: post.productType,
                shortCode: post.shortCode,
                hashtags: post.hashtags || [],
                mentions: post.mentions || [],
                isVideo: post.isVideo,
                isReel: isReel,
                sidecarItems: post.sidecarItems,
                originalData: post // Store original for debugging
              }
            };
          } else if (platform === 'tiktok') {
            // TikTok content processing
            const video = post as ApifyTikTokVideo;
            
            // Debug: Log available thumbnail fields
            if (scrapedContent.indexOf(post) === 0) {
              console.log('[Creator Search] TikTok thumbnail fields:', {
                covers: video.covers,
                coverMediumUrl: video.coverMediumUrl,
                coverLargeUrl: video.coverLargeUrl,
                coverUrl: video.coverUrl,
                thumbnailUrl: video.thumbnailUrl
              });
            }
            
            return {
              creator_id: creatorRecord!.id,
              platform: 'tiktok',
              content_url: video.webVideoUrl || `https://www.tiktok.com/@${handle}/video/${video.id}`,
              thumbnail_url: video.covers?.default || 
                           video.covers?.origin || 
                           video.covers?.dynamic || 
                           video.coverMediumUrl ||
                           video.coverLargeUrl ||
                           video.coverUrl ||
                           video.thumbnailUrl ||
                           '',
              video_url: video.videoUrl || video.videoUrlNoWaterMark || null,
              caption: video.text || '',
              likes: safeParseInt(video.diggCount),
              comments: safeParseInt(video.commentCount),
              views: safeParseInt(video.playCount),
              posted_date: safeParseTimestamp(video.createTime),
              duration_seconds: safeParseInt(video.videoMeta?.duration),
              cached_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Cache for 30 days
              raw_data: {
                media_type: 'video',
                video_id: video.id,
                hashtags: video.hashtags?.map(h => h.name || h.title) || [],
                music: video.musicMeta,
                video_meta: video.videoMeta,
                share_count: video.shareCount,
                collect_count: video.collectCount,
                originalData: video // Store original for debugging
              }
            };
          }
          
          // This should never happen, but TypeScript needs it
          throw new Error(`Unsupported platform: ${platform}`);
        });

        // Debug: Log processed content structure
        if (contentRecords.length > 0) {
          console.log('Sample processed content record:', JSON.stringify(contentRecords[0], null, 2));
          console.log(`Processing ${contentRecords.length} content records...`);
          console.log('Thumbnail URLs being stored:', contentRecords.slice(0, 3).map(r => ({
            url: r.content_url,
            thumbnail: r.thumbnail_url,
            hasThumb: !!r.thumbnail_url && r.thumbnail_url.length > 0
          })));
        }

        // Insert content in batches using upsert to handle duplicates
        const batchSize = 10;
        let successfulUpserts = 0;
        
        for (let i = 0; i < contentRecords.length; i += batchSize) {
          const batch = contentRecords.slice(i, i + batchSize);
          
          // Use upsert to update existing records or insert new ones
          const { data: upsertedData, error: contentError } = await supabaseAdmin
            .from('creator_content')
            .upsert(batch, {
              onConflict: 'content_url,platform',
              ignoreDuplicates: false // Update existing records with new data
            })
            .select();

          if (contentError) {
            console.error(`Error upserting content batch ${Math.floor(i/batchSize) + 1}:`, {
              error: contentError,
              message: contentError.message,
              details: contentError.details,
              hint: contentError.hint,
              sampleRecord: batch[0]
            });
          } else {
            successfulUpserts += upsertedData?.length || 0;
            console.log(`Successfully upserted batch ${Math.floor(i/batchSize) + 1} (${upsertedData?.length || 0} records)`);
          }
        }

        console.log(`Content upsert summary: ${successfulUpserts}/${contentRecords.length} records processed successfully`);

        // Create search record
        const { data: searchRecord, error: searchError } = await supabaseAdmin
          .from('creator_searches')
          .insert({
            user_id: userId,
            search_query: searchQuery,
            platform: platform,
            search_type: searchQuery.includes('.com') ? 'url' : 'handle',
            results_count: contentRecords.length,
            status: 'completed'
          })
          .select()
          .single();

        if (searchError) {
          console.error('Error creating search record:', searchError);
        }

        // Always fetch the stored content to return in response, regardless of upsert results
        const { data: storedContent, error: fetchError } = await supabaseAdmin
          .from('creator_content')
          .select('*')
          .eq('creator_id', creatorRecord!.id)
          .eq('platform', platform)
          .order(filter === 'most_recent' ? 'posted_date' : 
                 filter === 'top_comments' ? 'comments' :
                 filter === 'top_views' ? 'views' : 'likes', 
                 { ascending: false })
          .limit(10);

        if (fetchError) {
          console.error('Error fetching stored content:', fetchError);
        }

        // Debug: Log thumbnail URLs in the response
        if (storedContent && storedContent.length > 0) {
          console.log('[Creator Search] Sample stored content:', {
            id: storedContent[0].id,
            thumbnail_url: storedContent[0].thumbnail_url,
            content_url: storedContent[0].content_url,
            hasThumb: !!storedContent[0].thumbnail_url
          });
          console.log('[Creator Search] Thumbnail URLs in response:', 
            storedContent.slice(0, 5).map((c: any) => ({ 
              id: c.id, 
              thumbnail_url: c.thumbnail_url,
              length: c.thumbnail_url?.length || 0
            }))
          );
        }

        const response: CreatorSearchResponse = {
          searchId: searchRecord?.id || 'immediate',
          status: 'completed',
          content: storedContent || [],
          message: `Found ${storedContent?.length || 0} posts for @${handle}`
        };

        console.log(`[Creator Search] Successfully processed ${successfulUpserts} new/updated posts for ${handle}`);
        console.log(`[Creator Search] Returning ${storedContent?.length || 0} content items in response`);
        return NextResponse.json(response);

      } catch (dbError) {
        console.error('Error storing scraped data:', dbError);
        return NextResponse.json({ 
          error: 'Failed to save scraped data' 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        error: 'No content found for this creator' 
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error('[Creator Search API] Unexpected error:', error);
    
    if (error.name === 'SyntaxError') {
      return NextResponse.json({
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: 'An unexpected error occurred while processing the search'
    }, { status: 500 });
  }
}