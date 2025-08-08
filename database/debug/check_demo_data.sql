-- ============================================
-- Debug: Check Demo Data in Database
-- ============================================

-- Check all accounts
SELECT 'Accounts Table:' as info;
SELECT id, email, account_type, status 
FROM accounts 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid
);

-- Check all users
SELECT '' as blank;
SELECT 'Users Table:' as info;
SELECT id, account_id, email, username 
FROM users 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid
) OR account_id IN (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid
);

-- Check all projects  
SELECT '' as blank;
SELECT 'Projects Table:' as info;
SELECT id, account_id, title, project_type, status,
       CASE WHEN canvas_data IS NOT NULL THEN 'Has canvas_data' ELSE 'No canvas_data' END as canvas_status
FROM projects 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid
) OR account_id IN (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid
);

-- Check for duplicate projects for demo account
SELECT '' as blank;
SELECT 'Checking for duplicate projects:' as info;
SELECT account_id, COUNT(*) as project_count
FROM projects
WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
GROUP BY account_id;

-- Show all canvas projects for demo account
SELECT '' as blank;
SELECT 'All canvas projects for demo account:' as info;
SELECT id, title, created_at, updated_at
FROM projects
WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
  AND project_type = 'canvas'
ORDER BY created_at;

-- Check canvas_elements
SELECT '' as blank;
SELECT 'Canvas Elements for demo project:' as info;
SELECT COUNT(*) as element_count
FROM canvas_elements
WHERE workspace_id = '550e8400-e29b-41d4-a716-446655440003'::uuid;

-- Check canvas_connections
SELECT '' as blank;
SELECT 'Canvas Connections for demo project:' as info;
SELECT COUNT(*) as connection_count
FROM canvas_connections
WHERE workspace_id = '550e8400-e29b-41d4-a716-446655440003'::uuid;