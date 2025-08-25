# Database Migration Instructions

## Required Tables for YouTube Content Analysis

The YouTube content analysis feature requires the following tables to be created in your Supabase database. Run these migrations in order:

### 1. Content Scrapes Table (007_content_scrapes_table.sql)
This table tracks all content scraping operations from social media platforms.

### 2. Content Analysis Table (008_content_analysis_table.sql)
This table stores the AI analysis results for scraped content.

### 3. Project Content Library Table (009_project_content_library_table.sql)
This table stores analyzed content in project-specific libraries.

## How to Apply Migrations

1. **Using Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste each SQL file content in order
   - Execute each migration

2. **Using Supabase CLI:**
   ```bash
   supabase db push --db-url "postgresql://postgres:[password]@[host]:[port]/postgres"
   ```

3. **Manual Application:**
   - Connect to your database using any PostgreSQL client
   - Run each SQL file in order

## Verification

After running the migrations, verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('content_scrapes', 'content_analysis', 'project_content_library');
```

## Troubleshooting

If you encounter errors:

1. **Foreign key constraints:** Ensure the referenced tables (projects, users) exist
2. **Duplicate tables:** Use `CREATE TABLE IF NOT EXISTS` (already included)
3. **Permission issues:** Ensure you have CREATE privileges

## Important Notes

- These tables are required for the YouTube content scraping and analysis features
- The `content_scrapes` table uses a unique constraint on (project_id, url) to prevent duplicate scrapes
- All tables include automatic timestamp updates via triggers