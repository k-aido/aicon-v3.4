import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { title, userId: requestUserId, accountId: requestAccountId } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Try to get session from cookies
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Look for the auth token in cookies
    const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
    const authToken = cookieStore.get(authTokenKey);
    
    console.log('[API] Looking for auth token:', {
      key: authTokenKey,
      found: !!authToken?.value,
      cookieNames: cookieStore.getAll().map(c => c.name)
    });
    
    let session = null;
    let userId = requestUserId;
    
    if (authToken?.value) {
      try {
        // Parse the auth token to get session
        const tokenData = JSON.parse(authToken.value);
        console.log('[API] Token data keys:', Object.keys(tokenData));
        
        // Create a client with the token
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            storage: {
              getItem: (key: string) => {
                if (key === authTokenKey) {
                  return authToken.value;
                }
                return null;
              },
              setItem: () => {},
              removeItem: () => {}
            }
          }
        });
        
        // Try to get user from the session
        const { data: { user }, error: userError } = await authClient.auth.getUser();
        
        if (user && !userError) {
          userId = user.id;
          session = { user };
          console.log('[API] Got user from auth token:', { userId: user.id, email: user.email });
        } else {
          console.log('[API] Failed to get user from token:', userError);
        }
      } catch (e) {
        console.log('[API] Error parsing auth token:', e);
      }
    }
    
    if (!userId) {
      console.log('[API] No user ID available after all checks');
      return NextResponse.json(
        { error: 'User ID required - either authenticate or provide userId' },
        { status: 401 }
      );
    }

    // Use service role key to ensure we can create projects
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseKey) {
      console.error('[API] SUPABASE_SERVICE_ROLE_KEY not found in environment');
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      );
    }

    console.log('[API] Using service role key for canvas creation');
    console.log('[API] Creating canvas for user:', userId);
    console.log('[API] Service key preview:', supabaseKey.substring(0, 20) + '...');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, check if user has an account
    console.log('[API] Checking for existing user record...');
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[API] Error checking user record:', userError);
    }

    let accountId = userRecord?.account_id || requestAccountId;

    if (requestAccountId && !userRecord?.account_id) {
      console.log('[API] Using provided accountId:', requestAccountId);
    }

    // If no user record exists, create account and user records
    if (!userRecord && !requestAccountId) {
      console.log('[API] No user record found, creating account and user...');
      
      // Get user email from auth
      const userEmail = session?.user?.email || `user_${userId.substring(0, 8)}@temp.com`;
      
      // Use the user ID as the account ID for simplicity (one account per user)
      accountId = userId;
      
      // Create account using user ID as account ID
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          id: accountId, // Use user ID as account ID
          name: `Account for ${userEmail}`,
          billing_email: userEmail,
          subscription_status: 'active',
          plan_type: 'free',
          creator_limit: 10,
          user_limit: 1,
          voice_model_limit: 5,
          storage_limit_gb: 1
        })
        .select()
        .single();
      
      if (accountError) {
        console.error('[API] Error creating account:', accountError);
        return NextResponse.json(
          { error: 'Failed to create account: ' + accountError.message },
          { status: 500 }
        );
      }
      
      console.log('[API] Created account:', newAccount.id);
      
      // Create user record
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          account_id: accountId,
          email: userEmail,
          username: userEmail.split('@')[0],
          full_name: session?.user?.user_metadata?.full_name || userEmail.split('@')[0],
          role: 'admin', // First user in account is admin
          status: 'active'
        });
      
      if (createUserError) {
        console.error('[API] Error creating user record:', createUserError);
        // If user creation fails, delete the account
        await supabase.from('accounts').delete().eq('id', accountId);
        return NextResponse.json(
          { error: 'Failed to create user record: ' + createUserError.message },
          { status: 500 }
        );
      }
      
      console.log('[API] Created account and user records successfully');
    }

    // Generate unique title
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const uniqueTitle = title === 'Untitled Canvas' ? `Canvas ${timestamp}` : title;

    // Prepare project data
    const projectData = {
      account_id: accountId,
      created_by_user_id: userId,
      title: uniqueTitle,
      description: `Created on ${new Date().toLocaleString()}`,
      canvas_data: {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        elements: {},
        connections: {}
      },
      settings: {
        gridSize: 20,
        snapToGrid: false,
        showGrid: true
      },
      is_archived: false,
      is_public: false,
      last_accessed_at: new Date().toISOString()
    };

    console.log('[API] Creating canvas with data:', projectData);

    // Insert the project
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating canvas:', error);
      console.error('[API] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    console.log('[API] Canvas created successfully:', data);

    return NextResponse.json({ 
      success: true, 
      canvas: data 
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}