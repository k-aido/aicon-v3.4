import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Use service role key for server-side operations to bypass RLS
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

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'message_id', 
      'account_id', 
      'project_id', 
      'model', 
      'prompt_tokens', 
      'completion_tokens',
      'total_tokens',
      'billing_period'
    ];
    
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Insert usage record
    const { data, error } = await supabase
      .from('message_usage_records')
      .insert({
        message_id: body.message_id,
        account_id: body.account_id,
        project_id: body.project_id,
        model: body.model,
        prompt_tokens: body.prompt_tokens,
        completion_tokens: body.completion_tokens,
        total_tokens: body.total_tokens,
        cost_usd: body.cost_usd || null,
        billing_period: body.billing_period
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert usage record:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in usage tracking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}