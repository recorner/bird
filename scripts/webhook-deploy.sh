#!/bin/bash

# 🎣 Webhook Handler for GitHub Auto-Deployment
# This script is triggered by GitHub webhooks when code is pushed to main

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[WEBHOOK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Log the deployment
echo "$(date): GitHub webhook triggered deployment" >> logs/deployments.log

print_status "🎣 GitHub webhook received - starting auto-deployment..."

# Change to project directory (adjust path as needed)
cd /root/bird

# Verify we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "Not on main branch (currently on $CURRENT_BRANCH), checking out main..."
    git checkout main
fi

# Pull latest changes
print_status "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies
print_status "📦 Installing/updating dependencies..."
npm ci --production

# Run health check before deployment
print_status "🔍 Running pre-deployment health check..."
./scripts/health-check.sh || print_warning "Pre-deployment health check failed, continuing..."

# Create backup before deployment
print_status "🔄 Creating backup before deployment..."
./scripts/backup.sh

# Reload the bot with zero downtime
print_status "🚀 Reloading BirdEye bot with zero downtime..."
pm2 reload birdeye || {
    print_warning "Reload failed, trying restart..."
    pm2 restart birdeye
}

# Wait for bot to stabilize
sleep 5

# Post-deployment health check
print_status "🔍 Running post-deployment health check..."
if ./scripts/health-check.sh; then
    print_success "✅ Auto-deployment completed successfully!"
    
    # Log successful deployment
    echo "$(date): Deployment successful - $(git rev-parse --short HEAD)" >> logs/deployments.log
    
    # Send success notification to bot (optional)
    # You can add Telegram notification here if needed
    
else
    print_error "❌ Post-deployment health check failed!"
    echo "$(date): Deployment failed - $(git rev-parse --short HEAD)" >> logs/deployments.log
    exit 1
fi

print_success "🎯 BirdEye Sniper Bot auto-deployment completed!"
