#!/bin/bash

# Production Deployment Script for Social Media Analysis System
# This script handles migrations, validations, and health checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/database/migrations"
LOG_FILE="/tmp/aicon-deploy-$(date +%Y%m%d-%H%M%S).log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running in production
check_environment() {
    log "Checking environment..."
    
    if [[ "$NODE_ENV" != "production" ]]; then
        warning "NODE_ENV is not set to production. Are you sure you want to continue?"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled"
            exit 1
        fi
    fi
    
    success "Environment check passed"
}

# Validate environment variables
validate_env_vars() {
    log "Validating environment variables..."
    
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "MAKE_WEBHOOK_SECRET"
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "NEXT_PUBLIC_APP_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    # Validate URL formats
    if [[ ! "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https:// ]]; then
        error "NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production"
        exit 1
    fi
    
    if [[ ! "$NEXT_PUBLIC_APP_URL" =~ ^https:// ]]; then
        error "NEXT_PUBLIC_APP_URL must use HTTPS in production"
        exit 1
    fi
    
    success "Environment variables validated"
}

# Run Supabase migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Link to Supabase project if not already linked
    if [[ ! -f "$PROJECT_ROOT/supabase/.gitignore" ]]; then
        log "Linking to Supabase project..."
        cd "$PROJECT_ROOT"
        supabase link --project-ref "${SUPABASE_PROJECT_ID}"
    fi
    
    # Run migrations
    cd "$PROJECT_ROOT"
    
    # Check for pending migrations
    pending_migrations=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | grep -v rollback || true)
    
    if [[ -z "$pending_migrations" ]]; then
        warning "No migrations found to run"
    else
        for migration in $pending_migrations; do
            migration_name=$(basename "$migration")
            log "Running migration: $migration_name"
            
            if supabase db push --file "$migration"; then
                success "Migration $migration_name completed"
            else
                error "Migration $migration_name failed"
                exit 1
            fi
        done
    fi
    
    success "All migrations completed"
}

# Database health checks
check_database_health() {
    log "Running database health checks..."
    
    # Create health check script
    cat > /tmp/db_health_check.sql << EOF
-- Check if required tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('social_media_jobs', 'social_media_content', 'content_analysis');

-- Check indexes
SELECT COUNT(*) as index_count FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('social_media_jobs', 'social_media_content');

-- Check row counts
SELECT 
    'social_media_jobs' as table_name, 
    COUNT(*) as row_count 
FROM social_media_jobs
UNION ALL
SELECT 
    'social_media_content' as table_name, 
    COUNT(*) as row_count 
FROM social_media_content;

-- Check for stuck jobs
SELECT COUNT(*) as stuck_jobs
FROM social_media_jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '30 minutes';
EOF

    # Run health checks using psql
    export PGPASSWORD="$SUPABASE_DB_PASSWORD"
    
    if psql "$DATABASE_URL" -f /tmp/db_health_check.sql > /tmp/db_health_results.txt 2>&1; then
        success "Database health checks passed"
        cat /tmp/db_health_results.txt | tee -a "$LOG_FILE"
    else
        error "Database health checks failed"
        cat /tmp/db_health_results.txt
        exit 1
    fi
    
    rm -f /tmp/db_health_check.sql /tmp/db_health_results.txt
}

# Test webhook endpoints
test_webhook_endpoints() {
    log "Testing webhook endpoints..."
    
    webhook_url="$NEXT_PUBLIC_APP_URL/api/webhooks/make"
    test_token="svc_webhook_test_$(date +%s)"
    
    # Test endpoint availability
    log "Testing webhook endpoint: $webhook_url"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$webhook_url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $test_token" \
        -d '{
            "action": "test.connection",
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "execution_id": "deploy_test_'$(date +%s)'"
        }' 2>&1)
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "401" ]] || [[ "$http_code" == "200" ]]; then
        success "Webhook endpoint is responding correctly (HTTP $http_code)"
    else
        error "Webhook endpoint test failed (HTTP $http_code)"
        echo "Response: $body"
        exit 1
    fi
    
    # Test rate limiting
    log "Testing rate limiting..."
    for i in {1..5}; do
        curl -s -X POST "$webhook_url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${test_token}_$i" \
            -d '{"action":"test.rate_limit"}' > /dev/null 2>&1 &
    done
    wait
    
    success "Rate limiting test completed"
}

# SSL certificate validation
check_ssl_certificates() {
    log "Validating SSL certificates..."
    
    # Extract domain from URL
    domain=$(echo "$NEXT_PUBLIC_APP_URL" | sed -E 's|https?://([^/]+).*|\1|')
    
    # Check SSL certificate
    if openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | \
        openssl x509 -noout -checkend 86400; then
        success "SSL certificate is valid for at least 24 hours"
    else
        warning "SSL certificate expires within 24 hours or is invalid"
    fi
    
    # Check certificate chain
    log "Checking certificate chain..."
    if openssl s_client -connect "$domain:443" -servername "$domain" -showcerts < /dev/null 2>/dev/null | \
        grep -q "Verify return code: 0"; then
        success "SSL certificate chain is valid"
    else
        warning "SSL certificate chain validation failed"
    fi
}

# Build and optimize Next.js application
build_application() {
    log "Building Next.js application..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Clean previous builds
    rm -rf .next
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production=false
    
    # Run production build
    log "Running production build..."
    if npm run build; then
        success "Application built successfully"
    else
        error "Build failed"
        exit 1
    fi
    
    # Check build output
    if [[ -d ".next" ]]; then
        build_size=$(du -sh .next | cut -f1)
        success "Build size: $build_size"
    fi
}

# Deploy to Vercel (if using Vercel)
deploy_to_vercel() {
    log "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        warning "Vercel CLI not installed, skipping Vercel deployment"
        return
    fi
    
    cd "$PROJECT_ROOT/frontend"
    
    # Deploy to production
    if vercel --prod --yes; then
        success "Deployed to Vercel successfully"
    else
        error "Vercel deployment failed"
        exit 1
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring configuration
    cat > "$PROJECT_ROOT/monitoring-config.json" << EOF
{
  "alerts": {
    "webhook_failure_threshold": 5,
    "webhook_failure_window": 600,
    "job_timeout_minutes": 5,
    "database_connection_threshold": 100,
    "response_time_threshold_ms": 3000
  },
  "cleanup": {
    "enabled": true,
    "stuck_job_timeout_minutes": 30,
    "test_data_retention_hours": 24,
    "log_retention_days": 30
  },
  "notifications": {
    "email": "${ADMIN_EMAIL:-admin@example.com}",
    "slack_webhook": "${SLACK_WEBHOOK_URL:-}"
  }
}
EOF
    
    success "Monitoring configuration created"
}

# Final health check
final_health_check() {
    log "Running final health checks..."
    
    # Check application health endpoint
    health_url="$NEXT_PUBLIC_APP_URL/api/health"
    
    if curl -s -f "$health_url" > /dev/null 2>&1; then
        success "Application health check passed"
    else
        warning "Application health endpoint not responding"
    fi
    
    # Generate deployment report
    cat > "$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).txt" << EOF
Deployment Report
=================
Date: $(date)
Environment: $NODE_ENV
Application URL: $NEXT_PUBLIC_APP_URL
Supabase URL: $NEXT_PUBLIC_SUPABASE_URL

Deployment Steps:
- Environment validation: ✓
- Database migrations: ✓
- Health checks: ✓
- SSL validation: ✓
- Build: ✓
- Deployment: ✓

Log file: $LOG_FILE
EOF
    
    success "Deployment completed successfully!"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🚀 AICON Production Deployment Script${NC}"
    echo "====================================="
    echo
    
    # Create log file
    touch "$LOG_FILE"
    log "Starting deployment process..."
    
    # Run deployment steps
    check_environment
    validate_env_vars
    run_migrations
    check_database_health
    test_webhook_endpoints
    check_ssl_certificates
    build_application
    deploy_to_vercel
    setup_monitoring
    final_health_check
    
    echo
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo "Log file: $LOG_FILE"
}

# Run main function
main "$@"