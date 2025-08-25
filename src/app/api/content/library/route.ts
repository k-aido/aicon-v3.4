import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user ID from cookies
async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
  const authToken = cookieStore.get(authTokenKey);
  
  if (authToken?.value) {
    try {
      const tokenData = JSON.parse(authToken.value);
      return tokenData.user?.id || null;
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }
  }
  return null;
}

/**
 * Fetch analyzed content from the library for RAG context
 */
export async function POST(request: NextRequest) {
  try {
    const { contentIds, projectId } = await request.json();

    // Validate request
    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json(
        { error: 'Content IDs array is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Library API] Fetching content for IDs:', contentIds);

    // The contentIds array may contain:
    // 1. Scrape IDs (UUIDs from content_scrapes table)
    // 2. Canvas element IDs (numeric IDs from the canvas)
    // We need to handle both cases
    
    // First, try to fetch by scrape_id directly
    const { data: contentByScrapId, error: scrapeError } = await supabase
      .from('content_analysis')
      .select(`
        *,
        content_scrapes!inner(
          id,
          url,
          platform,
          processed_data,
          project_id,
          user_id
        )
      `)
      .in('scrape_id', contentIds.map(String))
      .eq('content_scrapes.project_id', projectId)
      .eq('content_scrapes.user_id', userId);

    if (scrapeError) {
      console.error('[Library API] Error fetching by scrape_id:', scrapeError);
    }

    // Also try to fetch by canvas element ID stored in processed_data
    // Some implementations store the canvas element ID in processed_data.canvasElementId
    const { data: contentByElementId, error: elementError } = await supabase
      .from('content_analysis')
      .select(`
        *,
        content_scrapes!inner(
          id,
          url,
          platform,
          processed_data,
          project_id,
          user_id
        )
      `)
      .in('content_scrapes.processed_data->canvasElementId', contentIds.map(String))
      .eq('content_scrapes.project_id', projectId)
      .eq('content_scrapes.user_id', userId);

    if (elementError) {
      console.error('[Library API] Error fetching by element_id:', elementError);
    }

    // Combine results and remove duplicates
    const contentData = [...(contentByScrapId || []), ...(contentByElementId || [])];
    const uniqueContent = Array.from(new Map(contentData.map(item => [item.id, item])).values());

    console.log('[Library API] Found analyzed content:', {
      byScrapId: contentByScrapId?.length || 0,
      byElementId: contentByElementId?.length || 0,
      total: uniqueContent.length,
      requestedIds: contentIds
    });

    // If no analyzed content found, check if there are scraped items waiting for analysis
    if (uniqueContent.length === 0) {
      console.log('[Library API] No analyzed content found, checking for scraped content...');
      
      // Check content_scrapes table directly
      const { data: scrapedContent, error: scrapedError } = await supabase
        .from('content_scrapes')
        .select('*')
        .in('id', contentIds.map(String))
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (scrapedContent && scrapedContent.length > 0) {
        console.log('[Library API] Found scraped content without analysis:', scrapedContent.length);
        
        // Format scraped content as basic content items
        const formattedScrapedContent = scrapedContent.map(scrape => {
          const processedData = scrape.processed_data || {};
          return {
            id: scrape.id,
            scrapeId: scrape.id,
            platform: scrape.platform,
            url: scrape.url,
            title: processedData.title || 'Untitled Content',
            description: processedData.description || processedData.caption || '',
            transcript: processedData.transcript || processedData.subtitles || '',
            metrics: processedData.metrics || {},
            processedData: processedData,
            creatorUsername: processedData.authorUsername || processedData.ownerUsername || 'Unknown',
            creatorName: processedData.author?.name || processedData.authorName || '',
            thumbnailUrl: processedData.thumbnailUrl || processedData.thumbnail || '',
            uploadDate: processedData.uploadDate || processedData.publishedAt || '',
            analysis: null, // No analysis yet
            analyzedAt: null,
            needsAnalysis: true
          };
        });

        return NextResponse.json({
          success: true,
          content: formattedScrapedContent,
          message: 'Content found but not yet analyzed'
        });
      }
    }

    if (!uniqueContent || uniqueContent.length === 0) {
      // Log for debugging
      console.log('[Library API] No content found. Debug info:', {
        requestedIds: contentIds,
        projectId,
        userId
      });
      
      return NextResponse.json({
        success: true,
        content: [],
        message: 'No analyzed content found for the provided IDs'
      });
    }

    // Format the content for RAG usage
    const formattedContent = uniqueContent.map(item => {
      // Extract creator info from processed_data
      const processedData = item.content_scrapes.processed_data || {};
      const creatorUsername = String(processedData.authorUsername || 
                            processedData.ownerUsername || 
                            processedData.channelTitle ||
                            processedData.author ||
                            'Unknown Creator');
      
      // Extract creator name
      const creatorName = processedData.author?.name || 
                         processedData.authorName || 
                         processedData.ownerName ||
                         processedData.channelTitle ||
                         '';
      
      // Extract posted date
      const postedDate = processedData.uploadDate || 
                        processedData.publishedAt || 
                        processedData.timestamp ||
                        '';
      
      // Extract thumbnail URL
      const thumbnailUrl = processedData.thumbnailUrl || 
                          processedData.thumbnail ||
                          '';
      
      // Extract transcript from either content_analysis or processed_data
      const transcript = item.transcript || 
                        processedData.transcript || 
                        processedData.subtitles ||
                        item.captions ||
                        '';
      
      return {
        id: item.id,
        scrapeId: item.scrape_id,
        platform: item.content_scrapes.platform,
        url: item.content_scrapes.url,
        title: item.title || processedData.title || 'Untitled Content',
        description: item.description || processedData.description || processedData.caption || '',
        transcript: transcript,
        captions: item.captions,
        metrics: item.metrics || processedData.metrics || {},
        processedData: item.content_scrapes.processed_data,
        creatorUsername: creatorUsername,
        creatorName: creatorName,
        creatorHandle: typeof creatorUsername === 'string' && creatorUsername.startsWith('@') ? creatorUsername : `@${creatorUsername}`,
        thumbnailUrl: thumbnailUrl,
        uploadDate: postedDate,
        publishedAt: postedDate,
        postedDate: postedDate,
        analysis: {
          hookAnalysis: item.hook_analysis,
          bodyAnalysis: item.body_analysis,
          ctaAnalysis: item.cta_analysis,
          keyTopics: item.key_topics || [],
          engagementTactics: item.engagement_tactics || [],
          sentiment: item.sentiment,
          complexity: item.complexity
        },
        analyzedAt: item.analyzed_at,
        needsAnalysis: false
      };
    });

    console.log(`[Library API] Returning ${formattedContent.length} analyzed content items`);

    return NextResponse.json({
      success: true,
      content: formattedContent
    });

  } catch (error: any) {
    console.error('[Library API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch content library' },
      { status: 500 }
    );
  }
}

/**
 * Get all analyzed content for a project (for content library view)
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all analyzed content for the project
    const { data: libraryData, error: libraryError } = await supabase
      .from('project_content_library')
      .select(`
        *,
        content_analysis!inner(
          *,
          content_scrapes!inner(
            url,
            platform,
            processed_data
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (libraryError) {
      console.error('[Library API] Error fetching library:', libraryError);
      return NextResponse.json(
        { error: 'Failed to fetch content library' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      library: libraryData || []
    });

  } catch (error: any) {
    console.error('[Library API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch content library' },
      { status: 500 }
    );
  }
}