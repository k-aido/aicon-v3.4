import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Try to get basic info about existing tables
    const { data: tables, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
      
    if (error) {
      // Fallback: try to list some known tables by attempting selects
      const tableTests = [
        'creators',
        'creator_content', 
        'creator_searches',
        'users',
        'accounts',
        'canvases'
      ];
      
      const results: Record<string, any> = {};
      
      for (const tableName of tableTests) {
        try {
          const { data, error: tableError } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .limit(1);
            
          results[tableName] = {
            exists: !tableError,
            error: tableError?.message,
            code: tableError?.code
          };
        } catch (e: any) {
          results[tableName] = {
            exists: false,
            error: e.message || 'Unknown error'
          };
        }
      }
      
      return NextResponse.json({
        method: 'fallback',
        tables: results,
        originalError: error.message
      });
    }
    
    return NextResponse.json({
      method: 'information_schema',
      tables: tables?.map(t => t.table_name) || []
    });
    
  } catch (error: any) {
    console.error('Tables debug error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}