# Make.com Integration Troubleshooting Guide

This guide helps diagnose and resolve common issues with the Make.com social media analysis integration.

## Table of Contents
1. [Common Integration Issues](#common-integration-issues)
2. [Webhook Debugging Checklist](#webhook-debugging-checklist)
3. [Database Monitoring Queries](#database-monitoring-queries)
4. [Performance Optimization](#performance-optimization)
5. [Error Reference](#error-reference)

## Common Integration Issues

### 1. Webhook Not Receiving Requests

**Symptoms:**
- No jobs created in database
- Make.com shows successful execution but no data in AICON

**Solutions:**
```bash
# Test webhook connectivity
curl -X GET https://your-app.com/api/webhooks/make/test

# Check webhook logs
tail -f logs/webhook.log

# Verify webhook URL in Make.com
# Should be: https://your-app.com/api/webhooks/make
```

**Common Causes:**
- Incorrect webhook URL
- Missing authentication token
- Firewall blocking requests
- SSL certificate issues

### 2. Authentication Failures

**Symptoms:**
- 401 Unauthorized responses
- "Invalid webhook token" errors

**Debug Steps:**
1. Verify token format:
   ```
   svc_webhook_<accountId>_<randomString>
   ```

2. Check token in request headers:
   ```bash
   # Test with curl
   curl -X POST https://your-app.com/api/webhooks/make \
     -H "Authorization: Bearer your-webhook-token" \
     -H "Content-Type: application/json" \
     -d '{"action":"test.auth"}'
   ```

3. Verify token exists in database:
   ```sql
   SELECT * FROM social_media_jobs 
   WHERE webhook_token = 'your-webhook-token'
   LIMIT 1;
   ```

### 3. Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests responses
- Intermittent failures during bulk operations

**Solutions:**
1. Check current rate limit status:
   ```javascript
   // In browser console
   const response = await fetch('/api/webhooks/make/test?action=rate-limit');
   const data = await response.json();
   console.log(data);
   ```

2. Adjust Make.com scenario settings:
   - Enable sequential processing
   - Add delays between operations
   - Use error handlers with exponential backoff

3. Monitor rate limit metrics:
   ```sql
   SELECT 
     DATE_TRUNC('minute', created_at) as minute,
     COUNT(*) as requests
   FROM social_media_jobs
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY minute
   ORDER BY minute DESC;
   ```

### 4. Apify Actor Failures

**Symptoms:**
- Jobs stuck in "processing" status
- Error: "Apify actor run failed"

**Debug Steps:**
1. Check Apify dashboard for run details
2. Verify Apify API token is valid
3. Check actor input configuration:
   ```json
   {
     "startUrls": [{"url": "{{url}}"}],
     "maxResults": 1,
     "proxyConfiguration": {
       "useApifyProxy": true
     }
   }
   ```

**Common Issues:**
- Rate limits on target platform
- Invalid URL format
- Actor version incompatibility
- Insufficient Apify credits

### 5. Content Processing Failures

**Symptoms:**
- Jobs complete but no content analysis
- Missing transcript/caption data

**Debug Query:**
```sql
SELECT 
  j.id,
  j.status,
  j.error_message,
  c.processing_status,
  c.error_details
FROM social_media_jobs j
LEFT JOIN social_media_content c ON c.social_media_job_id = j.id
WHERE j.created_at > NOW() - INTERVAL '1 hour'
  AND (j.status = 'failed' OR c.processing_status = 'failed')
ORDER BY j.created_at DESC;
```

## Webhook Debugging Checklist

### Pre-Request Checks
- [ ] Webhook URL is correct and accessible
- [ ] SSL certificate is valid (for HTTPS)
- [ ] Authentication token is properly formatted
- [ ] Make.com IP addresses are whitelisted (if applicable)

### Request Validation
- [ ] Content-Type header is `application/json`
- [ ] Request body is valid JSON
- [ ] Required fields are present (action, timestamp, execution_id)
- [ ] Platform value is valid (youtube/instagram/tiktok)

### Response Handling
- [ ] Check HTTP status code (200 = success)
- [ ] Parse response body for job_id
- [ ] Handle error responses appropriately
- [ ] Implement retry logic for transient failures

### Post-Request Monitoring
- [ ] Job appears in database
- [ ] Job status updates properly
- [ ] Real-time subscriptions trigger
- [ ] UI updates reflect changes

## Database Monitoring Queries

### Job Performance Metrics
```sql
-- Average processing time by platform
SELECT 
  platform,
  COUNT(*) as total_jobs,
  AVG(processing_time_ms) as avg_time_ms,
  MAX(processing_time_ms) as max_time_ms,
  MIN(processing_time_ms) as min_time_ms
FROM social_media_jobs
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY platform
ORDER BY avg_time_ms DESC;

-- Success rate by platform
SELECT 
  platform,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM social_media_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY platform;

-- Queue depth monitoring
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_job
FROM social_media_jobs
WHERE status IN ('pending', 'processing')
GROUP BY status;
```

### Error Analysis
```sql
-- Most common errors
SELECT 
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_seen
FROM social_media_jobs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;

-- Error patterns by hour
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as error_count,
  array_agg(DISTINCT error_message) as error_types
FROM social_media_jobs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Content Analysis Status
```sql
-- Analysis completion rate
SELECT 
  ca.content_type,
  COUNT(*) as total,
  SUM(CASE WHEN ca.hook_analysis IS NOT NULL THEN 1 ELSE 0 END) as analyzed,
  ROUND(100.0 * SUM(CASE WHEN ca.hook_analysis IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM content_pieces cp
LEFT JOIN content_analysis ca ON ca.content_piece_id = cp.id
WHERE cp.created_at > NOW() - INTERVAL '7 days'
GROUP BY ca.content_type;
```

## Performance Optimization

### 1. Database Indexes
Ensure these indexes exist:
```sql
-- Job lookup performance
CREATE INDEX idx_social_media_jobs_external_id 
ON social_media_jobs(external_job_id);

CREATE INDEX idx_social_media_jobs_webhook_token 
ON social_media_jobs(webhook_token);

CREATE INDEX idx_social_media_jobs_status_created 
ON social_media_jobs(status, created_at DESC);

-- Content lookup performance
CREATE INDEX idx_social_media_content_job_id 
ON social_media_content(social_media_job_id);

CREATE INDEX idx_social_media_content_processing_status 
ON social_media_content(processing_status);
```

### 2. Make.com Optimization

**Scenario Structure:**
```
Trigger → Router → Platform Handler → Error Handler → Success Handler
                ↓
            Rate Limiter → Queue Manager → Batch Processor
```

**Best Practices:**
1. Use Data Store for caching frequently accessed data
2. Implement parallel processing for independent operations
3. Use aggregators for bulk operations
4. Set appropriate timeout values (30s for simple, 5m for complex)

### 3. Webhook Optimization

**Request Batching:**
```javascript
// Instead of individual requests
for (const item of items) {
  await processItem(item);
}

// Use batch processing
const batchSize = 10;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await Promise.all(batch.map(processItem));
}
```

**Response Caching:**
```javascript
// Cache analysis results
const cacheKey = `analysis_${platform}_${contentId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await performAnalysis();
await redis.setex(cacheKey, 3600, JSON.stringify(result));
return result;
```

### 4. Real-time Update Optimization

**Subscription Management:**
```javascript
// Unsubscribe when component unmounts
useEffect(() => {
  const subscription = supabase
    .channel(`job-${jobId}`)
    .on('postgres_changes', { /* ... */ })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [jobId]);
```

**Debounce Updates:**
```javascript
// Prevent excessive re-renders
const debouncedUpdate = useMemo(
  () => debounce((data) => {
    updateElement(data);
  }, 500),
  []
);
```

## Error Reference

### Webhook Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| 400 | Invalid webhook payload | Check request format and required fields |
| 401 | Missing webhook token | Add Authorization header |
| 401 | Invalid webhook signature | Verify HMAC secret configuration |
| 404 | Job not found | Check job_id exists |
| 429 | Rate limit exceeded | Implement backoff strategy |
| 500 | Internal server error | Check server logs |

### Processing Errors

| Error | Cause | Solution |
|--------|-------|----------|
| PLATFORM_NOT_SUPPORTED | Invalid platform value | Use: youtube, instagram, tiktok |
| INVALID_URL_FORMAT | Malformed URL | Validate URL before sending |
| CONTENT_NOT_FOUND | URL returns 404 | Verify content exists |
| EXTRACTION_FAILED | Scraping failed | Check Apify actor logs |
| ANALYSIS_TIMEOUT | AI processing timeout | Retry with smaller content |
| QUOTA_EXCEEDED | API limits reached | Check OpenAI/Anthropic usage |

### Database Errors

| Error Code | Description | Fix |
|------------|-------------|-----|
| 23505 | Unique violation | Check for duplicate external_job_id |
| 23503 | Foreign key violation | Ensure related records exist |
| 42883 | Function does not exist | Run database migrations |
| 42P01 | Table does not exist | Run database migrations |

## Quick Fixes

### Reset Stuck Jobs
```sql
-- Reset jobs stuck in processing for >30 minutes
UPDATE social_media_jobs
SET status = 'failed',
    error_message = 'Processing timeout',
    completed_at = NOW()
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '30 minutes';
```

### Clear Test Data
```sql
-- Remove test data older than 24 hours
DELETE FROM social_media_jobs
WHERE (external_job_id ILIKE '%test%' 
   OR webhook_token ILIKE '%test%')
  AND created_at < NOW() - INTERVAL '24 hours';
```

### Force Reanalysis
```sql
-- Mark content for reanalysis
UPDATE content_analysis
SET hook_analysis = NULL,
    body_analysis = NULL,
    cta_analysis = NULL,
    updated_at = NOW()
WHERE content_piece_id IN (
  SELECT cp.id 
  FROM content_pieces cp
  JOIN social_media_content sc ON sc.content_piece_id = cp.id
  WHERE sc.platform = 'youtube'
    AND cp.created_at > NOW() - INTERVAL '1 day'
);
```

## Support Resources

- **Make.com Community**: https://community.make.com
- **Apify Support**: https://apify.com/support
- **Supabase Docs**: https://supabase.com/docs
- **AICON Support**: support@aicon.app

For urgent issues, check the real-time status page: https://status.aicon.app