-- ============================================
-- AICON DEMO MODE COMPLETE SETUP
-- ============================================
-- This script sets up everything needed for demo mode:
-- 1. Creates demo account and user
-- 2. Sets up RLS policies for demo access
-- 3. Removes constraints that block demo usage
-- 4. Creates initial demo data
-- 5. Optimizes for single-account multi-canvas usage

-- ============================================
-- STEP 1: CREATE DEMO ACCOUNT AND USER
-- ============================================

-- Create demo account (if not exists)
INSERT INTO accounts (
    id,
    email,
    account_type,
    status,
    metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'demo@aicon.local',
    'unlimited', -- Special type for demo
    'active',
    jsonb_build_object(
        'demo', true,
        'created_from', 'demo_setup',
        'version', '1.0.0',
        'features', jsonb_build_object(
            'unlimited_projects', true,
            'unlimited_storage', true,
            'all_features_enabled', true
        )
    )
) ON CONFLICT (id) DO UPDATE SET
    account_type = 'unlimited',
    status = 'active',
    metadata = EXCLUDED.metadata;

-- Create demo user (if not exists)
INSERT INTO users (
    id,
    account_id,
    email,
    username,
    display_name,
    role,
    status,
    metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'demo@aicon.local',
    'demo',
    'Demo User',
    'admin', -- Give admin role for demo
    'active',
    jsonb_build_object(
        'demo', true,
        'created_from', 'demo_setup'
    )
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    metadata = EXCLUDED.metadata;

-- ============================================
-- STEP 2: DISABLE RLS FOR DEMO TABLES (DEVELOPMENT ONLY)
-- ============================================

-- Disable RLS on all relevant tables for demo mode
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_elements DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_interfaces DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE DEMO-FRIENDLY POLICIES (IF RLS NEEDS TO BE ENABLED)
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "projects_account_access" ON projects;
DROP POLICY IF EXISTS "projects_user_access" ON projects;
DROP POLICY IF EXISTS "canvas_elements_workspace_access" ON canvas_elements;
DROP POLICY IF EXISTS "canvas_connections_workspace_access" ON canvas_connections;

-- Create permissive policies for demo account
CREATE POLICY "demo_projects_full_access" ON projects
    FOR ALL 
    USING (
        account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
        OR true -- Allow all access in demo mode
    )
    WITH CHECK (
        account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
        OR true -- Allow all access in demo mode
    );

CREATE POLICY "demo_elements_full_access" ON canvas_elements
    FOR ALL
    USING (true) -- Allow all access
    WITH CHECK (true); -- Allow all access

CREATE POLICY "demo_connections_full_access" ON canvas_connections
    FOR ALL
    USING (true) -- Allow all access
    WITH CHECK (true); -- Allow all access

-- ============================================
-- STEP 4: REMOVE CONSTRAINTS THAT BLOCK DEMO
-- ============================================

-- Remove any unique constraints that might block multiple canvases
DROP CONSTRAINT IF EXISTS projects_account_single_canvas ON projects;
DROP CONSTRAINT IF EXISTS projects_title_unique ON projects;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_demo_account 
    ON projects(account_id) 
    WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;

CREATE INDEX IF NOT EXISTS idx_projects_created_at_desc 
    ON projects(created_at DESC);

-- ============================================
-- STEP 5: CREATE HELPER FUNCTIONS FOR DEMO MODE
-- ============================================

-- Function to create a new demo canvas
CREATE OR REPLACE FUNCTION create_demo_canvas(
    p_title TEXT DEFAULT NULL
) RETURNS projects AS $$
DECLARE
    v_project projects;
    v_title TEXT;
BEGIN
    -- Generate title if not provided
    v_title := COALESCE(p_title, 'Canvas ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'));
    
    -- Create the project
    INSERT INTO projects (
        account_id,
        created_by_user_id,
        title,
        description,
        project_type,
        status,
        canvas_data,
        metadata
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        v_title,
        'Created in demo mode',
        'canvas',
        'active',
        jsonb_build_object(
            'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1.0),
            'settings', jsonb_build_object(
                'gridSize', 20,
                'snapToGrid', false,
                'showGrid', true,
                'autoSave', true
            ),
            'elements', '[]'::jsonb,
            'connections', '[]'::jsonb,
            'last_saved', now()
        ),
        jsonb_build_object(
            'demo', true,
            'created_from', 'demo_function'
        )
    ) RETURNING * INTO v_project;
    
    RETURN v_project;
END;
$$ LANGUAGE plpgsql;

-- Function to reset demo data (cleanup)
CREATE OR REPLACE FUNCTION reset_demo_data() RETURNS void AS $$
BEGIN
    -- Delete all demo projects except the main one
    DELETE FROM projects 
    WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    AND id != '550e8400-e29b-41d4-a716-446655440003'::uuid;
    
    -- Reset the main demo project
    UPDATE projects 
    SET 
        canvas_data = jsonb_build_object(
            'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1.0),
            'settings', jsonb_build_object(
                'gridSize', 20,
                'snapToGrid', false,
                'showGrid', true,
                'autoSave', true
            ),
            'elements', '[]'::jsonb,
            'connections', '[]'::jsonb,
            'last_saved', now()
        ),
        updated_at = now()
    WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid;
    
    RAISE NOTICE 'Demo data reset complete';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: CREATE INITIAL DEMO PROJECT
-- ============================================

-- Create the main demo project
INSERT INTO projects (
    id,
    account_id,
    created_by_user_id,
    title,
    description,
    project_type,
    status,
    canvas_data,
    metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Demo Canvas - Main',
    'Primary demo canvas with sample content',
    'canvas',
    'active',
    jsonb_build_object(
        'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1.0),
        'settings', jsonb_build_object(
            'gridSize', 20,
            'snapToGrid', false,
            'showGrid', true,
            'autoSave', true
        ),
        'elements', jsonb_build_array(
            jsonb_build_object(
                'id', 1,
                'type', 'content',
                'x', 100,
                'y', 100,
                'width', 300,
                'height', 200,
                'title', 'Welcome to AICON',
                'url', 'https://example.com/demo',
                'platform', 'youtube',
                'thumbnail', '/demo-thumbnail.jpg'
            )
        ),
        'connections', '[]'::jsonb,
        'last_saved', now()
    ),
    jsonb_build_object(
        'demo', true,
        'main_demo_project', true
    )
) ON CONFLICT (id) DO UPDATE SET
    canvas_data = EXCLUDED.canvas_data,
    updated_at = now();

-- ============================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================

-- Grant full permissions on all tables for demo usage
GRANT ALL ON accounts TO authenticated, anon;
GRANT ALL ON users TO authenticated, anon;
GRANT ALL ON projects TO authenticated, anon;
GRANT ALL ON canvas_elements TO authenticated, anon;
GRANT ALL ON canvas_connections TO authenticated, anon;
GRANT ALL ON chat_interfaces TO authenticated, anon;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- ============================================
-- STEP 8: CREATE DEMO MODE VIEW
-- ============================================

-- Create a view for easy canvas management
CREATE OR REPLACE VIEW demo_canvases AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.status,
    p.created_at,
    p.updated_at,
    p.canvas_data->>'last_saved' as last_saved,
    jsonb_array_length(COALESCE(p.canvas_data->'elements', '[]'::jsonb)) as element_count,
    jsonb_array_length(COALESCE(p.canvas_data->'connections', '[]'::jsonb)) as connection_count
FROM projects p
WHERE p.account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY p.updated_at DESC;

-- ============================================
-- STEP 9: VERIFICATION
-- ============================================

DO $$
DECLARE
    v_account_exists BOOLEAN;
    v_user_exists BOOLEAN;
    v_project_count INTEGER;
    v_rls_disabled BOOLEAN;
BEGIN
    -- Check demo account
    SELECT EXISTS(SELECT 1 FROM accounts WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid) INTO v_account_exists;
    
    -- Check demo user
    SELECT EXISTS(SELECT 1 FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440002'::uuid) INTO v_user_exists;
    
    -- Count demo projects
    SELECT COUNT(*) FROM projects WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid INTO v_project_count;
    
    -- Check RLS status
    SELECT NOT rowsecurity FROM pg_tables WHERE tablename = 'projects' AND schemaname = 'public' INTO v_rls_disabled;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== DEMO MODE SETUP COMPLETE ===';
    RAISE NOTICE 'Demo Account: % ✅', CASE WHEN v_account_exists THEN 'Created' ELSE 'Failed' END;
    RAISE NOTICE 'Demo User: % ✅', CASE WHEN v_user_exists THEN 'Created' ELSE 'Failed' END;
    RAISE NOTICE 'Demo Projects: %', v_project_count;
    RAISE NOTICE 'RLS Status: %', CASE WHEN v_rls_disabled THEN 'Disabled (Good for Demo)' ELSE 'Enabled (May cause issues)' END;
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Account ID: 550e8400-e29b-41d4-a716-446655440001';
    RAISE NOTICE 'Demo User ID: 550e8400-e29b-41d4-a716-446655440002';
    RAISE NOTICE '';
    RAISE NOTICE '✅ You can now create unlimited canvases in demo mode!';
    RAISE NOTICE '✅ Use create_demo_canvas() function to create new canvases';
    RAISE NOTICE '✅ Use reset_demo_data() function to clean up';
END $$;

-- Show demo canvases
SELECT * FROM demo_canvases;