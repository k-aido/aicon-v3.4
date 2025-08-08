-- Migration: Add canvas persistence tables
-- Description: Adds tables for storing canvas workspaces, elements, and connections
-- Created: 2024-08-03

-- 1. Canvas Workspaces Table
-- Stores canvas workspace metadata and settings
CREATE TABLE IF NOT EXISTS canvas_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Workspace details
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Canvas',
    description TEXT,
    
    -- Access tracking
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Viewport state
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1.0}',
    
    -- Settings and preferences
    settings JSONB DEFAULT '{}',
    
    -- Sharing and collaboration
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

-- 2. Canvas Elements Table
-- Stores individual elements (content pieces, chat interfaces, etc.)
CREATE TABLE IF NOT EXISTS canvas_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    
    -- Element identification
    element_id INTEGER NOT NULL, -- Maps to current Zustand store ID
    type VARCHAR(50) NOT NULL CHECK (type IN ('content', 'chat', 'folder', 'note')),
    
    -- Position and dimensions
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
    dimensions JSONB NOT NULL DEFAULT '{"width": 300, "height": 200}',
    z_index INTEGER DEFAULT 1,
    
    -- Element-specific properties
    properties JSONB DEFAULT '{}', -- Stores title, url, platform, thumbnail, messages, etc.
    
    -- Visual state
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    
    -- Analysis data (for content elements)
    analysis_data JSONB,
    analysis_status VARCHAR(50) CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique element_id per workspace
    UNIQUE(workspace_id, element_id)
);

-- 3. Canvas Connections Table
-- Stores connections between elements
CREATE TABLE IF NOT EXISTS canvas_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES canvas_workspaces(id) ON DELETE CASCADE,
    
    -- Connection identification
    connection_id INTEGER NOT NULL, -- Maps to current Zustand store ID
    
    -- Connection endpoints (using element_id, not UUID)
    from_element INTEGER NOT NULL,
    to_element INTEGER NOT NULL,
    
    -- Connection properties
    connection_type VARCHAR(50) DEFAULT 'default',
    properties JSONB DEFAULT '{}',
    
    -- Visual properties
    color VARCHAR(7) DEFAULT '#8B5CF6',
    stroke_width INTEGER DEFAULT 2,
    is_animated BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique connection_id per workspace
    UNIQUE(workspace_id, connection_id)
);

-- 4. Canvas Versions Table (for history/undo functionality)
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
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_canvas_workspaces_user_id ON canvas_workspaces(user_id);
CREATE INDEX idx_canvas_workspaces_account_id ON canvas_workspaces(account_id);
CREATE INDEX idx_canvas_workspaces_last_accessed ON canvas_workspaces(last_accessed DESC);
CREATE INDEX idx_canvas_workspaces_share_token ON canvas_workspaces(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX idx_canvas_elements_workspace_id ON canvas_elements(workspace_id);
CREATE INDEX idx_canvas_elements_element_id ON canvas_elements(workspace_id, element_id);
CREATE INDEX idx_canvas_elements_type ON canvas_elements(type);

CREATE INDEX idx_canvas_connections_workspace_id ON canvas_connections(workspace_id);
CREATE INDEX idx_canvas_connections_endpoints ON canvas_connections(workspace_id, from_element, to_element);

CREATE INDEX idx_canvas_versions_workspace_id ON canvas_versions(workspace_id);
CREATE INDEX idx_canvas_versions_number ON canvas_versions(workspace_id, version_number DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_canvas_workspaces_updated_at BEFORE UPDATE ON canvas_workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_elements_updated_at BEFORE UPDATE ON canvas_elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_connections_updated_at BEFORE UPDATE ON canvas_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE canvas_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_versions ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view their own workspaces" ON canvas_workspaces
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own workspaces" ON canvas_workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspaces" ON canvas_workspaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspaces" ON canvas_workspaces
    FOR DELETE USING (auth.uid() = user_id);

-- Elements policies (inherit workspace permissions)
CREATE POLICY "Users can view elements in accessible workspaces" ON canvas_elements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_elements.workspace_id
            AND (canvas_workspaces.user_id = auth.uid() OR canvas_workspaces.is_public = true)
        )
    );

-- Connections policies (inherit workspace permissions)
CREATE POLICY "Users can view connections in accessible workspaces" ON canvas_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_connections.workspace_id
            AND (canvas_workspaces.user_id = auth.uid() OR canvas_workspaces.is_public = true)
        )
    );

-- Versions policies (inherit workspace permissions)
CREATE POLICY "Users can view versions in their workspaces" ON canvas_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM canvas_workspaces
            WHERE canvas_workspaces.id = canvas_versions.workspace_id
            AND canvas_workspaces.user_id = auth.uid()
        )
    );