/**
 * Database debugging utilities
 * Helps diagnose connection and table issues
 */

import { createBrowserClient } from '@/lib/supabase/client';

export class DatabaseDebugger {
  private supabase;
  
  constructor() {
    this.supabase = createBrowserClient();
  }

  /**
   * Test Supabase connection
   */
  async testConnection(): Promise<{
    connected: boolean;
    error?: string;
    url?: string;
  }> {
    try {
      console.log('Testing Supabase connection...');
      
      // Check if environment variables are set
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !anonKey) {
        return {
          connected: false,
          error: 'Missing Supabase environment variables',
          url
        };
      }

      // Try a simple query on projects table
      const { error } = await this.supabase
        .from('projects')
        .select('count')
        .limit(1);

      if (error) {
        return {
          connected: false,
          error: `Connection test failed: ${error.message}`,
          url
        };
      }

      return {
        connected: true,
        url
      };
    } catch (error) {
      return {
        connected: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if required tables exist
   */
  async checkTables(): Promise<{
    tables: {
      accounts: boolean;
      users: boolean;
      projects: boolean;
      canvas_elements: boolean;
      canvas_connections: boolean;
      chat_interfaces: boolean;
    };
    errors: string[];
  }> {
    const tables = {
      accounts: false,
      users: false,
      projects: false,
      canvas_elements: false,
      canvas_connections: false,
      chat_interfaces: false
    };
    const errors: string[] = [];

    for (const tableName of Object.keys(tables)) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('count')
          .limit(1);

        if (error) {
          if (error.message.includes('does not exist')) {
            errors.push(`Table '${tableName}' does not exist`);
          } else {
            errors.push(`Error checking table '${tableName}': ${error.message}`);
          }
        } else {
          tables[tableName as keyof typeof tables] = true;
        }
      } catch (err) {
        errors.push(`Unexpected error checking table '${tableName}': ${err}`);
      }
    }

    return { tables, errors };
  }

  /**
   * Check authentication status
   */
  async checkAuth(): Promise<{
    authenticated: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        return {
          authenticated: false,
          error: error.message
        };
      }

      return {
        authenticated: !!user,
        user
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create demo workspace (project) if it doesn't exist
   */
  async ensureDemoWorkspace(): Promise<{
    success: boolean;
    workspace?: any;
    error?: string;
  }> {
    const DEMO_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440001';
    const DEMO_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440002';

    try {
      console.log('Checking for demo project...');

      // First check if it exists
      const { data: existing, error: fetchError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', DEMO_PROJECT_ID)
        .single();

      if (existing) {
        console.log('Demo project already exists:', existing);
        return {
          success: true,
          workspace: existing
        };
      }

      // If not found and error is not "no rows", there's a problem
      if (fetchError && !fetchError.message.includes('No rows')) {
        return {
          success: false,
          error: `Error checking demo project: ${fetchError.message}`
        };
      }

      // Create demo project
      console.log('Creating demo project...');
      const { data: newProject, error: createError } = await this.supabase
        .from('projects')
        .insert({
          id: DEMO_PROJECT_ID,
          account_id: DEMO_ACCOUNT_ID,
          title: 'Demo Canvas Workspace',
          description: 'A demo workspace for testing canvas persistence',
          project_type: 'canvas',
          status: 'active',
          canvas_data: {
            viewport: { x: 0, y: 0, zoom: 1.0 },
            settings: {},
            elements: [],
            connections: []
          },
          metadata: {
            created_from: 'demo_setup',
            version: '1.0.0',
            demo: true
          }
        })
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: `Failed to create demo project: ${createError.message}`
        };
      }

      console.log('Demo project created successfully:', newProject);
      return {
        success: true,
        workspace: newProject
      };
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Run all diagnostics
   */
  async runDiagnostics(): Promise<{
    connection: any;
    tables: any;
    auth: any;
    demo: any;
    summary: string;
  }> {
    console.log('=== Starting Database Diagnostics ===');

    const connection = await this.testConnection();
    console.log('Connection test:', connection);

    const tables = await this.checkTables();
    console.log('Table check:', tables);

    const auth = await this.checkAuth();
    console.log('Auth check:', auth);

    const demo = await this.ensureDemoWorkspace();
    console.log('Demo workspace:', demo);

    // Generate summary
    const issues: string[] = [];
    
    if (!connection.connected) {
      issues.push(`Database connection failed: ${connection.error}`);
    }
    
    if (tables.errors.length > 0) {
      issues.push(...tables.errors);
    }
    
    if (!demo.success) {
      issues.push(`Demo workspace setup failed: ${demo.error}`);
    }

    const summary = issues.length === 0 
      ? '✅ All database checks passed!'
      : `❌ Found ${issues.length} issue(s):\n${issues.join('\n')}`;

    console.log('=== Diagnostics Complete ===');
    console.log(summary);

    return {
      connection,
      tables,
      auth,
      demo,
      summary
    };
  }

  /**
   * Get RLS policies for a table
   */
  async checkRLSPolicies(tableName: string): Promise<{
    enabled: boolean;
    policies: any[];
    error?: string;
  }> {
    try {
      // Check if RLS is enabled
      const { data: tableInfo, error: tableError } = await this.supabase
        .rpc('get_table_rls_status', { table_name: tableName });

      if (tableError) {
        return {
          enabled: false,
          policies: [],
          error: tableError.message
        };
      }

      // Get policies
      const { data: policies, error: policyError } = await this.supabase
        .rpc('get_table_policies', { table_name: tableName });

      if (policyError) {
        return {
          enabled: (tableInfo as any)?.rls_enabled || false,
          policies: [],
          error: policyError.message
        };
      }

      return {
        enabled: (tableInfo as any)?.rls_enabled || false,
        policies: (policies as any[]) || []
      };
    } catch (error) {
      return {
        enabled: false,
        policies: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const databaseDebugger = new DatabaseDebugger();