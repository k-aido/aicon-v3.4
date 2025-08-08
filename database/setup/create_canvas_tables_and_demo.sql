-- This script creates the canvas tables and demo workspace
-- Run this in Supabase SQL editor if the migration hasn't been applied

-- Create canvas_workspaces table if it doesn't exist
CREATE TABLE IF NOT EXISTS canvas_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Canvas',
    description TEXT,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1.0}',
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    thumbnail_data TEXT,
    thumbnail_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create canvas_elements table
CREATE TABLE IF NOT EXISTS canvas_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    element_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('content', 'chat', 'folder', 'note')),
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
    dimensions JSONB NOT NULL DEFAULT '{"width": 300, "height": 200}',
    z_index INTEGER DEFAULT 1,
    properties JSONB DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    analysis_data JSONB,
    analysis_status VARCHAR(50) CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, element_id)
);

-- Create canvas_connections table
CREATE TABLE IF NOT EXISTS canvas_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    connection_id INTEGER NOT NULL,
    from_element INTEGER NOT NULL,
    to_element INTEGER NOT NULL,
    connection_type VARCHAR(50) DEFAULT 'default',
    properties JSONB DEFAULT '{}',
    color VARCHAR(7) DEFAULT '#8B5CF6',
    stroke_width INTEGER DEFAULT 2,
    is_animated BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, connection_id)
);

-- Create canvas_versions table
CREATE TABLE IF NOT EXISTS canvas_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    elements_snapshot JSONB NOT NULL,
    connections_snapshot JSONB NOT NULL,
    viewport_snapshot JSONB,
    change_description TEXT,
    changed_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_user_id ON canvas_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_last_accessed ON canvas_workspaces(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_elements_workspace_id ON canvas_elements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canvas_connections_workspace_id ON canvas_connections(workspace_id);

-- Create or update the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
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

-- Insert demo workspace (will skip if already exists due to primary key constraint)
INSERT INTO canvas_workspaces (
    id,
    user_id,
    title,
    description,
    viewport,
    settings,
    is_public,
    metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    'Demo Canvas Workspace',
    'A demo workspace for testing canvas persistence',
    '{"x": 0, "y": 0, "zoom": 1.0}'::jsonb,
    '{"autoSave": true, "showGrid": true, "snapToGrid": false, "gridSize": 20}'::jsonb,
    true,
    '{"created_from": "sql_setup", "version": "1.0.0", "demo": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert demo elements
INSERT INTO canvas_elements (
    workspace_id,
    element_id,
    type,
    position,
    dimensions,
    properties
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    1,
    'content',
    '{"x": 100, "y": 100}'::jsonb,
    '{"width": 300, "height": 200}'::jsonb,
    '{"title": "Welcome to AICON Canvas", "url": "https://example.com", "platform": "youtube", "thumbnail": "https://via.placeholder.com/300x200?text=Demo+Content"}'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    2,
    'chat',
    '{"x": 500, "y": 100}'::jsonb,
    '{"width": 400, "height": 500}'::jsonb,
    '{"title": "AI Assistant", "messages": []}'::jsonb
) ON CONFLICT (workspace_id, element_id) DO NOTHING;

-- Insert demo connection
INSERT INTO canvas_connections (
    workspace_id,
    connection_id,
    from_element,
    to_element
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    1,
    1,
    2
) ON CONFLICT (workspace_id, connection_id) DO NOTHING;

-- Grant permissions (adjust based on your Supabase setup)
-- These may need to be run by a superuser
GRANT ALL ON canvas_workspaces TO authenticated;
GRANT ALL ON canvas_elements TO authenticated;
GRANT ALL ON canvas_connections TO authenticated;
GRANT ALL ON canvas_versions TO authenticated;

-- For anonymous access in demo mode
GRANT SELECT ON canvas_workspaces TO anon;
GRANT SELECT ON canvas_elements TO anon;
GRANT SELECT ON canvas_connections TO anon;

-- Output success message
SELECT 'Canvas tables and demo workspace created successfully!' as message;