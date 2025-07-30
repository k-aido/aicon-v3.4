# AICON v3 Database Schema Design

## Overview
This document defines the complete database schema for AICON v3, a canvas-first content creation platform with AI-powered remixes and content generation capabilities.

## Database Technology
- **Primary Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Caching Layer**: Redis
- **Authentication**: Supabase Auth

## Core Tables

### 1. Accounts Table
```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing')),
    plan_type VARCHAR(50) DEFAULT 'individual' CHECK (plan_type IN ('individual', 'team', 'agency')),
    billing_email VARCHAR(255),
    creator_limit INTEGER DEFAULT 5,
    user_limit INTEGER DEFAULT 1,
    voice_model_limit INTEGER DEFAULT 10,
    storage_limit_gb INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. User Profiles Table
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    brand_name VARCHAR(255),
    brand_description TEXT,
    persona_description TEXT,
    target_audience TEXT,
    content_style_preferences JSONB DEFAULT '{}',
    social_media_handles JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Creator Categories Table
```sql
CREATE TABLE creator_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Creators Table
```sql
CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'linkedin', 'twitter')),
    username VARCHAR(255) NOT NULL,
    profile_url TEXT NOT NULL,
    display_name VARCHAR(255),
    follower_count INTEGER,
    category_id UUID REFERENCES creator_categories(id),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    scrape_frequency_hours INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, username)
);
```

### 6. Account Followed Creators Table
```sql
CREATE TABLE account_followed_creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    followed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(account_id, creator_id)
);
```

### 7. Projects Table
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    canvas_data JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);
```

### 8. Project Collaborators Table
```sql
CREATE TABLE project_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) DEFAULT 'editor' CHECK (permission_level IN ('owner', 'editor', 'viewer')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(project_id, user_id)
);
```

### 9. Canvas Folders Table
```sql
CREATE TABLE canvas_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    width DECIMAL(10,2) DEFAULT 300,
    height DECIMAL(10,2) DEFAULT 200,
    is_collapsed BOOLEAN DEFAULT false,
    color VARCHAR(7) DEFAULT '#3B82F6',
    folder_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);
```

### 10. Chat Interfaces Table
```sql
CREATE TABLE chat_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'AI Chat',
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    width DECIMAL(10,2) DEFAULT 400,
    height DECIMAL(10,2) DEFAULT 500,
    chat_history JSONB DEFAULT '[]',
    connected_content JSONB DEFAULT '{}',
    ai_model_preference VARCHAR(100) DEFAULT 'claude-3-sonnet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);
```

### 11. Content Pieces Table
```sql
CREATE TABLE content_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source_url TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'linkedin', 'twitter', 'upload')),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'image', 'text', 'audio')),
    title VARCHAR(500),
    description TEXT,
    thumbnail_url TEXT,
    original_file_url TEXT,
    original_file_path TEXT,
    transcript TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    storage_expires_at TIMESTAMP WITH TIME ZONE,
    is_remix BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 12. Content Analysis Table
```sql
CREATE TABLE content_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_piece_id UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
    hook_analysis TEXT,
    body_analysis TEXT,
    cta_analysis TEXT,
    content_style_analysis TEXT,
    hashtags TEXT[] DEFAULT '{}',
    mentions TEXT[] DEFAULT '{}',
    trending_elements JSONB DEFAULT '{}',
    engagement_score DECIMAL(5,2),
    sentiment_score DECIMAL(3,2),
    analysis_status VARCHAR(50) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    ai_model_used VARCHAR(100),
    analysis_cost_credits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 13. Canvas Folder Items Table
```sql
CREATE TABLE canvas_folder_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES canvas_folders(id) ON DELETE CASCADE,
    content_piece_id UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(folder_id, content_piece_id)
);
```

### 14. Canvas Connections Table
```sql
CREATE TABLE canvas_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('content_piece', 'folder', 'chat_interface')),
    source_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('content_piece', 'folder', 'chat_interface')),
    target_id UUID NOT NULL,
    connection_style JSONB DEFAULT '{"color": "#6B7280", "width": 2}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);
```

### 15. Generated Scripts Table
```sql
CREATE TABLE generated_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_piece_id UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    original_script TEXT,
    research_perspectives JSONB DEFAULT '[]',
    rewritten_script TEXT,
    generation_prompt TEXT,
    ai_model_used VARCHAR(100),
    generation_status VARCHAR(50) DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    generation_cost_credits INTEGER DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 16. Voice Models Table
```sql
CREATE TABLE voice_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    elevenlabs_voice_id VARCHAR(255),
    sample_audio_url TEXT,
    sample_audio_path TEXT,
    training_status VARCHAR(50) DEFAULT 'pending' CHECK (training_status IN ('pending', 'training', 'completed', 'failed')),
    version_number INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    quality_score DECIMAL(3,2),
    training_duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 17. Avatar Models Table
```sql
CREATE TABLE avatar_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    heygen_avatar_id VARCHAR(255),
    sample_video_url TEXT,
    sample_video_path TEXT,
    training_photos_urls TEXT[] DEFAULT '{}',
    training_photos_paths TEXT[] DEFAULT '{}',
    creation_status VARCHAR(50) DEFAULT 'pending' CHECK (creation_status IN ('pending', 'processing', 'completed', 'failed')),
    is_active BOOLEAN DEFAULT true,
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 18. Generated Content Table
```sql
CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    script_id UUID REFERENCES generated_scripts(id) ON DELETE SET NULL,
    voice_model_id UUID REFERENCES voice_models(id) ON DELETE SET NULL,
    avatar_model_id UUID REFERENCES avatar_models(id) ON DELETE SET NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('audio', 'video')),
    file_url TEXT,
    file_path TEXT,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    generation_status VARCHAR(50) DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    generation_cost_credits INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 19. Processing Queue Table
```sql
CREATE TABLE processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_type VARCHAR(100) NOT NULL CHECK (job_type IN (
        'content_analysis', 'script_generation', 'voice_generation', 
        'avatar_generation', 'content_scraping', 'file_processing'
    )),
    job_data JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    estimated_credits INTEGER DEFAULT 0,
    actual_credits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 20. API Usage Logs Table
```sql
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    request_type VARCHAR(50),
    tokens_used INTEGER,
    credits_cost INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 21. Account Usage Stats Table
```sql
CREATE TABLE account_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    projects_created INTEGER DEFAULT 0,
    content_pieces_added INTEGER DEFAULT 0,
    scripts_generated INTEGER DEFAULT 0,
    voice_generations INTEGER DEFAULT 0,
    avatar_generations INTEGER DEFAULT 0,
    total_credits_used INTEGER DEFAULT 0,
    storage_used_gb DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, stat_date)
);
```

### 22. Content Annotations Table
```sql
CREATE TABLE content_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_piece_id UUID REFERENCES content_pieces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    annotation_text TEXT NOT NULL,
    position_x DECIMAL(10,2),
    position_y DECIMAL(10,2),
    annotation_type VARCHAR(50) DEFAULT 'note' CHECK (annotation_type IN ('note', 'highlight', 'bookmark')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Performance Indexes

```sql
-- Account and user lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Project management
CREATE INDEX idx_projects_account_id ON projects(account_id);
CREATE INDEX idx_projects_last_accessed ON projects(account_id, last_accessed_at DESC);

-- Creator and content management
CREATE INDEX idx_creators_platform_username ON creators(platform, username);
CREATE INDEX idx_creators_category ON creators(category_id);
CREATE INDEX idx_content_pieces_account_project ON content_pieces(account_id, project_id);
CREATE INDEX idx_content_pieces_creator ON content_pieces(creator_id);

-- Canvas relationships
CREATE INDEX idx_canvas_connections_project ON canvas_connections(project_id);
CREATE INDEX idx_canvas_folders_project ON canvas_folders(project_id);
CREATE INDEX idx_chat_interfaces_project ON chat_interfaces(project_id);

-- Generation tracking
CREATE INDEX idx_generated_scripts_content ON generated_scripts(content_piece_id);
CREATE INDEX idx_voice_models_user_active ON voice_models(user_id, is_active);
CREATE INDEX idx_generated_content_account ON generated_content(account_id);

-- Processing queue
CREATE INDEX idx_processing_queue_status_scheduled ON processing_queue(status, scheduled_at);
```

## Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Example policy for projects
CREATE POLICY "Users can access their account projects" ON projects
    FOR ALL USING (
        account_id IN (
            SELECT account_id FROM users WHERE id = auth.uid()
        )
    );
```

## Initial Seed Data

```sql
-- Insert creator categories
INSERT INTO creator_categories (name, description, sort_order) VALUES
('Business & Entrepreneurship', 'Marketing, Sales, Leadership, Startups', 1),
('Health & Fitness', 'Workouts, Nutrition, Mental Health, Wellness', 2),
('Personal Development', 'Productivity, Motivation, Life Coaching, Mindset', 3),
('Technology & AI', 'Tech Reviews, AI News, Programming, Digital Trends', 4),
('Finance & Investing', 'Personal Finance, Crypto, Stock Market, Real Estate', 5),
('Lifestyle & Fashion', 'Style, Beauty, Home Decor, Travel', 6),
('Food & Cooking', 'Recipes, Restaurant Reviews, Nutrition, Cooking Tips', 7),
('Entertainment', 'Comedy, Pop Culture, Movies, Music, Gaming', 8),
('Education & Learning', 'Tutorials, Science, History, Language Learning', 9),
('Creative Arts', 'Art, Photography, Writing, Design, Music Creation', 10);
```

This schema provides a complete foundation for AICON v3's multi-user, canvas-first content creation platform with AI-powered features.