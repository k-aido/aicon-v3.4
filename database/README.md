# Database Setup Guide

This guide will help you set up the database for AICON Canvas persistence.

## Prerequisites

1. A Supabase account and project
2. Your Supabase project URL and anon key

## Setup Steps

### 1. Configure Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```bash
# Required Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # Optional, for server-side operations
```

### 2. Create Database Tables

There are two ways to create the required tables:

#### Option A: Using Existing Tables (Recommended if tables already exist)

If you already have the following tables in your database:
- `accounts` - For user accounts
- `users` - For user profiles
- `projects` - For canvas workspaces (stores canvas data in canvas_data JSONB field)
- `canvas_elements` - For canvas elements
- `canvas_connections` - For element connections
- `chat_interfaces` - For chat elements

Run the demo data script:
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `database/setup/demo_data_existing_tables.sql`
4. Paste and run it in the SQL Editor
5. You should see "Demo data for existing tables created successfully!"

#### Option B: Creating New Tables

If you need to create the tables from scratch:
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `database/setup/create_canvas_tables_and_demo.sql`
4. Paste and run it in the SQL Editor
5. You should see "Canvas tables and demo workspace created successfully!"

#### Option C: Using Migrations

1. Install Supabase CLI: `npm install -g supabase`
2. Link your project: `supabase link --project-ref your-project-ref`
3. Run migrations: `supabase db push`

### 3. Verify Setup

Visit `/debug/database` in your application to run diagnostics:

```
http://localhost:3000/debug/database
```

This page will show:
- ✅ Connection status
- ✅ Table existence
- ✅ Demo workspace creation
- ✅ Authentication status

### 4. Test Demo Mode

To test without authentication, use the demo mode:

```
http://localhost:3000/?demo=true
```

This will use the hardcoded demo user and workspace.

## Troubleshooting

### "Error creating workspace" or "Error fetching user workspaces"

1. **Check environment variables**: Ensure `.env.local` has the correct Supabase credentials
2. **Check table existence**: Run the diagnostics page or check Supabase dashboard
3. **Check RLS policies**: If RLS is enabled, you may need to disable it temporarily or adjust policies
4. **Check browser console**: Look for specific error messages

### Tables don't exist

1. Run the SQL script in `database/setup/create_canvas_tables_and_demo.sql`
2. Make sure you're connected to the correct Supabase project
3. Check for any SQL errors in the output

### Authentication issues

1. For demo/testing, use `?demo=true` parameter
2. For production, implement proper Supabase authentication
3. Check that your anon key has the correct permissions

### RLS (Row Level Security) blocking operations

If you get RLS policy errors:

1. **Temporary fix**: Disable RLS on tables in Supabase dashboard
   - Go to Authentication > Policies
   - Find canvas_workspaces, canvas_elements, canvas_connections
   - Toggle off RLS

2. **Proper fix**: Adjust the RLS policies in the migration file to match your auth setup

## Demo Workspace Details

The demo setup creates:
- **Workspace ID**: `550e8400-e29b-41d4-a716-446655440001`
- **User ID**: `550e8400-e29b-41d4-a716-446655440002`
- **Demo Elements**: A content piece and chat element
- **Demo Connection**: Linking the content to the chat

## Development Tips

1. Use the diagnostics page during development: `/debug/database`
2. Check browser console for detailed error logs
3. All operations log with `[CanvasPersistence]` prefix
4. Demo mode bypasses authentication for testing