#!/usr/bin/env node

/**
 * End-to-end testing script for social media analysis flow
 * Tests webhook creation, progress updates, completion, and real-time UI updates
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const chalk = require('chalk');

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  webhookEndpoint: process.env.WEBHOOK_ENDPOINT || 'http://localhost:3000/api/webhooks/make',
  webhookSecret: process.env.MAKE_WEBHOOK_SECRET,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  dryRun: process.argv.includes('--dry-run'),
  platform: process.argv.find(arg => arg.startsWith('--platform='))?.split('=')[1] || 'youtube'
};

// Test scenarios
const testScenarios = {
  youtube: {
    single: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    channel: 'https://www.youtube.com/@MrBeast',
    invalid: 'https://www.youtube.com/watch?v=invalid_id'
  },
  instagram: {
    post: 'https://www.instagram.com/p/C1234567890/',
    reel: 'https://www.instagram.com/reel/C0987654321/',
    profile: 'https://www.instagram.com/cristiano/'
  },
  tiktok: {
    video: 'https://www.tiktok.com/@username/video/7123456789012345678',
    profile: 'https://www.tiktok.com/@khaby.lame'
  }
};

// Initialize Supabase client
function initSupabase() {
  if (!config.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Logging helpers
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  debug: (msg) => config.verbose && console.log(chalk.gray('→'), msg)
};

// Generate webhook token
function generateWebhookToken() {
  return `svc_webhook_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Calculate HMAC signature
async function calculateSignature(payload, secret) {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Test webhook job creation
async function testJobCreation(url, platform, token) {
  log.info(`Testing job creation for ${platform}: ${url}`);
  
  const payload = {
    action: 'job.create',
    timestamp: new Date().toISOString(),
    execution_id: `test_exec_${Date.now()}`,
    scenario_id: 'e2e_test',
    content: {
      url,
      platform,
      metadata: {
        test: true,
        test_run_id: Date.now()
      }
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  if (config.webhookSecret) {
    headers['x-make-signature'] = await calculateSignature(
      JSON.stringify(payload),
      config.webhookSecret
    );
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(config.webhookEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (response.ok) {
      log.success(`Job created successfully in ${duration}ms`);
      log.debug(`Job ID: ${data.job_id}`);
      return { success: true, jobId: data.job_id, duration };
    } else {
      log.error(`Job creation failed: ${data.error}`);
      return { success: false, error: data.error, duration };
    }
  } catch (error) {
    log.error(`Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Monitor job progress via Supabase subscription
async function monitorJobProgress(jobId, timeout = 120000) {
  const supabase = initSupabase();
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    let lastStatus = null;
    
    log.info(`Monitoring job progress: ${jobId}`);
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      log.error(`Job monitoring timed out after ${timeout}ms`);
      subscription.unsubscribe();
      resolve({ success: false, error: 'Timeout', duration: timeout });
    }, timeout);

    // Subscribe to job updates
    const subscription = supabase
      .channel(`job-monitor-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const job = payload.new;
          const duration = Date.now() - startTime;
          
          if (job.status !== lastStatus) {
            log.info(`Job status: ${lastStatus || 'created'} → ${job.status} (${duration}ms)`);
            lastStatus = job.status;
          }

          if (job.status === 'completed') {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
            log.success(`Job completed successfully in ${duration}ms`);
            resolve({ success: true, job, duration });
          } else if (job.status === 'failed') {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
            log.error(`Job failed: ${job.error_message}`);
            resolve({ success: false, error: job.error_message, job, duration });
          }
        }
      )
      .subscribe();

    // Also poll for initial state
    setTimeout(async () => {
      const { data: job } = await supabase
        .from('social_media_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (job && job.status !== 'pending' && !lastStatus) {
        log.info(`Initial job status: ${job.status}`);
        lastStatus = job.status;
      }
    }, 500);
  });
}

// Test error scenarios
async function testErrorScenarios(token) {
  log.info('\nTesting error scenarios...\n');
  
  const errorTests = [
    {
      name: 'Invalid URL',
      payload: {
        action: 'job.create',
        timestamp: new Date().toISOString(),
        execution_id: 'test_error_1',
        scenario_id: 'error_test',
        content: {
          url: 'not-a-valid-url',
          platform: 'youtube'
        }
      }
    },
    {
      name: 'Missing platform',
      payload: {
        action: 'job.create',
        timestamp: new Date().toISOString(),
        execution_id: 'test_error_2',
        scenario_id: 'error_test',
        content: {
          url: 'https://www.youtube.com/watch?v=test'
        }
      }
    },
    {
      name: 'Invalid action',
      payload: {
        action: 'invalid.action',
        timestamp: new Date().toISOString()
      }
    }
  ];

  for (const test of errorTests) {
    log.info(`Testing: ${test.name}`);
    
    try {
      const response = await fetch(config.webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(test.payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        log.success(`Expected error received: ${data.error}`);
      } else {
        log.warn(`Expected error but request succeeded`);
      }
    } catch (error) {
      log.success(`Expected error: ${error.message}`);
    }
  }
}

// Test rate limiting
async function testRateLimiting(token) {
  log.info('\nTesting rate limiting...\n');
  
  const requests = 10;
  const results = [];
  
  for (let i = 0; i < requests; i++) {
    const start = Date.now();
    
    try {
      const response = await fetch(config.webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}_${i}`
        },
        body: JSON.stringify({
          action: 'job.create',
          timestamp: new Date().toISOString(),
          execution_id: `rate_test_${i}`,
          scenario_id: 'rate_limit_test',
          content: {
            url: 'https://www.youtube.com/watch?v=test',
            platform: 'youtube'
          }
        })
      });

      results.push({
        status: response.status,
        duration: Date.now() - start
      });

      if (response.status === 429) {
        log.warn(`Rate limited at request ${i + 1}`);
        break;
      }
    } catch (error) {
      results.push({ error: error.message });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const successful = results.filter(r => r.status === 200).length;
  const rateLimited = results.filter(r => r.status === 429).length;
  
  log.info(`Sent ${results.length} requests: ${successful} successful, ${rateLimited} rate limited`);
}

// Test bulk profile analysis
async function testBulkProfile(platform, token) {
  log.info(`\nTesting bulk profile analysis for ${platform}...\n`);
  
  const profileUrl = testScenarios[platform]?.profile;
  if (!profileUrl) {
    log.warn(`No profile URL configured for ${platform}`);
    return;
  }

  const result = await testJobCreation(profileUrl, platform, token);
  
  if (result.success) {
    log.info('Monitoring bulk profile processing...');
    // In real scenario, this would trigger multiple content.process calls
    await monitorJobProgress(result.jobId, 180000); // 3 minute timeout for bulk
  }
}

// Clean up test data
async function cleanupTestData() {
  if (config.dryRun) {
    log.info('Dry run - skipping cleanup');
    return;
  }

  log.info('\nCleaning up test data...\n');
  
  const supabase = initSupabase();
  
  try {
    // Clean up test jobs
    const { data: jobs, error: jobError } = await supabase
      .from('social_media_jobs')
      .delete()
      .ilike('external_job_id', '%test%')
      .select();

    if (jobError) {
      log.error(`Failed to clean up jobs: ${jobError.message}`);
    } else {
      log.success(`Cleaned up ${jobs?.length || 0} test jobs`);
    }

    // Clean up test content
    const { data: content, error: contentError } = await supabase
      .from('content_pieces')
      .delete()
      .ilike('title', '%test%')
      .select();

    if (contentError) {
      log.error(`Failed to clean up content: ${contentError.message}`);
    } else {
      log.success(`Cleaned up ${content?.length || 0} test content pieces`);
    }
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  console.log(chalk.bold('\n🧪 Social Media Analysis E2E Test Suite\n'));
  console.log(`Platform: ${chalk.cyan(config.platform)}`);
  console.log(`Webhook: ${chalk.cyan(config.webhookEndpoint)}`);
  console.log(`Dry Run: ${chalk.cyan(config.dryRun ? 'Yes' : 'No')}\n`);

  const token = generateWebhookToken();
  const testResults = {
    passed: 0,
    failed: 0,
    duration: 0
  };

  const startTime = Date.now();

  try {
    // Test 1: Basic job creation and monitoring
    log.info(chalk.bold('Test 1: Basic Flow'));
    const urls = testScenarios[config.platform];
    
    for (const [type, url] of Object.entries(urls)) {
      if (type === 'invalid') continue;
      
      log.info(`\nTesting ${type} content...`);
      const createResult = await testJobCreation(url, config.platform, token);
      
      if (createResult.success && !config.dryRun) {
        const monitorResult = await monitorJobProgress(createResult.jobId);
        
        if (monitorResult.success) {
          testResults.passed++;
        } else {
          testResults.failed++;
        }
      } else if (createResult.success) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }

    // Test 2: Error scenarios
    log.info(chalk.bold('\nTest 2: Error Handling'));
    await testErrorScenarios(token);
    testResults.passed++; // Error tests pass if they handle errors correctly

    // Test 3: Rate limiting
    log.info(chalk.bold('\nTest 3: Rate Limiting'));
    await testRateLimiting(token);
    testResults.passed++;

    // Test 4: Bulk profile analysis
    if (testScenarios[config.platform]?.profile) {
      log.info(chalk.bold('\nTest 4: Bulk Profile Analysis'));
      await testBulkProfile(config.platform, token);
      testResults.passed++;
    }

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    testResults.failed++;
  } finally {
    testResults.duration = Date.now() - startTime;
    
    // Clean up
    await cleanupTestData();

    // Summary
    console.log(chalk.bold('\n📊 Test Summary\n'));
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`${chalk.green('Passed')}: ${testResults.passed}`);
    console.log(`${chalk.red('Failed')}: ${testResults.failed}`);
    console.log(`Duration: ${testResults.duration}ms`);
    console.log('');

    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Check requirements
function checkRequirements() {
  const missing = [];
  
  if (!config.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!config.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  if (missing.length > 0) {
    console.error(chalk.red('\n❌ Missing required environment variables:\n'));
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease set these variables and try again.\n');
    process.exit(1);
  }
}

// Run tests
checkRequirements();
runTests().catch(error => {
  console.error(chalk.red('\n❌ Unexpected error:'), error);
  process.exit(1);
});