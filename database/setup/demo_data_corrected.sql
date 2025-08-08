-- ============================================
-- AICON Demo Data with Corrected IDs
-- ============================================
-- This script creates demo data using the correct IDs:
-- Demo account: 550e8400-e29b-41d4-a716-446655440001
-- Demo user: 550e8400-e29b-41d4-a716-446655440002  
-- Demo project: 550e8400-e29b-41d4-a716-446655440003

-- ============================================
-- 1. CREATE DEMO ACCOUNT
-- ============================================

-- Insert demo account with correct ID
INSERT INTO accounts (
    id,
    email,
    account_type,
    status,
    metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid, -- Demo account ID
    'demo@aicon.app',
    'free',
    'active',
    jsonb_build_object(
        'demo', true,
        'created_from', 'sql_setup',
        'version', '1.0.0'
    )
) ON CONFLICT (id) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- ============================================
-- 2. CREATE DEMO USER
-- ============================================

-- Insert demo user with correct ID
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
    '550e8400-e29b-41d4-a716-446655440002'::uuid, -- Demo user ID
    '550e8400-e29b-41d4-a716-446655440001'::uuid, -- Links to demo account
    'demo@aicon.app',
    'demo_user',
    'Demo User',
    'user',
    'active',
    jsonb_build_object(
        'demo', true,
        'created_from', 'sql_setup'
    )
) ON CONFLICT (id) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- ============================================
-- 3. CREATE DEMO PROJECT (Canvas Workspace)
-- ============================================

-- Insert demo project with correct ID
INSERT INTO projects (
    id,
    account_id,
    title,
    description,
    project_type,
    status,
    canvas_data,
    metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    '550e8400-e29b-41d4-a716-446655440001'::uuid, -- Links to demo account
    'Demo Canvas Workspace',
    'A demo workspace for testing canvas persistence',
    'canvas',
    'active',
    jsonb_build_object(
        'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1.0),
        'settings', jsonb_build_object(
            'autoSave', true,
            'showGrid', true,
            'snapToGrid', false,
            'gridSize', 20
        ),
        'elements', jsonb_build_array(
            jsonb_build_object(
                'id', 1,
                'type', 'content',
                'x', 100,
                'y', 100,
                'width', 300,
                'height', 200,
                'title', 'Welcome to AICON Canvas',
                'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'platform', 'youtube',
                'thumbnail', 'https://via.placeholder.com/300x200?text=Demo+Content'
            ),
            jsonb_build_object(
                'id', 2,
                'type', 'chat',
                'x', 500,
                'y', 100,
                'width', 400,
                'height', 500,
                'title', 'AI Assistant',
                'model', 'gpt-4',
                'messages', jsonb_build_array(),
                'status', 'idle'
            ),
            jsonb_build_object(
                'id', 3,
                'type', 'content',
                'x', 100,
                'y', 350,
                'width', 300,
                'height', 200,
                'title', 'Sample Instagram Post',
                'url', 'https://www.instagram.com/p/example',
                'platform', 'instagram',
                'thumbnail', 'https://via.placeholder.com/300x200?text=Instagram+Demo'
            )
        ),
        'connections', jsonb_build_array(
            jsonb_build_object(
                'id', 1,
                'from', 1,
                'to', 2
            ),
            jsonb_build_object(
                'id', 2,
                'from', 3,
                'to', 2
            )
        )
    ),
    jsonb_build_object(
        'created_from', 'sql_setup',
        'version', '1.0.0',
        'demo', true
    )
) ON CONFLICT (id) DO UPDATE SET
    canvas_data = EXCLUDED.canvas_data,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- ============================================
-- 4. CREATE DEMO CANVAS ELEMENTS
-- ============================================

-- Insert demo elements into canvas_elements table
INSERT INTO canvas_elements (
    workspace_id,
    element_id,
    type,
    position,
    dimensions,
    z_index,
    properties
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    1,
    'content',
    jsonb_build_object('x', 100, 'y', 100),
    jsonb_build_object('width', 300, 'height', 200),
    1,
    jsonb_build_object(
        'title', 'Welcome to AICON Canvas',
        'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'platform', 'youtube',
        'thumbnail', 'https://via.placeholder.com/300x200?text=Demo+Content'
    )
),
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    2,
    'chat',
    jsonb_build_object('x', 500, 'y', 100),
    jsonb_build_object('width', 400, 'height', 500),
    2,
    jsonb_build_object(
        'title', 'AI Assistant',
        'model', 'gpt-4',
        'messages', jsonb_build_array(),
        'status', 'idle'
    )
),
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    3,
    'content',
    jsonb_build_object('x', 100, 'y', 350),
    jsonb_build_object('width', 300, 'height', 200),
    1,
    jsonb_build_object(
        'title', 'Sample Instagram Post',
        'url', 'https://www.instagram.com/p/example',
        'platform', 'instagram',
        'thumbnail', 'https://via.placeholder.com/300x200?text=Instagram+Demo'
    )
) ON CONFLICT (workspace_id, element_id) DO UPDATE SET
    position = EXCLUDED.position,
    properties = EXCLUDED.properties,
    updated_at = NOW();

-- ============================================
-- 5. CREATE DEMO CANVAS CONNECTIONS
-- ============================================

-- Insert demo connections
INSERT INTO canvas_connections (
    workspace_id,
    connection_id,
    from_element,
    to_element,
    connection_type,
    color,
    properties
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    1,
    1,
    2,
    'default',
    '#8B5CF6',
    jsonb_build_object('label', 'Analyze')
),
(
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    2,
    3,
    2,
    'default',
    '#8B5CF6',
    jsonb_build_object('label', 'Analyze')
) ON CONFLICT (workspace_id, connection_id) DO UPDATE SET
    from_element = EXCLUDED.from_element,
    to_element = EXCLUDED.to_element,
    properties = EXCLUDED.properties,
    updated_at = NOW();

-- ============================================
-- 6. CREATE DEMO CHAT INTERFACE
-- ============================================

-- Insert demo chat interface for element 2
INSERT INTO chat_interfaces (
    id,
    project_id,
    canvas_element_id,
    name,
    ai_model,
    conversation_history,
    settings,
    status
) VALUES (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440003'::uuid, -- Demo project ID
    2, -- Reference to canvas element 2
    'AI Assistant',
    'gpt-4',
    jsonb_build_object(
        'messages', jsonb_build_array(),
        'total_tokens', 0
    ),
    jsonb_build_object(
        'temperature', 0.7,
        'max_tokens', 4096,
        'system_prompt', 'You are a helpful AI assistant for content analysis.'
    ),
    'idle'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 7. VERIFY SETUP
-- ============================================

DO $$
DECLARE
    account_exists BOOLEAN;
    user_exists BOOLEAN;
    project_exists BOOLEAN;
    elements_count INTEGER;
    connections_count INTEGER;
BEGIN
    -- Check demo account
    SELECT EXISTS(
        SELECT 1 FROM accounts 
        WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    ) INTO account_exists;
    
    -- Check demo user
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = '550e8400-e29b-41d4-a716-446655440002'::uuid
    ) INTO user_exists;
    
    -- Check demo project
    SELECT EXISTS(
        SELECT 1 FROM projects 
        WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid
    ) INTO project_exists;
    
    -- Count elements
    SELECT COUNT(*) INTO elements_count
    FROM canvas_elements
    WHERE workspace_id = '550e8400-e29b-41d4-a716-446655440003'::uuid;
    
    -- Count connections
    SELECT COUNT(*) INTO connections_count
    FROM canvas_connections
    WHERE workspace_id = '550e8400-e29b-41d4-a716-446655440003'::uuid;
    
    -- Output results
    RAISE NOTICE '';
    RAISE NOTICE '=== DEMO DATA SETUP COMPLETE ===';
    RAISE NOTICE 'Demo account exists: %', account_exists;
    RAISE NOTICE 'Demo user exists: %', user_exists;
    RAISE NOTICE 'Demo project exists: %', project_exists;
    RAISE NOTICE 'Canvas elements created: %', elements_count;
    RAISE NOTICE 'Canvas connections created: %', connections_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Account ID: 550e8400-e29b-41d4-a716-446655440001';
    RAISE NOTICE 'Demo User ID: 550e8400-e29b-41d4-a716-446655440002';
    RAISE NOTICE 'Demo Project ID: 550e8400-e29b-41d4-a716-446655440003';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test the canvas at: http://localhost:3000/?demo=true';
END $$;

-- Final success message
SELECT 'Demo data with corrected IDs created successfully!' as message;