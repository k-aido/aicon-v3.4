import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if creator_content table exists and get its columns
    const { data: columns, error } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'creator_content' });
      
    if (error) {
      // Fallback: try to describe table structure by attempting an insert with all fields
      console.log('RPC failed, testing schema with insert attempt...');
      
      // Test creators table
      const creatorTestData = {
        instagram_handle: 'test',
        display_name: 'Test User',
        bio: 'Test bio',
        profile_image_url: 'https://test.com/image.jpg',
        verified: false,
        instagram_followers: 1000
      };
      
      const { data: creatorResult, error: creatorError } = await supabaseAdmin
        .from('creators')
        .insert(creatorTestData)
        .select();
        
      // Test creator_content table
      const testData = {
        creator_id: '00000000-0000-0000-0000-000000000000',
        platform: 'instagram',
        content_url: 'https://test.com',
        media_type: 'image',
        hashtags: ['test'],
        mentions: ['@test']
      };
      
      const { data, error: insertError } = await supabaseAdmin
        .from('creator_content')
        .insert(testData)
        .select();
        
      return NextResponse.json({ 
        tableExists: true,
        creatorTest: {
          error: creatorError?.message,
          success: !creatorError
        },
        contentTest: {
          error: insertError?.message,
          success: !insertError
        },
        missingFields: {
          creators: creatorError?.message?.includes('column') ? ['bio', 'profile_image_url', 'verified', 'instagram_followers'] : [],
          creator_content: insertError?.message?.includes('column') ? ['media_type', 'hashtags', 'mentions'] : []
        }
      });
    }
    
    return NextResponse.json({ 
      tableExists: true,
      columns,
      error: null 
    });
    
  } catch (error: any) {
    console.error('Schema debug error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}