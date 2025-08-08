# Canvas Creation Troubleshooting Guide

## Overview
This guide helps troubleshoot issues with creating new canvases in AICON v3.4.

## Working Configuration

### Demo IDs
- **Demo Account ID**: `550e8400-e29b-41d4-a716-446655440001`
- **Demo User ID**: `550e8400-e29b-41d4-a716-446655440002`
- **Demo Project ID**: `550e8400-e29b-41d4-a716-446655440003`

### Required Project Fields
The `projects` table requires these fields for canvas creation:
- `account_id` (UUID) - Required
- `title` (TEXT) - Required (not `name`!)
- `project_type` (TEXT) - Should be 'canvas'
- `status` (TEXT) - Should be 'active'
- `canvas_data` (JSONB) - Canvas-specific data
- `created_by_user_id` (UUID) - Optional, may not exist in all schemas

## Common Issues and Solutions

### 1. "column projects.name does not exist"
**Issue**: The code is using `name` but the database has `title`.
**Solution**: All queries must use `title` instead of `name`.

### 2. "JSON object requested, multiple (or no) rows returned"
**Issue**: Using `.single()` or `.maybeSingle()` when query returns multiple/no rows.
**Solution**: Use `.select()` without `.single()` and handle arrays.

### 3. Canvas creation fails silently
**Issue**: Insert fails due to missing required fields or constraints.
**Solution**: Check browser console for detailed error logs from CanvasPersistence.

### 4. "No data returned after insert"
**Issue**: Insert succeeds but doesn't return data.
**Solution**: Ensure `.select('*')` is used after `.insert()`.

## Testing Canvas Creation

### 1. Via UI
```
http://localhost:3000/canvas/new
```
This should create a new canvas and redirect to it.

### 2. Via Debug Page
```
http://localhost:3000/debug/database
```
Click "Test Canvas Persistence" to test creation.

### 3. Via SQL
Run `database/debug/create_test_canvas.sql` in Supabase SQL editor.

## Debugging Steps

1. **Check Browser Console**
   - Look for `[CanvasPersistence]` logs
   - Check for detailed error messages

2. **Verify Demo Data**
   ```sql
   -- Check if demo account exists
   SELECT * FROM accounts WHERE id = '550e8400-e29b-41d4-a716-446655440001';
   
   -- Check if demo user exists  
   SELECT * FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440002';
   
   -- List all canvases for demo account
   SELECT id, title, created_at FROM projects 
   WHERE account_id = '550e8400-e29b-41d4-a716-446655440001'
   ORDER BY created_at DESC;
   ```

3. **Test Direct Insert**
   ```sql
   INSERT INTO projects (
       account_id,
       title,
       project_type,
       status,
       canvas_data
   ) VALUES (
       '550e8400-e29b-41d4-a716-446655440001'::uuid,
       'Test Canvas Manual',
       'canvas',
       'active',
       '{"viewport": {"x": 0, "y": 0, "zoom": 1}}'::jsonb
   ) RETURNING *;
   ```

## Canvas Data Structure

The `canvas_data` JSONB field should contain:
```json
{
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1.0
  },
  "settings": {
    "gridSize": 20,
    "snapToGrid": false,
    "showGrid": true
  },
  "elements": [],
  "connections": [],
  "last_saved": "2024-01-01T00:00:00.000Z"
}
```

## Checking RLS Policies

If canvas creation works via SQL but not via the app:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'projects';

-- If RLS is enabled, check policies
SELECT * FROM pg_policies WHERE tablename = 'projects';
```

## Success Indicators

When canvas creation works correctly:
1. Console shows: `[CanvasPersistence] ✅ Project created successfully`
2. Browser redirects to `/canvas/{new-id}`
3. New canvas appears in dashboard
4. Canvas loads with empty state

## Contact Support

If issues persist after following this guide:
1. Save browser console logs
2. Note the exact error messages
3. Check Supabase logs for database errors