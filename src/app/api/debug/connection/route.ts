import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const results = [];
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    results.push({
      test: 'Environment Variables (API)',
      data: {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey,
        urlPreview: supabaseUrl?.substring(0, 30) + '...',
        anonKeyPreview: supabaseAnonKey?.substring(0, 20) + '...',
        serviceKeyPreview: supabaseServiceKey?.substring(0, 20) + '...'
      }
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        results
      });
    }

    // Test anon client
    try {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await anonClient.from('projects').select('count').limit(1);
      
      results.push({
        test: 'Anon Client Query',
        success: !error,
        data: error ? { error: error.message, code: error.code } : { success: true }
      });
    } catch (err: any) {
      results.push({
        test: 'Anon Client Query',
        success: false,
        data: { error: err.message }
      });
    }

    // Test service role client if available
    if (supabaseServiceKey) {
      try {
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await serviceClient.from('projects').select('count').limit(1);
        
        results.push({
          test: 'Service Role Client Query',
          success: !error,
          data: error ? { error: error.message, code: error.code } : { success: true }
        });
      } catch (err: any) {
        results.push({
          test: 'Service Role Client Query',
          success: false,
          data: { error: err.message }
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}