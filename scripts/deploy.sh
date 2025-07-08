#!/bin/bash

# 🚀 Production Deployment Script for BirdEye Sniper Bot
# This script handles safe deployment with health checks

set -e

echo "🦅 Starting BirdEye Sniper Bot Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please create it from .env.example"
    exit 1
fi

# Check if required environment variables are set
print_status "Checking environment configuration..."
source .env

if [ -z "$BOT_TOKEN" ]; then
    print_error "BOT_TOKEN not set in .env file"
    exit 1
fi

if [ -z "$GROUP_ID" ]; then
    print_error "GROUP_ID not set in .env file"
    exit 1
fi

print_success "Environment configuration validated"

# Install dependencies
print_status "Installing production dependencies..."
npm ci --production

# Create logs directory
print_status "Setting up logging..."
mkdir -p logs
touch logs/err.log logs/out.log logs/combined.log

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found, installing globally..."
    npm install -g pm2
fi

# Check if bot is already running
if pm2 describe birdeye > /dev/null 2>&1; then
    print_status "BirdEye bot is running, performing graceful reload..."
    pm2 reload birdeye
else
    print_status "Starting BirdEye bot for the first time..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (for server reboots)
print_status "Setting up PM2 startup script..."
pm2 startup > /dev/null 2>&1 || print_warning "PM2 startup setup skipped (may require sudo)"

# Health check
print_status "Performing health check..."
sleep 5

if pm2 describe birdeye | grep -q "online"; then
    print_success "🎯 BirdEye Sniper Bot deployed successfully!"
    print_success "Bot is online and operational"
    
    echo ""
    echo "📊 Current Status:"
    pm2 status birdeye
    
    echo ""
    echo "📋 Recent Logs:"
    pm2 logs birdeye --lines 5 --nostream
    
    echo ""
    echo "🔧 Management Commands:"
    echo "  - View logs: pm2 logs birdeye"
    echo "  - Restart:   pm2 restart birdeye" 
    echo "  - Stop:      pm2 stop birdeye"
    echo "  - Status:    pm2 status birdeye"
    echo "  - Monitor:   pm2 monit"
    
else
    print_error "❌ Deployment failed! Bot is not running properly"
    print_error "Check logs: pm2 logs birdeye"
    exit 1
fi

print_success "🚀 Production deployment completed successfully!"
