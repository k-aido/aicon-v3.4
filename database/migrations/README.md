# Database Migrations

This directory contains SQL migration files for the Supabase database schema.

## Migration Files

### 001_social_media_analysis_tables.sql
Adds tables and functionality for social media content import and analysis:

**New Tables:**
- `social_media_jobs` - Tracks Make.com webhook jobs
- `social_media_content` - Stores raw social media data before processing

**Extensions to existing tables:**
- `content_analysis` - Adds hook_analysis, body_analysis, and cta_analysis columns

## Running Migrations

### Using Supabase CLI

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your project:
```bash
supabase link --project-ref <your-project-ref>
```

3. Run migrations:
```bash
# Run a specific migration
supabase db push --file database/migrations/001_social_media_analysis_tables.sql

# Or use the migration system
supabase migration new social_media_analysis
# Copy the SQL content to the generated file
supabase db push
```

### Using Supabase Dashboard

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of the migration file
3. Run the SQL

## Rollback

To rollback a migration, use the corresponding rollback file:
```bash
supabase db push --file database/migrations/001_social_media_analysis_tables_rollback.sql
```

## TypeScript Types

After running migrations, regenerate TypeScript types:

```bash
# Generate types from your Supabase project
supabase gen types typescript --project-id <your-project-id> > frontend/src/types/database.types.ts
```

## Best Practices

1. **Always test migrations** on a development database first
2. **Back up your database** before running migrations in production
3. **Use transactions** for complex migrations
4. **Document breaking changes** in migration files
5. **Keep migrations idempotent** using IF NOT EXISTS clauses

## Migration Naming Convention

```
<number>_<description>_<action>.sql
```

Examples:
- `001_social_media_analysis_tables.sql`
- `001_social_media_analysis_tables_rollback.sql`
- `002_add_user_preferences.sql`

## Environment Variables

Ensure these are set in your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```