-- ============================================
-- RESET DEMO DATA
-- ============================================
-- Run this script to clean up and reset demo data

-- Delete all canvases except the main demo
DELETE FROM canvas_elements 
WHERE workspace_id IN (
    SELECT id FROM projects 
    WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    AND id != '550e8400-e29b-41d4-a716-446655440003'::uuid
);

DELETE FROM canvas_connections 
WHERE workspace_id IN (
    SELECT id FROM projects 
    WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    AND id != '550e8400-e29b-41d4-a716-446655440003'::uuid
);

DELETE FROM projects 
WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
AND id != '550e8400-e29b-41d4-a716-446655440003'::uuid;

-- Reset the main demo canvas
UPDATE projects 
SET 
    title = 'Demo Canvas - Main',
    canvas_data = jsonb_build_object(
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
    updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid;

-- Clear orphaned elements and connections
DELETE FROM canvas_elements 
WHERE workspace_id NOT IN (SELECT id FROM projects);

DELETE FROM canvas_connections 
WHERE workspace_id NOT IN (SELECT id FROM projects);

-- Show results
DO $$
DECLARE
    v_project_count INTEGER;
    v_element_count INTEGER;
    v_connection_count INTEGER;
BEGIN
    SELECT COUNT(*) FROM projects WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid INTO v_project_count;
    SELECT COUNT(*) FROM canvas_elements WHERE workspace_id = '550e8400-e29b-41d4-a716-446655440003'::uuid INTO v_element_count;
    SELECT COUNT(*) FROM canvas_connections WHERE workspace_id = '550e8400-e29b-41d4-a716-446655440003'::uuid INTO v_connection_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== DEMO DATA RESET COMPLETE ===';
    RAISE NOTICE 'Remaining projects: %', v_project_count;
    RAISE NOTICE 'Main canvas elements: %', v_element_count;
    RAISE NOTICE 'Main canvas connections: %', v_connection_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Demo data has been reset to initial state';
END $$;

-- Show remaining canvases
SELECT 
    id::text as project_id,
    title,
    jsonb_array_length(COALESCE(canvas_data->'elements', '[]'::jsonb)) as element_count,
    created_at,
    updated_at
FROM projects
WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY created_at;