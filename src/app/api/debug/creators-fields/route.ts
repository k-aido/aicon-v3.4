import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Try to select all from creators table with limit 0 to get column info
    const { data, error } = await supabaseAdmin
      .from('creators')
      .select('*')
      .limit(0);
    
    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }
    
    // Also try a minimal insert to see what's required
    const minimalInsert = {
      instagram_handle: 'test-handle-debug'
    };
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('creators')
      .insert(minimalInsert)
      .select();
      
    // Clean up the test record if it was created
    if (insertData && insertData[0]) {
      await supabaseAdmin
        .from('creators')
        .delete()
        .eq('id', insertData[0].id);
    }
    
    return NextResponse.json({
      selectSuccess: !error,
      insertTest: {
        success: !insertError,
        error: insertError?.message,
        code: insertError?.code,
        details: insertError?.details
      },
      data: insertData || null
    });
    
  } catch (error: any) {
    console.error('Creators fields debug error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}