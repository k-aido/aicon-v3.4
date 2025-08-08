#!/usr/bin/env node

/**
 * Alerting System for Social Media Analysis
 * Monitors system health and sends notifications for critical events
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Alert thresholds
  webhookFailureThreshold: 5,
  webhookFailureWindow: 600, // 10 minutes in seconds
  stuckJobTimeout: 300, // 5 minutes in seconds
  highLoadThreshold: 100, // concurrent connections
  slowQueryThreshold: 3000, // milliseconds
  
  // Notification settings
  adminEmail: process.env.ADMIN_EMAIL,
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  emailHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  emailPort: process.env.SMTP_PORT || 587,
  emailUser: process.env.SMTP_USER,
  emailPass: process.env.SMTP_PASS,
  
  // Check intervals (seconds)
  checkInterval: 60,
  cleanupInterval: 300
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Initialize email transporter
const emailTransporter = nodemailer.createTransport({
  host: config.emailHost,
  port: config.emailPort,
  secure: false,
  auth: {
    user: config.emailUser,
    pass: config.emailPass
  }
});

// Alert state tracking
const alertState = {
  webhookFailures: [],
  lastCleanup: Date.now(),
  activeAlerts: new Set()
};

/**
 * Send email notification
 */
async function sendEmail(subject, html) {
  if (!config.adminEmail || !config.emailUser) {
    console.log('Email not configured, skipping notification');
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: config.emailUser,
      to: config.adminEmail,
      subject: `[AICON Alert] ${subject}`,
      html: html
    });
    console.log(`Email sent: ${subject}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Send Slack notification
 */
async function sendSlack(message, color = 'warning') {
  if (!config.slackWebhook) {
    console.log('Slack not configured, skipping notification');
    return;
  }

  try {
    await fetch(config.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color: color,
          title: 'AICON System Alert',
          text: message,
          footer: 'AICON Monitoring',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
    console.log(`Slack notification sent: ${message}`);
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

/**
 * Check for webhook failures
 */
async function checkWebhookFailures() {
  const { data, error } = await supabase
    .from('social_media_jobs')
    .select('id, created_at, error_message')
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - config.webhookFailureWindow * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to check webhook failures:', error);
    return;
  }

  const recentFailures = data || [];
  
  if (recentFailures.length >= config.webhookFailureThreshold) {
    const alertKey = 'webhook_failures';
    
    if (!alertState.activeAlerts.has(alertKey)) {
      alertState.activeAlerts.add(alertKey);
      
      const message = `High webhook failure rate detected: ${recentFailures.length} failures in the last ${config.webhookFailureWindow / 60} minutes`;
      
      await sendEmail(
        'High Webhook Failure Rate',
        `
        <h2>Webhook Failure Alert</h2>
        <p>${message}</p>
        <h3>Recent Failures:</h3>
        <ul>
          ${recentFailures.slice(0, 5).map(f => 
            `<li>${new Date(f.created_at).toLocaleString()} - ${f.error_message || 'Unknown error'}</li>`
          ).join('')}
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring">View Dashboard</a></p>
        `
      );
      
      await sendSlack(message, 'danger');
    }
  } else {
    alertState.activeAlerts.delete('webhook_failures');
  }
}

/**
 * Check for stuck jobs
 */
async function checkStuckJobs() {
  const { data, error } = await supabase
    .rpc('get_stuck_jobs', { timeout_minutes: config.stuckJobTimeout / 60 });

  if (error) {
    console.error('Failed to check stuck jobs:', error);
    return;
  }

  const stuckJobs = data || [];
  
  if (stuckJobs.length > 0) {
    console.log(`Found ${stuckJobs.length} stuck jobs, cleaning up...`);
    
    // Cleanup stuck jobs
    const { data: cleanupResult } = await supabase
      .rpc('cleanup_stuck_jobs', { timeout_minutes: config.stuckJobTimeout / 60 });
    
    const message = `Cleaned up ${stuckJobs.length} stuck jobs (processing for over ${config.stuckJobTimeout / 60} minutes)`;
    
    await sendEmail(
      'Stuck Jobs Cleaned',
      `
      <h2>Stuck Jobs Alert</h2>
      <p>${message}</p>
      <h3>Cleaned Jobs:</h3>
      <ul>
        ${stuckJobs.map(j => 
          `<li>Job ${j.id} - ${j.platform} - Stuck for ${j.minutes_stuck.toFixed(1)} minutes</li>`
        ).join('')}
      </ul>
      `
    );
    
    await sendSlack(message, 'warning');
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    const { data: metrics, error } = await supabase
      .rpc('get_database_metrics');

    if (error) {
      console.error('Failed to get database metrics:', error);
      return;
    }

    const activeConnections = metrics.find(m => m.metric_name === 'active_connections')?.metric_value || 0;
    const cacheHitRatio = metrics.find(m => m.metric_name === 'cache_hit_ratio')?.metric_value || 0;

    // Check connection pool
    if (activeConnections > config.highLoadThreshold) {
      const alertKey = 'high_db_connections';
      
      if (!alertState.activeAlerts.has(alertKey)) {
        alertState.activeAlerts.add(alertKey);
        
        const message = `High database load: ${activeConnections} active connections (threshold: ${config.highLoadThreshold})`;
        
        await sendEmail('High Database Load', `
          <h2>Database Load Alert</h2>
          <p>${message}</p>
          <p>Current metrics:</p>
          <ul>
            ${metrics.map(m => `<li>${m.metric_name}: ${m.metric_value} ${m.metric_unit}</li>`).join('')}
          </ul>
        `);
        
        await sendSlack(message, 'danger');
      }
    } else {
      alertState.activeAlerts.delete('high_db_connections');
    }

    // Check cache performance
    if (cacheHitRatio < 90) {
      console.warn(`Low cache hit ratio: ${cacheHitRatio}%`);
    }

  } catch (error) {
    console.error('Database health check failed:', error);
  }
}

/**
 * Check Make.com integration health
 */
async function checkMakeIntegration() {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/make/test`;
    
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'GET',
      timeout: 5000
    });
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const alertKey = 'make_integration_down';
      
      if (!alertState.activeAlerts.has(alertKey)) {
        alertState.activeAlerts.add(alertKey);
        
        const message = `Make.com webhook endpoint is down (HTTP ${response.status})`;
        await sendEmail('Webhook Endpoint Down', message);
        await sendSlack(message, 'danger');
      }
    } else {
      alertState.activeAlerts.delete('make_integration_down');
      
      // Check response time
      if (responseTime > config.slowQueryThreshold) {
        console.warn(`Slow webhook response: ${responseTime}ms`);
      }
    }

  } catch (error) {
    console.error('Make.com integration check failed:', error);
  }
}

/**
 * Clean up old test data
 */
async function cleanupTestData() {
  try {
    const { data, error } = await supabase
      .from('social_media_jobs')
      .delete()
      .or('external_job_id.ilike.%test%,webhook_token.ilike.%test%')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .select();

    if (!error && data?.length > 0) {
      console.log(`Cleaned up ${data.length} test records`);
    }
  } catch (error) {
    console.error('Test data cleanup failed:', error);
  }
}

/**
 * Main monitoring loop
 */
async function runMonitoring() {
  console.log('Starting alerting system...');
  console.log(`- Webhook failure threshold: ${config.webhookFailureThreshold} in ${config.webhookFailureWindow}s`);
  console.log(`- Stuck job timeout: ${config.stuckJobTimeout}s`);
  console.log(`- Check interval: ${config.checkInterval}s`);
  console.log('');

  // Initial checks
  await Promise.all([
    checkWebhookFailures(),
    checkStuckJobs(),
    checkDatabaseHealth(),
    checkMakeIntegration()
  ]);

  // Set up recurring checks
  setInterval(async () => {
    console.log(`[${new Date().toISOString()}] Running health checks...`);
    
    await Promise.all([
      checkWebhookFailures(),
      checkStuckJobs(),
      checkDatabaseHealth(),
      checkMakeIntegration()
    ]);
  }, config.checkInterval * 1000);

  // Set up cleanup
  setInterval(async () => {
    console.log(`[${new Date().toISOString()}] Running cleanup...`);
    await cleanupTestData();
  }, config.cleanupInterval * 1000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down alerting system...');
  process.exit(0);
});

// Start monitoring
if (require.main === module) {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }
  
  runMonitoring().catch(error => {
    console.error('Monitoring system error:', error);
    process.exit(1);
  });
}

module.exports = {
  sendEmail,
  sendSlack,
  checkWebhookFailures,
  checkStuckJobs,
  checkDatabaseHealth,
  checkMakeIntegration
};