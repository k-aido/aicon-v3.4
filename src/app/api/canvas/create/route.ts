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
        
        // Extract the access token
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          // Create a client with the access token
          const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            },
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          });
          
          // Try to get user from the session
          const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
          
          if (user && !userError) {
            userId = user.id;
            session = { user };
            console.log('[API] Got user from auth token:', { userId: user.id, email: user.email });
          } else {
            console.log('[API] Failed to get user from token:', userError);
            // Still use the userId from middleware if available
            if (tokenData.user?.id) {
              userId = tokenData.user.id;
              session = { user: tokenData.user };
              console.log('[API] Using user from token data:', { userId: tokenData.user.id });
            }
          }
        } else if (tokenData.user?.id) {
          // Fallback to user data in token
          userId = tokenData.user.id;
          session = { user: tokenData.user };
          console.log('[API] Using user from token data (no access token):', { userId: tokenData.user.id });
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

    // First, check if user has a profile (our actual user table)
    console.log('[API] Checking for existing user_profile...');
    const { data: profileRecord, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[API] Error checking user profile:', profileError);
    }

    let accountId = userRecord?.account_id || requestAccountId;

    if (requestAccountId && !userRecord?.account_id) {
      console.log('[API] Using provided accountId:', requestAccountId);
    }

    // If no user record exists, create account and user records
    if (!userRecord && !requestAccountId) {
      console.log('[API] No user record found, creating account and user...');
      
      // Get user email from auth
      const userEmail = session?.user?.email || `user_${userId.substring(0, 8)}@aicon.app`;
      
      // Create account using user ID as account ID with correct schema
      const { error: accountError } = await supabase
        .from('accounts')
        .insert({
          id: accountId,
          name: `Personal Workspace`,
          subscription_status: 'active',
          plan_type: 'individual',  // Changed from 'free' to 'individual'
          billing_email: userEmail,
          creator_limit: 5,
          user_limit: 1,
          voice_model_limit: 5,
          storage_limit_gb: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (accountError) {
        console.error('[API] Error creating account:', accountError);
        console.error('[API] Account creation details:', {
          message: accountError.message,
          code: accountError.code,
          details: accountError.details
        });
        // Account creation is mandatory for credit tracking
        return NextResponse.json(
          { 
            error: `Failed to create account: ${accountError.message}`,
            code: accountError.code,
            details: accountError.details,
            hint: 'Account is required for credit tracking and billing'
          },
          { status: 500 }
        );
      }
      
      console.log('[API] Account created successfully');
      
      // Also create a user record in the users table (required for foreign key constraints)
      const { error: userCreateError } = await supabase
        .from('users')
        .insert({
          id: userId,
          account_id: accountId,
          email: userEmail,
          role: 'owner',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (userCreateError) {
        console.error('[API] Error creating user record:', userCreateError);
        // Don't fail if user already exists
        if (userCreateError.code !== '23505') { // 23505 = unique violation
          return NextResponse.json(
            { 
              error: `Failed to create user record: ${userCreateError.message}`,
              code: userCreateError.code,
              details: userCreateError.details
            },
            { status: 500 }
          );
        }
      } else {
        console.log('[API] User record created successfully');
      }
    } else if (existingAccount) {
      console.log('[API] Using existing account:', accountId);
      
      // Check if user record exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!existingUser && (!userCheckError || userCheckError.code === 'PGRST116')) {
        console.log('[API] Creating user record for existing account...');
        
        const userEmail = session?.user?.email || `user_${userId.substring(0, 8)}@aicon.app`;
        
        const { error: userCreateError } = await supabase
          .from('users')
          .insert({
            id: userId,
            account_id: accountId,
            email: userEmail,
            role: 'owner',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (userCreateError) {
          console.error('[API] Error creating user record:', userCreateError);
          return NextResponse.json(
            { 
              error: `Failed to create user record: ${userCreateError.message}`,
              code: userCreateError.code,
              details: userCreateError.details
            },
            { status: 500 }
          );
        }
        
        console.log('[API] User record created successfully');
      }
    }

    // Generate unique title
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const uniqueTitle = title === 'Untitled Canvas' ? `Canvas ${timestamp}` : title;

    // Prepare project data
    const projectData = {
      account_id: accountId,
      created_by_user_id: userId,
      user_id: userId, // Also set user_id for RLS policies
      title: uniqueTitle,
      description: `Created on ${new Date().toLocaleString()}`,
      project_type: 'canvas',
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
      is_starred: false,
      starred_at: null,
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