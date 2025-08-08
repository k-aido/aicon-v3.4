-- ============================================
-- AICON Canvas Database Setup
-- ============================================
-- This script creates all required tables, indexes, and demo data
-- Run this entire script in your Supabase SQL editor

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Drop existing tables if needed (uncomment if you want to reset)
-- DROP TABLE IF EXISTS canvas_connections CASCADE;
-- DROP TABLE IF EXISTS canvas_elements CASCADE;
-- DROP TABLE IF EXISTS canvas_versions CASCADE;
-- DROP TABLE IF EXISTS canvas_workspaces CASCADE;

-- Create canvas_workspaces table
CREATE TABLE IF NOT EXISTS canvas_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID,
    
    -- Workspace details
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Canvas',
    description TEXT,
    
    -- Access tracking
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Viewport state
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1.0}'::jsonb,
    
    -- Settings and preferences
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Sharing and collaboration
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    
    -- Thumbnail support
    thumbnail_data TEXT,
    thumbnail_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

-- Create canvas_elements table
CREATE TABLE IF NOT EXISTS canvas_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    
    -- Element identification
    element_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('content', 'chat', 'folder', 'note')),
    
    -- Position and dimensions
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
    dimensions JSONB NOT NULL DEFAULT '{"width": 300, "height": 200}'::jsonb,
    z_index INTEGER DEFAULT 1,
    
    -- Element-specific properties
    properties JSONB DEFAULT '{}'::jsonb,
    
    -- Visual state
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    
    -- Analysis data (for content elements)
    analysis_data JSONB,
    analysis_status VARCHAR(50) CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique element_id per workspace
    CONSTRAINT unique_element_per_workspace UNIQUE(workspace_id, element_id)
);

-- Create canvas_connections table
CREATE TABLE IF NOT EXISTS canvas_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    
    -- Connection identification
    connection_id INTEGER NOT NULL,
    
    -- Connection endpoints (using element_id, not UUID)
    from_element INTEGER NOT NULL,
    to_element INTEGER NOT NULL,
    
    -- Connection properties
    connection_type VARCHAR(50) DEFAULT 'default',
    properties JSONB DEFAULT '{}'::jsonb,
    
    -- Visual properties
    color VARCHAR(7) DEFAULT '#8B5CF6',
    stroke_width INTEGER DEFAULT 2,
    is_animated BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique connection_id per workspace
    CONSTRAINT unique_connection_per_workspace UNIQUE(workspace_id, connection_id)
);

-- Create canvas_versions table (for history/undo functionality)
CREATE TABLE IF NOT EXISTS canvas_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    
    -- Version info
    version_number INTEGER NOT NULL,
    
    -- Snapshot data
    elements_snapshot JSONB NOT NULL,
    connections_snapshot JSONB NOT NULL,
    viewport_snapshot JSONB,
    
    -- Change tracking
    change_description TEXT,
    changed_by_user_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Indexes for canvas_workspaces
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_user_id 
    ON canvas_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_account_id 
    ON canvas_workspaces(account_id) 
    WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_last_accessed 
    ON canvas_workspaces(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_share_token 
    ON canvas_workspaces(share_token) 
    WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_thumbnail 
    ON canvas_workspaces(id) 
    WHERE thumbnail_data IS NOT NULL;

-- Indexes for canvas_elements
CREATE INDEX IF NOT EXISTS idx_canvas_elements_workspace_id 
    ON canvas_elements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canvas_elements_element_id 
    ON canvas_elements(workspace_id, element_id);
CREATE INDEX IF NOT EXISTS idx_canvas_elements_type 
    ON canvas_elements(type);
CREATE INDEX IF NOT EXISTS idx_canvas_elements_analysis_status 
    ON canvas_elements(analysis_status) 
    WHERE analysis_status IS NOT NULL;

-- Indexes for canvas_connections
CREATE INDEX IF NOT EXISTS idx_canvas_connections_workspace_id 
    ON canvas_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canvas_connections_endpoints 
    ON canvas_connections(workspace_id, from_element, to_element);

-- Indexes for canvas_versions
CREATE INDEX IF NOT EXISTS idx_canvas_versions_workspace_id 
    ON canvas_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canvas_versions_number 
    ON canvas_versions(workspace_id, version_number DESC);

-- ============================================
-- 3. CREATE TRIGGERS
-- ============================================

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_canvas_workspaces_updated_at ON canvas_workspaces;
CREATE TRIGGER update_canvas_workspaces_updated_at 
    BEFORE UPDATE ON canvas_workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_elements_updated_at ON canvas_elements;
CREATE TRIGGER update_canvas_elements_updated_at 
    BEFORE UPDATE ON canvas_elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_connections_updated_at ON canvas_connections;
CREATE TRIGGER update_canvas_connections_updated_at 
    BEFORE UPDATE ON canvas_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. INSERT DEMO DATA
-- ============================================

-- Insert demo workspace with hardcoded UUID
INSERT INTO canvas_workspaces (
    id,
    user_id,
    title,
    description,
    viewport,
    settings,
    is_public,
    metadata,
    tags
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Demo Canvas Workspace',
    'A demo workspace for testing canvas persistence',
    '{"x": 0, "y": 0, "zoom": 1.0}'::jsonb,
    '{"autoSave": true, "showGrid": true, "snapToGrid": false, "gridSize": 20}'::jsonb,
    true,
    '{"created_from": "sql_setup", "version": "1.0.0", "demo": true}'::jsonb,
    ARRAY['demo', 'tutorial', 'example']
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Insert demo elements
INSERT INTO canvas_elements (
    workspace_id,
    element_id,
    type,
    position,
    dimensions,
    properties,
    z_index
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    1,
    'content',
    '{"x": 100, "y": 100}'::jsonb,
    '{"width": 300, "height": 200}'::jsonb,
    '{
        "title": "Welcome to AICON Canvas", 
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 
        "platform": "youtube", 
        "thumbnail": "https://via.placeholder.com/300x200?text=Demo+Content"
    }'::jsonb,
    1
),
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    2,
    'chat',
    '{"x": 500, "y": 100}'::jsonb,
    '{"width": 400, "height": 500}'::jsonb,
    '{
        "title": "AI Assistant",
        "model": "gpt-4",
        "messages": [],
        "status": "idle"
    }'::jsonb,
    2
),
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    3,
    'content',
    '{"x": 100, "y": 350}'::jsonb,
    '{"width": 300, "height": 200}'::jsonb,
    '{
        "title": "Sample Instagram Post",
        "url": "https://www.instagram.com/p/example",
        "platform": "instagram",
        "thumbnail": "https://via.placeholder.com/300x200?text=Instagram+Demo"
    }'::jsonb,
    1
) ON CONFLICT (workspace_id, element_id) DO UPDATE SET
    position = EXCLUDED.position,
    properties = EXCLUDED.properties,
    updated_at = NOW();

-- Insert demo connections
INSERT INTO canvas_connections (
    workspace_id,
    connection_id,
    from_element,
    to_element,
    color,
    properties
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    1,
    1,
    2,
    '#8B5CF6',
    '{"label": "Analyze"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    2,
    3,
    2,
    '#8B5CF6',
    '{"label": "Analyze"}'::jsonb
) ON CONFLICT (workspace_id, connection_id) DO UPDATE SET
    from_element = EXCLUDED.from_element,
    to_element = EXCLUDED.to_element,
    updated_at = NOW();

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE canvas_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_versions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read for demo workspace" ON canvas_workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to manage their workspaces" ON canvas_workspaces;
DROP POLICY IF EXISTS "Allow public read for demo elements" ON canvas_elements;
DROP POLICY IF EXISTS "Allow workspace access for elements" ON canvas_elements;
DROP POLICY IF EXISTS "Allow public read for demo connections" ON canvas_connections;
DROP POLICY IF EXISTS "Allow workspace access for connections" ON canvas_connections;
DROP POLICY IF EXISTS "Allow workspace access for versions" ON canvas_versions;

-- Workspace policies
CREATE POLICY "Allow public read for demo workspace" ON canvas_workspaces
    FOR SELECT USING (
        id = '550e8400-e29b-41d4-a716-446655440001'::uuid 
        OR is_public = true
    );

CREATE POLICY "Allow authenticated users to manage their workspaces" ON canvas_workspaces
    FOR ALL USING (
        auth.uid() = user_id 
        OR id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    );

-- Elements policies
CREATE POLICY "Allow public read for demo elements" ON canvas_elements
    FOR SELECT USING (
        workspace_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    );

CREATE POLICY "Allow workspace access for elements" ON canvas_elements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_elements.workspace_id
            AND (
                canvas_workspaces.user_id = auth.uid() 
                OR canvas_workspaces.id = '550e8400-e29b-41d4-a716-446655440001'::uuid
                OR canvas_workspaces.is_public = true
            )
        )
    );

-- Connections policies
CREATE POLICY "Allow public read for demo connections" ON canvas_connections
    FOR SELECT USING (
        workspace_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    );

CREATE POLICY "Allow workspace access for connections" ON canvas_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_connections.workspace_id
            AND (
                canvas_workspaces.user_id = auth.uid() 
                OR canvas_workspaces.id = '550e8400-e29b-41d4-a716-446655440001'::uuid
                OR canvas_workspaces.is_public = true
            )
        )
    );

-- Versions policies
CREATE POLICY "Allow workspace access for versions" ON canvas_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_versions.workspace_id
            AND canvas_workspaces.user_id = auth.uid()
        )
    );

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON canvas_workspaces TO authenticated;
GRANT ALL ON canvas_elements TO authenticated;
GRANT ALL ON canvas_connections TO authenticated;
GRANT ALL ON canvas_versions TO authenticated;

-- Grant read permissions to anonymous users (for demo mode)
GRANT SELECT ON canvas_workspaces TO anon;
GRANT SELECT ON canvas_elements TO anon;
GRANT SELECT ON canvas_connections TO anon;
GRANT SELECT ON canvas_versions TO anon;

-- Grant usage on sequences if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- 8. VERIFY SETUP
-- ============================================

-- Check if tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    demo_workspace_exists BOOLEAN;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name IN ('canvas_workspaces', 'canvas_elements', 'canvas_connections', 'canvas_versions');
    
    -- Check demo workspace
    SELECT EXISTS(
        SELECT 1 FROM canvas_workspaces 
        WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    ) INTO demo_workspace_exists;
    
    -- Output results
    RAISE NOTICE '';
    RAISE NOTICE '=== SETUP COMPLETE ===';
    RAISE NOTICE 'Tables created: % of 4', table_count;
    RAISE NOTICE 'Demo workspace exists: %', demo_workspace_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Workspace ID: 550e8400-e29b-41d4-a716-446655440001';
    RAISE NOTICE 'Demo User ID: 550e8400-e29b-41d4-a716-446655440002';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test the canvas at: http://localhost:3000/?demo=true';
END $$;

-- Final success message
SELECT 'Canvas database setup completed successfully!' as message;