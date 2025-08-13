import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';
import type { 
  ApifyWebhookRequest, 
  ApifyInstagramProfile, 
  ApifyInstagramPost,
  Creator,
  CreatorContent
} from '@/types/creator-search';

// Fetch results from Apify dataset
async function fetchApifyResults(runId: string): Promise<{ profile: ApifyInstagramProfile | null; error?: string }> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  
  if (!apifyToken) {
    return { profile: null, error: 'Apify API token not configured' };
  }

  try {
    // Get the default dataset for this run
    const runResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apifyToken}`,
      },
    });

    if (!runResponse.ok) {
      return { profile: null, error: `Failed to get run details: ${runResponse.status}` };
    }

    const runData = await runResponse.json();
    const datasetId = runData.data.defaultDatasetId;

    // Get items from the dataset
    const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      headers: {
        'Authorization': `Bearer ${apifyToken}`,
      },
    });

    if (!itemsResponse.ok) {
      return { profile: null, error: `Failed to get dataset items: ${itemsResponse.status}` };
    }

    const items = await itemsResponse.json();
    
    if (!items || items.length === 0) {
      return { profile: null, error: 'No results found in dataset' };
    }

    // The first item should be the profile with posts
    return { profile: items[0] };
  } catch (error) {
    console.error('Error fetching Apify results:', error);
    return { profile: null, error: 'Failed to fetch scraping results' };
  }
}

// Create or update creator record
async function createOrUpdateCreator(profile: ApifyInstagramProfile): Promise<{ creator: Creator | null; error?: string }> {
  try {
    // Check if creator exists
    const { data: existingCreator } = await supabaseAdmin
      .from('creators')
      .select('*')
      .eq('instagram_handle', profile.username)
      .single();

    const creatorData = {
      instagram_handle: profile.username,
      display_name: profile.fullName || profile.username,
      bio: profile.biography || null,
      profile_image_url: profile.profilePicUrl || null,
      verified: profile.isVerified || false,
      instagram_followers: profile.followersCount || 0,
      last_scraped_at: new Date().toISOString(),
      metadata: {
        follows_count: profile.followsCount || 0,
        posts_count: profile.postsCount || 0,
        scraped_posts: profile.posts?.length || 0
      }
    };

    let creator: Creator;

    if (existingCreator) {
      // Update existing creator
      const { data: updatedCreator, error } = await supabaseAdmin
        .from('creators')
        .update(creatorData)
        .eq('id', existingCreator.id)
        .select()
        .single();

      if (error) {
        return { creator: null, error: `Failed to update creator: ${error.message}` };
      }
      creator = updatedCreator;
    } else {
      // Create new creator
      const { data: newCreator, error } = await supabaseAdmin
        .from('creators')
        .insert(creatorData)
        .select()
        .single();

      if (error) {
        return { creator: null, error: `Failed to create creator: ${error.message}` };
      }
      creator = newCreator;
    }

    return { creator };
  } catch (error) {
    console.error('Error creating/updating creator:', error);
    return { creator: null, error: 'Database error while saving creator' };
  }
}

// Store creator content with 30-day cache
async function storeCreatorContent(creator: Creator, posts: ApifyInstagramPost[]): Promise<{ count: number; error?: string }> {
  if (!posts || posts.length === 0) {
    return { count: 0 };
  }

  try {
    // Delete existing content for this creator/platform to refresh cache
    await supabaseAdmin
      .from('creator_content')
      .delete()
      .eq('creator_id', creator.id)
      .eq('platform', 'instagram');

    // Prepare content records
    const contentRecords = posts.map((post: ApifyInstagramPost) => ({
      creator_id: creator.id,
      platform: 'instagram',
      content_url: post.url,
      platform_content_id: post.url.split('/p/')[1]?.split('/')[0] || null,
      thumbnail_url: post.displayUrl || null,
      video_url: post.videoUrl || null,
      caption: post.caption || null,
      likes: post.likesCount || 0,
      comments: post.commentsCount || 0,
      views: post.viewsCount || 0,
      posted_date: post.timestamp ? new Date(post.timestamp).toISOString() : null,
      duration_seconds: post.duration || null,
      raw_data: post,
      cached_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }));

    // Insert content in batches to avoid payload limits
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < contentRecords.length; i += batchSize) {
      const batch = contentRecords.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from('creator_content')
        .insert(batch);

      if (error) {
        console.error(`Error inserting content batch ${i}-${i + batch.length}:`, error);
        return { count: totalInserted, error: `Failed to store content: ${error.message}` };
      }

      totalInserted += batch.length;
    }

    return { count: totalInserted };
  } catch (error) {
    console.error('Error storing creator content:', error);
    return { count: 0, error: 'Database error while saving content' };
  }
}

// Update search record status
async function updateSearchRecord(runId: string, status: 'completed' | 'failed', resultsCount: number = 0, errorMessage?: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('creator_searches')
      .update({
        status,
        results_count: resultsCount,
        ...(errorMessage && { error_message: errorMessage })
      })
      .eq('apify_run_id', runId);

    // Update processing queue
    await supabaseAdmin
      .from('processing_queue')
      .update({
        status: status === 'completed' ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        ...(errorMessage && { error_message: errorMessage })
      })
      .eq('payload->>apify_run_id', runId);

  } catch (error) {
    console.error('Error updating search record:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Apify Webhook] Received webhook call');
    
    const body = await request.json();
    console.log('[Apify Webhook] Webhook payload:', JSON.stringify(body, null, 2));

    // Handle custom webhook format from our API call
    if (body.runId && body.status && body.handle) {
      const { runId, status, handle } = body;
      
      console.log(`[Apify Webhook] Processing run ${runId} for ${handle} with status ${status}`);

      if (status === 'SUCCEEDED') {
        // Fetch results from Apify
        const { profile, error } = await fetchApifyResults(runId);
        
        if (error || !profile) {
          console.error(`[Apify Webhook] Failed to fetch results: ${error}`);
          await updateSearchRecord(runId, 'failed', 0, error || 'No results found');
          return NextResponse.json({ success: false, error });
        }

        console.log(`[Apify Webhook] Found profile data for ${profile.username} with ${profile.posts?.length || 0} posts`);

        // Create or update creator
        const { creator, error: creatorError } = await createOrUpdateCreator(profile);
        
        if (creatorError || !creator) {
          console.error(`[Apify Webhook] Failed to save creator: ${creatorError}`);
          await updateSearchRecord(runId, 'failed', 0, creatorError || 'Failed to save creator');
          return NextResponse.json({ success: false, error: creatorError });
        }

        // Store creator content
        const { count, error: contentError } = await storeCreatorContent(creator, profile.posts || []);
        
        if (contentError) {
          console.error(`[Apify Webhook] Failed to save content: ${contentError}`);
          await updateSearchRecord(runId, 'failed', count, contentError);
          return NextResponse.json({ success: false, error: contentError });
        }

        console.log(`[Apify Webhook] Successfully processed ${count} posts for ${profile.username}`);

        // Update search record as completed
        await updateSearchRecord(runId, 'completed', count);

        return NextResponse.json({ 
          success: true, 
          message: `Successfully processed ${count} posts for @${profile.username}` 
        });

      } else {
        // Run failed
        console.log(`[Apify Webhook] Run ${runId} failed with status ${status}`);
        await updateSearchRecord(runId, 'failed', 0, `Scraping failed with status: ${status}`);
        
        return NextResponse.json({ 
          success: false, 
          error: `Scraping failed with status: ${status}` 
        });
      }
    }

    // Handle standard Apify webhook format
    const webhookData = body as ApifyWebhookRequest;
    
    if (webhookData.eventType === 'ACTOR_RUN_SUCCEEDED') {
      const runId = webhookData.resource.id;
      console.log(`[Apify Webhook] Standard webhook - run ${runId} succeeded`);
      
      // For standard webhooks, we don't have handle info, so we need to look it up
      const { data: searchRecord } = await supabaseAdmin
        .from('creator_searches')
        .select('search_query')
        .eq('apify_run_id', runId)
        .single();

      if (!searchRecord) {
        console.error(`[Apify Webhook] No search record found for run ${runId}`);
        return NextResponse.json({ success: false, error: 'Search record not found' });
      }

      // Process the same way as custom webhook
      const { profile, error } = await fetchApifyResults(runId);
      
      if (error || !profile) {
        await updateSearchRecord(runId, 'failed', 0, error || 'No results found');
        return NextResponse.json({ success: false, error });
      }

      const { creator, error: creatorError } = await createOrUpdateCreator(profile);
      
      if (creatorError || !creator) {
        await updateSearchRecord(runId, 'failed', 0, creatorError || 'Failed to save creator');
        return NextResponse.json({ success: false, error: creatorError });
      }

      const { count, error: contentError } = await storeCreatorContent(creator, profile.posts || []);
      
      if (contentError) {
        await updateSearchRecord(runId, 'failed', count, contentError);
        return NextResponse.json({ success: false, error: contentError });
      }

      await updateSearchRecord(runId, 'completed', count);

      return NextResponse.json({ 
        success: true, 
        message: `Successfully processed ${count} posts` 
      });

    } else if (webhookData.eventType === 'ACTOR_RUN_FAILED' || webhookData.eventType === 'ACTOR_RUN_TIMED_OUT') {
      const runId = webhookData.resource.id;
      const errorMessage = webhookData.resource.statusMessage || 'Run failed or timed out';
      
      console.log(`[Apify Webhook] Run ${runId} failed: ${errorMessage}`);
      await updateSearchRecord(runId, 'failed', 0, errorMessage);
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage 
      });
    }

    return NextResponse.json({ success: true, message: 'Webhook received but not processed' });

  } catch (error: any) {
    console.error('[Apify Webhook] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred while processing the webhook'
    }, { status: 500 });
  }
}