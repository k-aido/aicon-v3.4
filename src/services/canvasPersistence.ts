/**
 * Canvas Persistence Service
 * 
 * This service handles all database operations for canvas persistence
 * WITHOUT modifying or interfering with existing canvas functionality.
 * It works alongside the Zustand store to provide optional persistence.
 * 
 * Updated to use existing database structure:
 * - projects table for canvas workspaces (stores canvas state in canvas_data JSONB field)
 * - canvas_elements table for elements
 * - canvas_connections table for connections
 * - chat_interfaces table for chat elements
 */

import { createBrowserClient } from '../../lib/supabase/client';

// Types matching the existing database schema
export interface Project {
  id: string;
  account_id: string;
  created_by_user_id?: string;
  title: string;
  description?: string;
  project_type?: string;
  canvas_data?: {
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
    elements?: any;  // Actually an object, not array
    connections?: any;  // Actually an object, not array
  };
  settings?: Record<string, any>;
  is_archived: boolean;
  is_public: boolean;
  is_starred?: boolean;
  starred_at?: string | null;
  thumbnail_url?: string;
  last_accessed_at?: string;
  last_accessed_by_user_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

// Keep the old interface name for compatibility but map to Project
export interface CanvasWorkspace extends Project {
  // Additional fields for compatibility
  user_id?: string;
  name?: string; // For compatibility, maps to title
  title: string; // maps to name
  last_accessed: string; // maps to updated_at
  access_count: number;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  settings: Record<string, any>;
  is_public: boolean;
  is_starred?: boolean;
  starred_at?: string | null;
  share_token?: string;
  tags: string[];
  deleted_at?: string;
}

export interface CanvasElementDB {
  id: string;
  workspace_id: string;
  element_id: number;
  type: 'content' | 'chat' | 'folder' | 'note';
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  z_index: number;
  properties: Record<string, any>;
  is_visible: boolean;
  is_locked: boolean;
  analysis_data?: Record<string, any>;
  analysis_status?: 'pending' | 'analyzing' | 'completed' | 'failed';
  analyzed_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CanvasConnectionDB {
  id: string;
  workspace_id: string;
  connection_id: number;
  from_element: number;
  to_element: number;
  connection_type: string;
  properties: Record<string, any>;
  color: string;
  stroke_width: number;
  is_animated: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CanvasVersion {
  id: string;
  workspace_id: string;
  version_number: number;
  elements_snapshot: any;
  connections_snapshot: any;
  viewport_snapshot?: any;
  change_description?: string;
  changed_by_user_id?: string;
  created_at: string;
}

class CanvasPersistenceService {
  private static instance: CanvasPersistenceService | null = null;
  private supabase;
  
  constructor() {
    this.supabase = createBrowserClient();
    console.log('[CanvasPersistence] Service initialized');
    
    // Debug: Check if Supabase is properly configured
    if (typeof window !== 'undefined') {
      console.log('[CanvasPersistence] Supabase URL configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('[CanvasPersistence] Supabase Anon Key configured:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      // Check and restore session from localStorage/cookies
      this.restoreSession();
    }
  }
  
  private async restoreSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (session) {
        console.log('[CanvasPersistence] Session restored:', session.user?.id, session.user?.email);
      } else {
        console.log('[CanvasPersistence] No session found to restore');
        if (error) {
          console.error('[CanvasPersistence] Session restore error:', error);
        }
      }
    } catch (error) {
      console.error('[CanvasPersistence] Failed to restore session:', error);
    }
  }

  /**
   * Get singleton instance of CanvasPersistenceService
   */
  static getInstance(): CanvasPersistenceService {
    if (!CanvasPersistenceService.instance) {
      CanvasPersistenceService.instance = new CanvasPersistenceService();
    }
    return CanvasPersistenceService.instance;
  }

  /**
   * Debug method to test database connection and table access
   */
  async testConnection(): Promise<{
    connected: boolean;
    tables: Record<string, boolean>;
    errors: string[];
  }> {
    const tables: Record<string, boolean> = {
      accounts: false,
      users: false,
      projects: false,
      canvas_elements: false,
      canvas_connections: false
    };
    const errors: string[] = [];

    for (const tableName of Object.keys(tables)) {
      try {
        console.log(`[CanvasPersistence] Testing table: ${tableName}`);
        const { data, error } = await this.supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (error) {
          errors.push(`${tableName}: ${error.message}`);
          console.error(`[CanvasPersistence] Error accessing ${tableName}:`, error);
        } else {
          tables[tableName] = true;
          console.log(`[CanvasPersistence] ✓ ${tableName} accessible`);
        }
      } catch (err) {
        errors.push(`${tableName}: ${err}`);
        console.error(`[CanvasPersistence] Exception accessing ${tableName}:`, err);
      }
    }

    return {
      connected: errors.length === 0,
      tables,
      errors
    };
  }

  /**
   * Test if we can find the demo project
   */
  async testDemoProjectQuery(): Promise<{
    success: boolean;
    queries: any[];
    results: any[];
  }> {
    const DEMO_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440003';
    const queries: any[] = [];
    const results: any[] = [];
    
    try {
      // Query 1: Direct ID lookup
      console.log('[CanvasPersistence] Test 1: Direct ID lookup');
      const query1 = this.supabase
        .from('projects')
        .select('id, title, account_id')
        .eq('id', DEMO_PROJECT_ID);
      
      const { data: data1, error: error1 } = await query1;
      queries.push({ test: 'Direct ID lookup', query: `SELECT id, title, account_id FROM projects WHERE id = '${DEMO_PROJECT_ID}'` });
      results.push({ data: data1, error: error1 });
      
      // Query 2: String comparison
      console.log('[CanvasPersistence] Test 2: String ID comparison');
      const { data: data2, error: error2 } = await this.supabase
        .from('projects')
        .select('id, title')
        .eq('id', DEMO_PROJECT_ID.toString());
      
      queries.push({ test: 'String ID comparison', query: `SELECT id, title FROM projects WHERE id = '${DEMO_PROJECT_ID.toString()}'` });
      results.push({ data: data2, error: error2 });
      
      // Query 3: Get all projects
      console.log('[CanvasPersistence] Test 3: Get all projects');
      const { data: data3, error: error3 } = await this.supabase
        .from('projects')
        .select('id, title, account_id')
        .limit(10);
      
      queries.push({ test: 'Get all projects', query: 'SELECT id, title, account_id FROM projects LIMIT 10' });
      results.push({ data: data3, error: error3 });
      
      // Query 4: Check if ID exists in results
      if (data3 && Array.isArray(data3)) {
        const found = data3.find(p => p.id === DEMO_PROJECT_ID);
        queries.push({ test: 'ID exists in all projects', query: 'JavaScript check' });
        results.push({ found: !!found, project: found });
      }
      
      return {
        success: results.some(r => r.data && r.data.length > 0),
        queries,
        results
      };
    } catch (error) {
      console.error('[CanvasPersistence] Test demo project query error:', error);
      return {
        success: false,
        queries,
        results: [...results, { error }]
      };
    }
  }

  /**
   * Check if RLS is blocking access
   */
  async checkRLS(): Promise<{
    projects: { enabled: boolean; accessible: boolean };
    canvas_elements: { enabled: boolean; accessible: boolean };
    canvas_connections: { enabled: boolean; accessible: boolean };
  }> {
    const results = {
      projects: { enabled: false, accessible: false },
      canvas_elements: { enabled: false, accessible: false },
      canvas_connections: { enabled: false, accessible: false }
    };

    for (const table of Object.keys(results)) {
      try {
        // Try to access the table
        const { data, error } = await this.supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          console.log(`[CanvasPersistence] RLS check for ${table}:`, error.message);
          // Check if it's an RLS error
          if (error.message.includes('row-level security') || error.code === '42501') {
            results[table as keyof typeof results].enabled = true;
            results[table as keyof typeof results].accessible = false;
          }
        } else {
          results[table as keyof typeof results].accessible = true;
          // If we can access it, RLS might be disabled or we have permission
          results[table as keyof typeof results].enabled = data !== null;
        }
      } catch (err) {
        console.error(`[CanvasPersistence] RLS check error for ${table}:`, err);
      }
    }

    console.log('[CanvasPersistence] RLS check results:', results);
    return results;
  }

  /**
   * Helper method to transform Project to CanvasWorkspace format
   * Handles NULL values properly for all fields
   */
  private projectToWorkspace(project: Project): CanvasWorkspace {
    return {
      ...project,
      user_id: project.created_by_user_id || project.account_id || '', // Handle NULL created_by_user_id
      name: project.title || 'Untitled Canvas', // For compatibility, handle NULL title
      last_accessed: project.last_accessed_at || project.updated_at || project.created_at,
      access_count: 0,
      viewport: project.canvas_data?.viewport || { x: 0, y: 0, zoom: 1.0 },
      settings: project.settings || {},
      share_token: undefined,
      tags: [],
      deleted_at: undefined,
      // Ensure all required fields are present
      title: project.title || 'Untitled Canvas',
      description: project.description || '',
      is_archived: project.is_archived || false,
      is_public: project.is_public || false,
      is_starred: project.is_starred || false,
      starred_at: project.starred_at || null,
      thumbnail_url: project.thumbnail_url || undefined,
      last_accessed_at: project.last_accessed_at || undefined,
      last_accessed_by_user_id: project.last_accessed_by_user_id || undefined
    };
  }

  /**
   * Helper method to map array of projects to workspaces with error handling
   */
  private mapProjectsToWorkspaces(projects: Project[]): CanvasWorkspace[] {
    return projects.map((project, index) => {
      try {
        console.log(`[CanvasPersistence] 🔍 DEBUG: Mapping project ${index + 1}/${projects.length}:`, {
          id: project.id,
          title: project.title,
          account_id: project.account_id,
          created_by_user_id: project.created_by_user_id
        });
        
        const workspace = this.projectToWorkspace(project);
        
        console.log(`[CanvasPersistence] 🔍 DEBUG: Mapped workspace ${index + 1}:`, {
          id: workspace.id,
          title: workspace.title,
          user_id: workspace.user_id,
          account_id: workspace.account_id
        });
        
        return workspace;
      } catch (error) {
        console.error('[CanvasPersistence] ❌ ERROR: Failed to map project to workspace:', {
          projectId: project.id,
          error,
          projectData: project
        });
        
        // Return a minimal workspace if mapping fails
        return {
          ...project,
          user_id: project.created_by_user_id || project.account_id || '',
          name: project.title || 'Untitled Canvas',
          last_accessed: project.last_accessed_at || project.updated_at || project.created_at,
          access_count: 0,
          viewport: project.canvas_data?.viewport || { x: 0, y: 0, zoom: 1.0 },
          settings: project.settings || {},
          share_token: undefined,
          tags: [],
          deleted_at: undefined,
          title: project.title || 'Untitled Canvas',
          is_starred: project.is_starred || false,
          starred_at: project.starred_at || null
        } as CanvasWorkspace;
      }
    });
  }

  /**
   * Get demo project specifically
   */
  async getDemoProject(): Promise<CanvasWorkspace | null> {
    const DEMO_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440003';
    const DEMO_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
    
    try {
      console.log('[CanvasPersistence] ========== GETTING DEMO PROJECT ==========');
      console.log('[CanvasPersistence] Looking for project ID:', DEMO_PROJECT_ID);
      
      // First, let's see what's in the projects table
      console.log('[CanvasPersistence] Step 1: Checking all projects in database...');
      const { data: allProjects, error: allError } = await this.supabase
        .from('projects')
        .select('id, account_id, title, project_type')
        .limit(10);
      
      console.log('[CanvasPersistence] All projects query result:', {
        data: allProjects,
        error: allError,
        count: allProjects?.length || 0
      });
      
      // Now try to get the specific demo project
      console.log('[CanvasPersistence] Step 2: Querying for specific demo project...');
      console.log('[CanvasPersistence] Query: SELECT * FROM projects WHERE id =', DEMO_PROJECT_ID);
      
      const { data, error, count } = await this.supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('id', DEMO_PROJECT_ID) as { data: Project[] | null; error: any; count: number | null };

      console.log('[CanvasPersistence] Demo project query result:', {
        data,
        error,
        count,
        dataLength: data?.length || 0
      });

      if (error) {
        console.error('[CanvasPersistence] Error fetching demo project:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      }
      
      if (data && data.length > 0) {
        console.log('[CanvasPersistence] Found demo project(s):', data.length);
        const project = data[0]; // Take the first one
        console.log('[CanvasPersistence] Using project:', {
          id: project.id,
          title: project.title,
          account_id: project.account_id,
          project_type: project.project_type
        });
        return this.projectToWorkspace(project);
      }
      
      // If not found by ID, try by account
      console.log('[CanvasPersistence] Step 3: Demo project not found by ID, trying by account...');
      console.log('[CanvasPersistence] Query: SELECT * FROM projects WHERE account_id =', DEMO_ACCOUNT_ID);
      
      const { data: accountProjects, error: accountError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('account_id', DEMO_ACCOUNT_ID) as { data: Project[] | null; error: any };
        
      console.log('[CanvasPersistence] Account projects query result:', {
        data: accountProjects,
        error: accountError,
        count: accountProjects?.length || 0
      });
      
      if (accountProjects && accountProjects.length > 0) {
        console.log('[CanvasPersistence] Found canvas project(s) for demo account:', accountProjects.length);
        const project = accountProjects[0];
        console.log('[CanvasPersistence] Using first project:', {
          id: project.id,
          title: project.title
        });
        return this.projectToWorkspace(project);
      }
      
      console.log('[CanvasPersistence] No demo project found in database');
      return null;
    } catch (error) {
      console.error('[CanvasPersistence] Unexpected error getting demo project:', error);
      return null;
    }
  }

  /**
   * Create a new workspace (project)
   */
  async createWorkspace(userId: string, title: string = 'Untitled Canvas'): Promise<CanvasWorkspace | null> {
    try {
      console.log(`[CanvasPersistence] ========== CREATING NEW WORKSPACE ==========`);
      console.log(`[CanvasPersistence] User ID: ${userId}, Title: ${title}`);
      
      // First, get the user's account_id from the users table
      console.log(`[CanvasPersistence] Looking up account_id for user...`);
      const { data: userRecord, error: userError } = await this.supabase
        .from('users')
        .select('account_id')
        .eq('id', userId)
        .single();
        
      let accountId: string;
      if (userError || !userRecord) {
        console.log(`[CanvasPersistence] No user record found for ${userId}, will use userId as accountId`);
        // If no user record exists, the API will create one
        accountId = userId;
      } else {
        console.log(`[CanvasPersistence] Found user record, account_id: ${userRecord.account_id}`);
        accountId = userRecord.account_id as string;
      }
      
      // Use API endpoint for creation to handle RLS issues
      const response = await fetch('/api/canvas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          userId, // Send userId for created_by_user_id
          accountId // Send accountId to ensure proper association
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[CanvasPersistence] ❌ API error creating canvas:', result);
        console.error('[CanvasPersistence] Response status:', response.status);
        console.error('[CanvasPersistence] Error details:', {
          error: result.error,
          code: result.code,
          details: result.details,
          hint: result.hint
        });
        
        // Throw error with details for better error handling
        throw new Error(result.error || 'Failed to create canvas');
      }

      if (!result.canvas) {
        console.error('[CanvasPersistence] ❌ No canvas returned from API');
        console.error('[CanvasPersistence] API response:', result);
        return null;
      }

      console.log('[CanvasPersistence] ✅ Canvas created via API:', result.canvas);
      
      // Transform to CanvasWorkspace format
      const workspace = this.projectToWorkspace(result.canvas);
      console.log('[CanvasPersistence] Transformed to workspace:', workspace);
      
      return workspace;
    } catch (error) {
      console.error('[CanvasPersistence] ❌ Unexpected error in createWorkspace:', error);
      return null;
    }
  }

  /**
   * Get workspace (project) by ID
   */
  async getWorkspace(workspaceId: string): Promise<CanvasWorkspace | null> {
    try {
      console.log(`[CanvasPersistence] Getting workspace: ${workspaceId}`);
      
      // Use select without maybeSingle to avoid the error
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', workspaceId) as { data: Project[] | null; error: any };

      console.log('[CanvasPersistence] Workspace query result:', {
        data,
        error,
        dataLength: data?.length || 0
      });

      if (error) {
        console.error('[CanvasPersistence] Error fetching project:', error);
        console.error('[CanvasPersistence] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          workspaceId
        });
        return null;
      }

      if (!data || data.length === 0) {
        console.log('[CanvasPersistence] No project found with ID:', workspaceId);
        return null;
      }

      const project = data[0]; // Take the first result
      console.log('[CanvasPersistence] Found project:', {
        id: project.id,
        title: project.title,
        account_id: project.account_id
      });

      // Update last accessed
      await this.supabase
        .from('projects')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      return this.projectToWorkspace(project);
    } catch (error) {
      console.error('[CanvasPersistence] Unexpected error in getWorkspace:', error);
      return null;
    }
  }

  /**
   * Get all workspaces (projects) for a user
   */
  async getUserWorkspaces(userId: string): Promise<CanvasWorkspace[]> {
    try {
      console.log('[CanvasPersistence] ========== FETCHING USER WORKSPACES ==========');
      console.log('[CanvasPersistence] 🔍 DEBUG: Input userId:', userId);
      
      // Check current auth session
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      console.log('[CanvasPersistence] 🔐 Current auth session:', session ? 'Authenticated' : 'Not authenticated');
      console.log('[CanvasPersistence] 🔐 Session user ID:', session?.user?.id);
      console.log('[CanvasPersistence] 🔐 Session user email:', session?.user?.email);
      console.log('[CanvasPersistence] 🔐 Session error:', sessionError);
      
      if (!session) {
        console.error('[CanvasPersistence] ❌ No authenticated session found');
        console.log('[CanvasPersistence] ⚠️  Proceeding without session (might cause RLS issues)');
      } else {
        // Compare session user ID with provided userId
        if (session.user.id !== userId) {
          console.warn('[CanvasPersistence] ⚠️  Session user ID does not match provided userId:', {
            sessionUserId: session.user.id,
            providedUserId: userId
          });
        } else {
          console.log('[CanvasPersistence] ✅ Session user ID matches provided userId');
        }
      }
      
      // First try to get user's account_id
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('account_id')
        .eq('id', userId)
        .single();
      
      console.log('[CanvasPersistence] 🔍 DEBUG: User lookup result:', {
        userData,
        userError,
        hasAccountId: !!userData?.account_id,
        errorCode: userError?.code,
        errorMessage: userError?.message
      });
      
      if (userData?.account_id) {
        // User found, query by account_id
        console.log('[CanvasPersistence] ✅ User found, querying by account_id:', userData.account_id);
        const { data, error } = await this.supabase
          .from('projects')
          .select('*')
          .eq('account_id', userData.account_id)
          .eq('project_type', 'canvas')
          .eq('is_archived', false)
          .order('is_starred', { ascending: false }) // Starred first
          .order('starred_at', { ascending: false, nullsFirst: false }) // Recently starred first
          .order('last_accessed_at', { ascending: false }); // Then by last accessed
        
        console.log('[CanvasPersistence] 🔍 DEBUG: Account-based query result:', {
          data,
          error,
          dataLength: data?.length || 0,
          errorCode: error?.code,
          errorMessage: error?.message
        });
        
        if (error) {
          console.error('[CanvasPersistence] ❌ ERROR: Failed to query projects by account_id:', error);
          throw error;
        }
        
        console.log(`[CanvasPersistence] ✅ Found ${data?.length || 0} projects by account_id`);
        return this.mapProjectsToWorkspaces((data || []) as unknown as Project[]);
      } else {
        // No user found, try querying by created_by_user_id as fallback
        console.log('[CanvasPersistence] ⚠️ No user found, querying by created_by_user_id:', userId);
        const { data, error } = await this.supabase
          .from('projects')
          .select('*')
          .eq('created_by_user_id', userId)
          .eq('project_type', 'canvas')
          .eq('is_archived', false)
          .order('is_starred', { ascending: false }) // Starred first
          .order('starred_at', { ascending: false, nullsFirst: false }) // Recently starred first
          .order('last_accessed_at', { ascending: false }); // Then by last accessed
        
        console.log('[CanvasPersistence] 🔍 DEBUG: created_by_user_id query result:', {
          data,
          error,
          dataLength: data?.length || 0,
          errorCode: error?.code,
          errorMessage: error?.message
        });
        
        if (error) {
          console.error('[CanvasPersistence] ❌ ERROR: Failed to query projects by created_by_user_id:', error);
          throw error;
        }
        
        console.log(`[CanvasPersistence] ✅ Found ${data?.length || 0} projects by created_by_user_id`);
        return this.mapProjectsToWorkspaces((data || []) as unknown as Project[]);
      }
    } catch (error) {
      console.error('[CanvasPersistence] ❌ CRITICAL ERROR: Unexpected error in getUserWorkspaces');
      console.error('[CanvasPersistence] 🔍 DEBUG: Exception details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        userId,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  /**
   * Update workspace (project) details
   */
  async updateWorkspace(workspaceId: string, updates: Partial<CanvasWorkspace>): Promise<boolean> {
    try {
      console.log(`[CanvasPersistence] ========== UPDATING WORKSPACE ==========`);
      console.log(`[CanvasPersistence] 🔍 DEBUG: Workspace ID:`, workspaceId);
      console.log(`[CanvasPersistence] 🔍 DEBUG: Updates:`, updates);

      const updateData: any = {
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      };
      
      // Map workspace fields to project fields
      if (updates.title !== undefined) {
        updateData.title = updates.title;
        console.log(`[CanvasPersistence] 📝 Updating title to:`, updates.title);
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
        console.log(`[CanvasPersistence] 📝 Updating description to:`, updates.description);
      }
      if (updates.is_public !== undefined) {
        updateData.is_public = updates.is_public;
        console.log(`[CanvasPersistence] 📝 Updating is_public to:`, updates.is_public);
      }
      if (updates.is_archived !== undefined) {
        updateData.is_archived = updates.is_archived;
        console.log(`[CanvasPersistence] 📝 Updating is_archived to:`, updates.is_archived);
      }

      console.log(`[CanvasPersistence] 🔍 DEBUG: Final update data:`, updateData);
      
      const { error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', workspaceId);
      
      if (error) {
        console.error('[CanvasPersistence] ❌ ERROR: Failed to update workspace:', error);
        console.error('[CanvasPersistence] 🔍 DEBUG: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          workspaceId,
          updateData
        });
        return false;
      }
      
      console.log('[CanvasPersistence] ✅ Workspace updated successfully:', workspaceId);
      return true;
    } catch (error) {
      console.error('[CanvasPersistence] ❌ CRITICAL ERROR: Unexpected error in updateWorkspace');
      console.error('[CanvasPersistence] 🔍 DEBUG: Exception details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        workspaceId,
        updates,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Save elements to database
   * Maps from Zustand store format to database format
   */
  async saveElements(workspaceId: string, elements: any[]): Promise<boolean> {
    try {
      // Transform elements from store format to database format
      const dbElements: Partial<CanvasElementDB>[] = elements.map(element => ({
        workspace_id: workspaceId,
        element_id: element.id,
        type: element.type,
        position: { x: element.x, y: element.y },
        dimensions: { width: element.width, height: element.height },
        z_index: element.zIndex || 1,
        properties: {
          title: element.title,
          url: element.url,
          platform: element.platform,
          thumbnail: element.thumbnail,
          messages: element.messages,
          conversations: element.conversations,
          ...element.metadata
        },
        is_visible: true,
        is_locked: false,
        analysis_data: element.analysis,
        metadata: element.metadata || {}
      }));

      // Upsert elements (insert or update)
      const { error } = await this.supabase
        .from('canvas_elements')
        .upsert(dbElements, {
          onConflict: 'workspace_id,element_id'
        });

      if (error) {
        console.error('[CanvasPersistence] Error saving elements:', error);
        console.error('[CanvasPersistence] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          workspaceId,
          elementCount: dbElements.length
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveElements:', error);
      return false;
    }
  }

  /**
   * Load elements from database
   * Maps from database format to Zustand store format
   */
  async loadElements(workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_elements')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true }) as { data: CanvasElementDB[] | null; error: any };

      if (error) {
        console.error('[CanvasPersistence] Error loading elements:', error);
        console.error('[CanvasPersistence] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          workspaceId
        });
        return [];
      }

      // Transform elements from database format to store format
      return (data || []).map(dbElement => ({
        id: dbElement.element_id,
        type: dbElement.type,
        x: dbElement.position.x,
        y: dbElement.position.y,
        width: dbElement.dimensions.width,
        height: dbElement.dimensions.height,
        zIndex: dbElement.z_index,
        title: dbElement.properties.title,
        url: dbElement.properties.url,
        platform: dbElement.properties.platform,
        thumbnail: dbElement.properties.thumbnail,
        messages: dbElement.properties.messages,
        conversations: dbElement.properties.conversations,
        metadata: dbElement.metadata,
        analysis: dbElement.analysis_data
      }));
    } catch (error) {
      console.error('Error in loadElements:', error);
      return [];
    }
  }

  /**
   * Save connections to database
   */
  async saveConnections(workspaceId: string, connections: any[]): Promise<boolean> {
    try {
      const dbConnections: Partial<CanvasConnectionDB>[] = connections.map(connection => ({
        workspace_id: workspaceId,
        connection_id: connection.id,
        from_element: connection.from,
        to_element: connection.to,
        connection_type: 'default',
        properties: {},
        color: '#8B5CF6',
        stroke_width: 2,
        is_animated: false,
        metadata: {}
      }));

      const { error } = await this.supabase
        .from('canvas_connections')
        .upsert(dbConnections, {
          onConflict: 'workspace_id,connection_id'
        });

      if (error) {
        console.error('Error saving connections:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveConnections:', error);
      return false;
    }
  }

  /**
   * Load connections from database
   */
  async loadConnections(workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading connections:', error);
        return [];
      }

      return (data || []).map(dbConnection => ({
        id: dbConnection.connection_id,
        from: dbConnection.from_element,
        to: dbConnection.to_element
      }));
    } catch (error) {
      console.error('Error in loadConnections:', error);
      return [];
    }
  }

  /**
   * Save complete canvas state
   */
  async saveCanvas(
    workspaceId: string,
    elements: any[],
    connections: any[],
    viewport?: { x: number; y: number; zoom: number },
    title?: string
  ): Promise<boolean> {
    try {
      console.log('[CanvasPersistence] Saving canvas:', workspaceId);
      console.log('[CanvasPersistence] Elements to save:', elements.length);
      console.log('[CanvasPersistence] Element details:', elements.map(el => ({ 
        id: el.id, 
        type: el.type, 
        title: el.title || 'N/A'
      })));
      console.log('[CanvasPersistence] Connections to save:', connections.length);
      
      // Validate elements before saving
      const validatedElements = elements.map(el => {
        // Check for required fields
        if (!el.id || !el.type) {
          console.warn('[CanvasPersistence] Invalid element missing id or type:', el);
          return null;
        }
        
        // Check for position fields
        if (typeof el.x !== 'number' || typeof el.y !== 'number' || 
            typeof el.width !== 'number' || typeof el.height !== 'number') {
          console.warn('[CanvasPersistence] Invalid element missing position/dimensions:', el);
          return null;
        }
        
        return el;
      }).filter(el => el !== null);
      
      console.log('[CanvasPersistence] Validated elements:', {
        originalCount: elements.length,
        validCount: validatedElements.length,
        invalidCount: elements.length - validatedElements.length
      });
      
      // Prepare canvas_data in the format the projects table expects
      const canvasData = {
        elements: validatedElements.reduce((acc, el) => {
          acc[el.id] = el;
          return acc;
        }, {}),
        connections: connections.reduce((acc, conn) => {
          acc[conn.id] = conn;
          return acc;
        }, {}),
        viewport: viewport || { x: 0, y: 0, zoom: 1.0 }
      };
      
      // Update the project with the new canvas data
      const { error } = await this.supabase
        .from('projects')
        .update({
          canvas_data: canvasData,
          title: title,
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);
      
      if (error) {
        console.error('[CanvasPersistence] Error saving canvas:', error);
        console.error('[CanvasPersistence] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('[CanvasPersistence] Canvas data that failed to save:', {
          workspaceId,
          elementCount: elements.length,
          connectionCount: connections.length,
          canvasDataStructure: Object.keys(canvasData),
          elementsStructure: Object.keys(canvasData.elements || {}).length
        });
        return false;
      }
      
      console.log('[CanvasPersistence] Canvas saved successfully');
      return true;
    } catch (error) {
      console.error('[CanvasPersistence] Error in saveCanvas:', error);
      return false;
    }
  }

  /**
   * Load complete canvas state
   */
  async loadCanvas(workspaceId: string): Promise<any> {
    try {
      console.log('[CanvasPersistence] Loading canvas for workspace:', workspaceId);
      
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', workspaceId)
        .single();
      
      if (error || !data) {
        console.error('[CanvasPersistence] Error loading canvas:', error);
        return null;
      }
      
      console.log('[CanvasPersistence] Canvas data loaded:', {
        id: data.id,
        title: data.title,
        hasCanvasData: !!data.canvas_data,
        canvasDataKeys: data.canvas_data ? Object.keys(data.canvas_data) : []
      });
      
      // Convert canvas_data from database format to app format
      const canvasData = data.canvas_data || {} as any;
      const elements = canvasData.elements ? Object.values(canvasData.elements) : [];
      const connections = canvasData.connections ? Object.values(canvasData.connections) : [];
      
      console.log('[CanvasPersistence] Parsed canvas data:', {
        elementsCount: elements.length,
        elementTypes: elements.map((el: any) => ({ id: el.id, type: el.type, title: el.title || 'N/A' })),
        connectionsCount: connections.length,
        viewport: canvasData.viewport
      });
      
      return {
        ...data,
        elements,
        connections,
        viewport: canvasData.viewport || { x: 0, y: 0, zoom: 1.0 }
      };
    } catch (error) {
      console.error('[CanvasPersistence] Error in loadCanvas:', error);
      return null;
    }
  }

  /**
   * Delete workspace (project) and all its data
   */
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      console.log('[CanvasPersistence] Deleting workspace:', workspaceId);
      
      // Delete the project (canvas_elements and canvas_connections will cascade delete if they exist)
      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', workspaceId);
      
      if (error) {
        console.error('[CanvasPersistence] Error deleting workspace:', error);
        return false;
      }
      
      console.log('[CanvasPersistence] Workspace deleted successfully:', workspaceId);
      return true;
    } catch (error) {
      console.error('[CanvasPersistence] Error in deleteWorkspace:', error);
      return false;
    }
  }

  /**
   * Soft delete workspace (marks as archived instead of removing)
   */
  async softDeleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      console.log('[CanvasPersistence] Soft deleting workspace:', workspaceId);
      
      const { error } = await this.supabase
        .from('projects')
        .update({
          is_archived: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);
      
      if (error) {
        console.error('[CanvasPersistence] Error soft deleting workspace:', error);
        console.error('[CanvasPersistence] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          workspaceId
        });
        return false;
      }
      
      console.log('[CanvasPersistence] Workspace soft deleted successfully:', workspaceId);
      return true;
    } catch (error) {
      console.error('[CanvasPersistence] Error in softDeleteWorkspace:', error);
      return false;
    }
  }

  /**
   * Toggle star status for a workspace
   */
  async toggleStarWorkspace(workspaceId: string, isStarred: boolean): Promise<boolean> {
    try {
      console.log('[CanvasPersistence] Toggling star for workspace:', workspaceId, isStarred);
      
      const updateData: any = {
        is_starred: isStarred,
        starred_at: isStarred ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };
      
      console.log('[CanvasPersistence] 🔍 DEBUG: Star update data:', updateData);
      
      const { error } = await this.supabase
        .from('projects')
        .update(updateData)
        .eq('id', workspaceId);
      
      if (error) {
        console.error('[CanvasPersistence] ❌ ERROR: Failed to toggle star:', error);
        console.error('[CanvasPersistence] 🔍 DEBUG: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          workspaceId,
          isStarred
        });
        return false;
      }
      
      console.log('[CanvasPersistence] ✅ Star toggled successfully:', { workspaceId, isStarred });
      return true;
    } catch (error) {
      console.error('[CanvasPersistence] ❌ CRITICAL ERROR: Unexpected error in toggleStarWorkspace');
      console.error('[CanvasPersistence] 🔍 DEBUG: Exception details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        workspaceId,
        isStarred,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Create a version snapshot
   */
  async createVersion(
    workspaceId: string,
    elements: any[],
    connections: any[],
    viewport?: any,
    description?: string
  ): Promise<boolean> {
    try {
      // Get current version number
      const { data: latestVersion } = await this.supabase
        .from('canvas_versions')
        .select('version_number')
        .eq('workspace_id', workspaceId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = ((latestVersion as any)?.version_number || 0) + 1;

      const { error } = await this.supabase
        .from('canvas_versions')
        .insert({
          workspace_id: workspaceId,
          version_number: nextVersion,
          elements_snapshot: elements,
          connections_snapshot: connections,
          viewport_snapshot: viewport,
          change_description: description
        });

      if (error) {
        console.error('Error creating version:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createVersion:', error);
      return false;
    }
  }

  /**
   * Get workspace versions
   */
  async getVersions(workspaceId: string, limit: number = 50): Promise<CanvasVersion[]> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_versions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('version_number', { ascending: false })
        .limit(limit) as { data: CanvasVersion[] | null; error: any };

      if (error) {
        console.error('Error fetching versions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVersions:', error);
      return [];
    }
  }

  /**
   * Restore from version
   */
  async restoreVersion(workspaceId: string, versionId: string): Promise<{
    elements: any[];
    connections: any[];
    viewport?: any;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('canvas_versions')
        .select('*')
        .eq('id', versionId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !data) {
        console.error('Error fetching version:', error);
        return null;
      }

      return {
        elements: (data as any).elements_snapshot || [],
        connections: (data as any).connections_snapshot || [],
        viewport: (data as any).viewport_snapshot
      };
    } catch (error) {
      console.error('Error in restoreVersion:', error);
      return null;
    }
  }
}

// Export singleton instance
export const canvasPersistence = new CanvasPersistenceService();

// Export class for getInstance pattern
export { CanvasPersistenceService };