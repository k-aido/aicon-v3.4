import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received webhook call:', body);
    
    // Process webhook data if needed
    // For now, just acknowledge receipt
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed',
      job_id: `job_${Date.now()}_${Math.random().toString(36).substring(7)}`
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    
    // Always return success to prevent retries
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed' 
    }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Webhook processed' 
  }, { status: 200 });
}