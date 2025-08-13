import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';
import type { 
  CreatorSearchRequest, 
  CreatorSearchResponse, 
  Creator, 
  CreatorContent 
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

// Check if content is cached and still valid
async function getCachedContent(handle: string): Promise<{ creator: Creator | null; content: CreatorContent[] }> {
  try {
    // Find creator by Instagram handle
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('*')
      .eq('instagram_handle', handle)
      .single();

    if (!creator) {
      return { creator: null, content: [] };
    }

    // Check for valid cached content
    const { data: content } = await supabaseAdmin
      .from('creator_content')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('platform', 'instagram')
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

// Scrape Instagram data using Apify synchronous API
async function scrapeInstagramData(handle: string, filter: string): Promise<{ content: any[]; error?: string }> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  
  if (!apifyToken) {
    return { content: [], error: 'Apify API token not configured' };
  }

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}`;
    
    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${handle.replace('@', '')}/`],
        resultsType: "posts",
        resultsLimit: 30,
        addParentData: true,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Apify API error:', response.status, errorData);
      
      if (response.status === 403) {
        return { content: [], error: 'This account is private and cannot be accessed' };
      }
      if (response.status === 404) {
        return { content: [], error: 'Instagram account not found' };
      }
      if (response.status === 429) {
        return { content: [], error: 'Rate limit exceeded. Please try again later' };
      }
      
      return { content: [], error: `Failed to scrape Instagram data: ${response.status}` };
    }

    // This endpoint returns results directly (sync), so handle the response
    const data = await response.json();

    // The data is returned directly as an array of posts
    if (!Array.isArray(data) || data.length === 0) {
      return { content: [], error: 'No content found for this creator' };
    }

    return { content: data };
  } catch (error) {
    console.error('Error scraping Instagram data:', error);
    return { content: [], error: 'Failed to connect to scraping service' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatorSearchRequest = await request.json();
    const { platform, searchQuery, filter, userId } = body;

    // Validate request
    if (!platform || platform !== 'instagram') {
      return NextResponse.json({ 
        error: 'Invalid platform. Only Instagram is supported.' 
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

    // Validate Instagram handle/URL
    const validation = validateInstagramInput(searchQuery);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: validation.error || 'Invalid Instagram handle or URL' 
      }, { status: 400 });
    }

    const handle = validation.handle;
    console.log(`[Creator Search] Processing Instagram handle: ${handle}`);

    // Check cache first
    const { creator, content: cachedContent } = await getCachedContent(handle);
    
    if (cachedContent.length > 0) {
      console.log(`[Creator Search] Returning cached content for ${handle}: ${cachedContent.length} posts`);
      
      // Update existing creator search or create new one
      const { data: searchRecord } = await supabaseAdmin
        .from('creator_searches')
        .insert({
          user_id: userId,
          search_query: searchQuery,
          platform: 'instagram',
          search_type: searchQuery.includes('instagram.com') ? 'url' : 'handle',
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

    // No cache, scrape Instagram data directly
    console.log(`[Creator Search] No cached content, starting scrape for ${handle}`);
    
    const { content: scrapedContent, error } = await scrapeInstagramData(handle, filter);
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
          const { data: newCreator, error: creatorError } = await supabaseAdmin
            .from('creators')
            .insert({
              platform: 'instagram', // Required field
              username: handle, // Required field  
              profile_url: `https://www.instagram.com/${handle}`, // Required field
              instagram_handle: handle,
              display_name: scrapedContent[0]?.ownerFullName || handle,
              last_scraped_at: new Date().toISOString(),
              metadata: {
                followers: safeParseInt(scrapedContent[0]?.ownerFollowersCount),
                biography: scrapedContent[0]?.ownerBiography || '',
                profile_image_url: scrapedContent[0]?.ownerProfilePicUrl || '',
                verified: scrapedContent[0]?.ownerIsVerified || false,
                is_private: scrapedContent[0]?.ownerIsPrivate || false,
                following_count: safeParseInt(scrapedContent[0]?.ownerFollowsCount)
              }
            })
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
        const contentRecords = scrapedContent.map((post: any) => ({
          creator_id: creatorRecord!.id,
          platform: 'instagram',
          content_url: post.url || post.link || '',
          thumbnail_url: post.displayUrl || post.thumbnailUrl || post.thumbnailSrc || '',
          video_url: post.videoUrl || null,
          caption: post.caption || post.text || '',
          likes: safeParseInt(post.likesCount || post.likes),
          comments: safeParseInt(post.commentsCount || post.comments),
          views: safeParseInt(post.videoViewCount || post.views),
          posted_date: safeParseTimestamp(post.timestamp),
          duration_seconds: safeParseInt(post.videoDuration || post.duration),
          cached_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Cache for 30 days
          raw_data: {
            media_type: post.isVideo ? 'video' : (post.sidecarItems?.length > 1 ? 'carousel' : 'image'),
            hashtags: post.hashtags || [],
            mentions: post.mentions || [],
            isVideo: post.isVideo,
            sidecarItems: post.sidecarItems,
            originalData: post // Store original for debugging
          }
        }));

        // Debug: Log processed content structure
        console.log('Sample processed content record:', JSON.stringify(contentRecords[0], null, 2));
        console.log(`Processing ${contentRecords.length} content records...`);

        // Insert content in batches to avoid size limits
        const batchSize = 10;
        let successfulInserts = 0;
        
        for (let i = 0; i < contentRecords.length; i += batchSize) {
          const batch = contentRecords.slice(i, i + batchSize);
          const { error: contentError } = await supabaseAdmin
            .from('creator_content')
            .insert(batch);

          if (contentError) {
            console.error(`Error inserting content batch ${Math.floor(i/batchSize) + 1}:`, {
              error: contentError,
              message: contentError.message,
              details: contentError.details,
              hint: contentError.hint,
              sampleRecord: batch[0]
            });
          } else {
            successfulInserts += batch.length;
            console.log(`Successfully inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)`);
          }
        }

        console.log(`Content insertion summary: ${successfulInserts}/${contentRecords.length} records inserted successfully`);

        // Create search record
        const { data: searchRecord, error: searchError } = await supabaseAdmin
          .from('creator_searches')
          .insert({
            user_id: userId,
            search_query: searchQuery,
            platform: 'instagram',
            search_type: searchQuery.includes('instagram.com') ? 'url' : 'handle',
            results_count: contentRecords.length,
            status: 'completed'
          })
          .select()
          .single();

        if (searchError) {
          console.error('Error creating search record:', searchError);
        }

        // Fetch the stored content to return in response
        const { data: storedContent, error: fetchError } = await supabaseAdmin
          .from('creator_content')
          .select('*')
          .eq('creator_id', creatorRecord!.id)
          .order('likes', { ascending: false })
          .limit(20);

        if (fetchError) {
          console.error('Error fetching stored content:', fetchError);
        }

        const response: CreatorSearchResponse = {
          searchId: searchRecord?.id || 'immediate',
          status: 'completed',
          content: storedContent || [],
          message: `Found ${storedContent?.length || 0} posts for @${handle}`
        };

        console.log(`[Creator Search] Successfully scraped and stored ${contentRecords.length} posts for ${handle}`);
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