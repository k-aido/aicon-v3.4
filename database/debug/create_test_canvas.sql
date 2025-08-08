-- ============================================
-- Create Test Canvas for Demo Account
-- ============================================
-- This script creates a new canvas project for testing

-- Define the IDs
DO $$
DECLARE
    v_demo_account_id UUID := '550e8400-e29b-41d4-a716-446655440001';
    v_demo_user_id UUID := '550e8400-e29b-41d4-a716-446655440002';
    v_new_project_id UUID := gen_random_uuid();
    v_timestamp TEXT := to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
BEGIN
    -- Create a new canvas project
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
        v_new_project_id,
        v_demo_account_id,
        v_demo_user_id,
        'Test Canvas ' || v_timestamp,
        'Created via SQL script on ' || v_timestamp,
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
            'elements', jsonb_build_array(),
            'connections', jsonb_build_array(),
            'last_saved', now()::text
        ),
        jsonb_build_object(
            'created_from', 'sql_test_script',
            'version', '1.0.0',
            'demo', true,
            'test', true
        )
    );
    
    -- Output the result
    RAISE NOTICE '';
    RAISE NOTICE '✅ Test canvas created successfully!';
    RAISE NOTICE 'Project ID: %', v_new_project_id;
    RAISE NOTICE 'Title: Test Canvas %', v_timestamp;
    RAISE NOTICE 'Account ID: %', v_demo_account_id;
    RAISE NOTICE 'Created by: %', v_demo_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Access URL: http://localhost:3000/canvas/%', v_new_project_id;
END $$;

-- Show the newly created canvas
SELECT 
    id::text as project_id,
    title,
    account_id::text as account_id,
    created_by_user_id::text as created_by,
    project_type,
    status,
    created_at,
    updated_at
FROM projects
WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY created_at DESC
LIMIT 5;