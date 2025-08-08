-- Monitoring Functions for Social Media Analysis System

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats(time_range INTERVAL DEFAULT '24 hours')
RETURNS TABLE (
  platform TEXT,
  total BIGINT,
  success BIGINT,
  failed BIGINT,
  avg_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.platform::TEXT,
    COUNT(*)::BIGINT as total,
    SUM(CASE WHEN j.status = 'completed' THEN 1 ELSE 0 END)::BIGINT as success,
    SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END)::BIGINT as failed,
    ROUND(AVG(CASE WHEN j.status = 'completed' THEN j.processing_time_ms ELSE NULL END)::NUMERIC, 2) as avg_time
  FROM social_media_jobs j
  WHERE j.created_at > NOW() - time_range
  GROUP BY j.platform;
END;
$$ LANGUAGE plpgsql;

-- Function to get hourly job metrics
CREATE OR REPLACE FUNCTION get_hourly_job_metrics(hours INTEGER DEFAULT 24)
RETURNS TABLE (
  hour TIMESTAMP,
  total_jobs BIGINT,
  successful_jobs BIGINT,
  failed_jobs BIGINT,
  avg_processing_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', j.created_at) as hour,
    COUNT(*)::BIGINT as total_jobs,
    SUM(CASE WHEN j.status = 'completed' THEN 1 ELSE 0 END)::BIGINT as successful_jobs,
    SUM(CASE WHEN j.status = 'failed' THEN 1 ELSE 0 END)::BIGINT as failed_jobs,
    ROUND(AVG(CASE WHEN j.status = 'completed' THEN j.processing_time_ms ELSE NULL END)::NUMERIC, 2) as avg_processing_time
  FROM social_media_jobs j
  WHERE j.created_at > NOW() - (hours || ' hours')::INTERVAL
  GROUP BY date_trunc('hour', j.created_at)
  ORDER BY hour DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get stuck jobs
CREATE OR REPLACE FUNCTION get_stuck_jobs(timeout_minutes INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  platform social_media_platform,
  status job_status,
  started_at TIMESTAMP,
  minutes_stuck NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.platform,
    j.status,
    j.started_at::TIMESTAMP,
    ROUND(EXTRACT(EPOCH FROM (NOW() - j.started_at)) / 60, 2) as minutes_stuck
  FROM social_media_jobs j
  WHERE j.status = 'processing'
    AND j.started_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL
  ORDER BY j.started_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stuck jobs
CREATE OR REPLACE FUNCTION cleanup_stuck_jobs(timeout_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE social_media_jobs
  SET 
    status = 'failed',
    error_message = 'Job timeout - stuck in processing',
    completed_at = NOW(),
    error_details = jsonb_build_object(
      'timeout_minutes', timeout_minutes,
      'cleaned_at', NOW()
    )
  WHERE status = 'processing'
    AND started_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_database_metrics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Connection count
  SELECT 
    'active_connections'::TEXT,
    COUNT(*)::NUMERIC,
    'connections'::TEXT
  FROM pg_stat_activity
  WHERE state = 'active'
  
  UNION ALL
  
  -- Database size
  SELECT 
    'database_size'::TEXT,
    ROUND(pg_database_size(current_database())::NUMERIC / 1024 / 1024, 2),
    'MB'::TEXT
  
  UNION ALL
  
  -- Table sizes
  SELECT 
    'jobs_table_size'::TEXT,
    ROUND(pg_total_relation_size('social_media_jobs')::NUMERIC / 1024 / 1024, 2),
    'MB'::TEXT
  
  UNION ALL
  
  SELECT 
    'content_table_size'::TEXT,
    ROUND(pg_total_relation_size('social_media_content')::NUMERIC / 1024 / 1024, 2),
    'MB'::TEXT
  
  UNION ALL
  
  -- Cache hit ratio
  SELECT 
    'cache_hit_ratio'::TEXT,
    ROUND(
      100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)::NUMERIC, 
      2
    ),
    'percent'::TEXT
  FROM pg_statio_user_tables;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_status 
ON social_media_jobs(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_jobs_started_at_processing 
ON social_media_jobs(started_at) 
WHERE status = 'processing';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_platform_stats(INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_job_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stuck_jobs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stuck_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_database_metrics() TO authenticated;