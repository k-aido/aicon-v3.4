import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import ApifyService from '@/services/apifyService';

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

// Credit cost for scraping
const SCRAPE_CREDITS = 50;

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

export async function POST(request: NextRequest) {
  try {
    const { url, projectId } = await request.json();

    // Validate request
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Validate URL format and platform
    const validation = ApifyService.validateUrl(url);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's account for credit check
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user has enough credits
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('promotional_credits, monthly_credits_remaining')
      .eq('id', userData.account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Unable to fetch account details' }, { status: 500 });
    }

    const totalCredits = (account.promotional_credits || 0) + (account.monthly_credits_remaining || 0);
    
    if (totalCredits < SCRAPE_CREDITS) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. You need ${SCRAPE_CREDITS} credits but only have ${totalCredits} available.`,
          creditsNeeded: SCRAPE_CREDITS,
          creditsAvailable: totalCredits
        },
        { status: 402 }
      );
    }

    // Check if URL has been scraped recently (within 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: existingScrape } = await supabase
      .from('content_scrapes')
      .select('*')
      .eq('url', url)
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .gte('created_at', oneDayAgo.toISOString())
      .single();

    if (existingScrape) {
      console.log('[Scrape API] Using cached scrape:', existingScrape.id);
      return NextResponse.json({
        success: true,
        scrapeId: existingScrape.id,
        status: 'completed',
        cached: true,
        message: 'Using recently scraped content'
      });
    }

    // Deduct credits
    let promotionalUsed = 0;
    let monthlyUsed = 0;
    let remainingToDeduct = SCRAPE_CREDITS;

    if (account.promotional_credits > 0) {
      promotionalUsed = Math.min(account.promotional_credits, remainingToDeduct);
      remainingToDeduct -= promotionalUsed;
    }

    if (remainingToDeduct > 0) {
      monthlyUsed = remainingToDeduct;
    }

    const { error: creditUpdateError } = await supabase
      .from('accounts')
      .update({
        promotional_credits: Math.max(0, account.promotional_credits - promotionalUsed),
        monthly_credits_remaining: Math.max(0, account.monthly_credits_remaining - monthlyUsed),
      })
      .eq('id', userData.account_id);

    if (creditUpdateError) {
      console.error('[Scrape API] Error updating credits:', creditUpdateError);
      return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
    }

    // Update billing usage
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const { data: existingUsage } = await supabase
      .from('billing_usage')
      .select('*')
      .eq('account_id', userData.account_id)
      .eq('billing_period_start', startOfMonth.toISOString().split('T')[0])
      .single();

    if (existingUsage) {
      const usageDetails = existingUsage.usage_details || {};
      usageDetails.content_scrapes = (usageDetails.content_scrapes || 0) + 1;

      await supabase
        .from('billing_usage')
        .update({
          promotional_credits_used: existingUsage.promotional_credits_used + promotionalUsed,
          monthly_credits_used: existingUsage.monthly_credits_used + monthlyUsed,
          total_credits_used: existingUsage.total_credits_used + SCRAPE_CREDITS,
          usage_details: usageDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id);
    }

    // Create scrape record
    const { data: scrapeRecord, error: scrapeError } = await supabase
      .from('content_scrapes')
      .insert({
        project_id: projectId,
        user_id: userId,
        url: url,
        platform: validation.platform,
        status: 'pending'
      })
      .select()
      .single();

    if (scrapeError || !scrapeRecord) {
      console.error('[Scrape API] Error creating scrape record:', scrapeError);
      
      // Refund credits on error
      await supabase
        .from('accounts')
        .update({
          promotional_credits: account.promotional_credits,
          monthly_credits_remaining: account.monthly_credits_remaining,
        })
        .eq('id', userData.account_id);
        
      return NextResponse.json({ error: 'Failed to create scrape record' }, { status: 500 });
    }

    // Initialize Apify service
    let apifyService: ApifyService;
    try {
      apifyService = new ApifyService();
    } catch (error) {
      console.error('[Scrape API] Apify service initialization failed:', error);
      
      // Update scrape record with error
      await supabase
        .from('content_scrapes')
        .update({
          status: 'failed',
          error_message: 'Apify service not configured. Please add APIFY_API_TOKEN to environment variables.',
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeRecord.id);
      
      return NextResponse.json({
        success: false,
        scrapeId: scrapeRecord.id,
        status: 'failed',
        error: 'Scraping service not configured'
      });
    }

    // Start scraping based on platform
    try {
      let runResult: { runId: string };
      
      switch (validation.platform) {
        case 'youtube':
          runResult = await apifyService.scrapeYouTube(url);
          break;
        case 'instagram':
          runResult = await apifyService.scrapeInstagram(url);
          break;
        case 'tiktok':
          runResult = await apifyService.scrapeTikTok(url);
          break;
        default:
          throw new Error(`Unsupported platform: ${validation.platform}`);
      }

      // Update scrape record with Apify run ID
      await supabase
        .from('content_scrapes')
        .update({
          status: 'processing',
          apify_run_id: runResult.runId,
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeRecord.id);

      console.log(`[Scrape API] Started scraping ${validation.platform} content:`, {
        scrapeId: scrapeRecord.id,
        runId: runResult.runId,
        url
      });

      return NextResponse.json({
        success: true,
        scrapeId: scrapeRecord.id,
        status: 'processing',
        message: 'Scraping started. Check status endpoint for updates.'
      });

    } catch (scrapeError: any) {
      console.error('[Scrape API] Scraping failed:', scrapeError);
      
      // Update scrape record with error
      await supabase
        .from('content_scrapes')
        .update({
          status: 'failed',
          error_message: scrapeError.message || 'Failed to start scraping',
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeRecord.id);
      
      return NextResponse.json({
        success: false,
        scrapeId: scrapeRecord.id,
        status: 'failed',
        error: scrapeError.message || 'Failed to start scraping'
      });
    }

  } catch (error: any) {
    console.error('[Scrape API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process scrape request' },
      { status: 500 }
    );
  }
}