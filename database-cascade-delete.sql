-- Cascade Delete Setup for AICON Canvas Database
-- This script ensures that when a project is deleted, all related canvas data is automatically cleaned up

-- ============================================================================
-- CASCADE DELETE CONSTRAINTS FOR CANVAS TABLES
-- ============================================================================

-- Check and add cascade delete for canvas_elements
-- This ensures when a project is deleted, all canvas elements are also deleted
ALTER TABLE canvas_elements 
DROP CONSTRAINT IF EXISTS canvas_elements_workspace_id_fkey,
ADD CONSTRAINT canvas_elements_workspace_id_fkey 
  FOREIGN KEY (workspace_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- Check and add cascade delete for canvas_connections  
-- This ensures when a project is deleted, all canvas connections are also deleted
ALTER TABLE canvas_connections
DROP CONSTRAINT IF EXISTS canvas_connections_workspace_id_fkey,
ADD CONSTRAINT canvas_connections_workspace_id_fkey
  FOREIGN KEY (workspace_id)
  REFERENCES projects(id)
  ON DELETE CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that the constraints were added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('canvas_elements', 'canvas_connections')
  AND ccu.table_name = 'projects'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- TEST QUERIES (OPTIONAL - FOR VERIFICATION)
-- ============================================================================

-- Count records before deletion (for testing purposes)
-- SELECT 
--   (SELECT COUNT(*) FROM projects WHERE project_type = 'canvas') as project_count,
--   (SELECT COUNT(*) FROM canvas_elements) as elements_count,
--   (SELECT COUNT(*) FROM canvas_connections) as connections_count;

-- Example test deletion (UNCOMMENT ONLY FOR TESTING)
-- DELETE FROM projects WHERE id = 'test-project-id-here';

-- Count records after deletion (should show reduced counts)
-- SELECT 
--   (SELECT COUNT(*) FROM projects WHERE project_type = 'canvas') as project_count,
--   (SELECT COUNT(*) FROM canvas_elements) as elements_count,
--   (SELECT COUNT(*) FROM canvas_connections) as connections_count;

-- ============================================================================
-- ADDITIONAL RECOMMENDATIONS
-- ============================================================================

-- If you have other related tables that reference projects, consider adding cascade delete:

-- Example for chat_interfaces table (if it exists and references projects):
-- ALTER TABLE chat_interfaces
-- DROP CONSTRAINT IF EXISTS chat_interfaces_workspace_id_fkey,
-- ADD CONSTRAINT chat_interfaces_workspace_id_fkey
--   FOREIGN KEY (workspace_id)
--   REFERENCES projects(id)
--   ON DELETE CASCADE;

-- Example for canvas_versions table (if you're using versioning):
-- ALTER TABLE canvas_versions
-- DROP CONSTRAINT IF EXISTS canvas_versions_workspace_id_fkey,
-- ADD CONSTRAINT canvas_versions_workspace_id_fkey
--   FOREIGN KEY (workspace_id)
--   REFERENCES projects(id)
--   ON DELETE CASCADE;