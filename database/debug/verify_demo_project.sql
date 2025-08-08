-- ============================================
-- Verify Demo Project ID
-- ============================================

-- Check if demo project exists with exact ID
SELECT 'Checking for demo project with ID 550e8400-e29b-41d4-a716-446655440003' as info;
SELECT 
    id::text as id_text,
    id,
    account_id,
    title,
    project_type,
    status,
    created_at,
    updated_at
FROM projects 
WHERE id = '550e8400-e29b-41d4-a716-446655440003'::uuid;

-- Check data type of ID column
SELECT '' as blank;
SELECT 'ID column data type:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name = 'id';

-- Show all projects with their IDs as text
SELECT '' as blank;
SELECT 'All projects with IDs as text:' as info;
SELECT 
    id::text as id_text,
    account_id::text as account_id_text,
    title,
    project_type,
    created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- Check if any project ID contains our demo ID
SELECT '' as blank;
SELECT 'Projects matching demo ID pattern:' as info;
SELECT 
    id::text as id_text,
    title,
    account_id::text as account_id_text
FROM projects
WHERE id::text LIKE '%550e8400-e29b-41d4-a716-446655440003%'
   OR id::text LIKE '%446655440003%';

-- Test direct string comparison
SELECT '' as blank;
SELECT 'Direct string comparison test:' as info;
SELECT 
    COUNT(*) as matching_projects
FROM projects
WHERE id::text = '550e8400-e29b-41d4-a716-446655440003';

-- Show demo account projects
SELECT '' as blank;
SELECT 'All projects for demo account (550e8400-e29b-41d4-a716-446655440001):' as info;
SELECT 
    id::text as id_text,
    title,
    project_type,
    status,
    created_at
FROM projects
WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
ORDER BY created_at;