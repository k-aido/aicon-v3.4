import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('searchId');

    if (!searchId) {
      return NextResponse.json({ 
        error: 'Search ID is required' 
      }, { status: 400 });
    }

    // Get search record with creator content count
    const { data: searchRecord, error } = await supabaseAdmin
      .from('creator_searches')
      .select(`
        id,
        search_query,
        platform,
        status,
        results_count,
        created_at,
        updated_at,
        apify_run_id
      `)
      .eq('id', searchId)
      .single();

    if (error) {
      console.error('Error fetching search status:', error);
      return NextResponse.json({ 
        error: 'Search not found' 
      }, { status: 404 });
    }

    // If completed, also fetch the content
    let content = null;
    if (searchRecord.status === 'completed' && searchRecord.results_count > 0) {
      // Get the creator from the search query to find their content
      const handle = searchRecord.search_query.replace('@', '').split('/').pop();
      
      const { data: creator } = await supabaseAdmin
        .from('creators')
        .select('id')
        .eq('instagram_handle', handle)
        .single();

      if (creator) {
        const { data: creatorContent } = await supabaseAdmin
          .from('creator_content')
          .select('*')
          .eq('creator_id', creator.id)
          .eq('platform', 'instagram')
          .order('likes', { ascending: false })
          .limit(20);

        content = creatorContent;
      }
    }

    return NextResponse.json({
      searchId: searchRecord.id,
      status: searchRecord.status,
      query: searchRecord.search_query,
      platform: searchRecord.platform,
      resultsCount: searchRecord.results_count,
      createdAt: searchRecord.created_at,
      updatedAt: searchRecord.updated_at,
      ...(content && { content })
    });

  } catch (error: any) {
    console.error('[Creator Status API] Unexpected error:', error);
    
    return NextResponse.json({
      error: 'An unexpected error occurred while checking search status'
    }, { status: 500 });
  }
}