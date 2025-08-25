-- Create project_content_library table for storing analyzed content in project libraries
CREATE TABLE IF NOT EXISTS project_content_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES content_analysis(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Content details
    title TEXT NOT NULL,
    summary TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique content per project
    CONSTRAINT unique_project_analysis UNIQUE (project_id, analysis_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_content_library_project_id ON project_content_library(project_id);
CREATE INDEX IF NOT EXISTS idx_project_content_library_analysis_id ON project_content_library(analysis_id);
CREATE INDEX IF NOT EXISTS idx_project_content_library_user_id ON project_content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_project_content_library_is_active ON project_content_library(is_active);
CREATE INDEX IF NOT EXISTS idx_project_content_library_created_at ON project_content_library(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_project_content_library_updated_at 
    BEFORE UPDATE ON project_content_library 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment on table
COMMENT ON TABLE project_content_library IS 'Stores analyzed content in project-specific libraries for easy access and reference';