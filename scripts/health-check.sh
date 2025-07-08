#!/bin/bash

# 🔍 Health Check Script for BirdEye Sniper Bot
# This script checks if the bot is healthy and responds appropriately

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[HEALTH CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[HEALTHY]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[UNHEALTHY]${NC} $1"
}

print_status "🔍 Starting BirdEye Sniper Bot Health Check..."

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 not found on system"
    exit 1
fi

# Check if birdeye process exists
if ! pm2 describe birdeye > /dev/null 2>&1; then
    print_error "BirdEye bot process not found in PM2"
    print_status "Attempting to start bot..."
    pm2 start ecosystem.config.js
    sleep 5
fi

# Get process status
PM2_STATUS=$(pm2 jlist birdeye | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")

case $PM2_STATUS in
    "online")
        print_success "✅ Bot process is online"
        ;;
    "stopped")
        print_warning "⏸️ Bot process is stopped, attempting restart..."
        pm2 restart birdeye
        sleep 3
        ;;
    "errored")
        print_error "❌ Bot process is in error state"
        print_status "Recent error logs:"
        pm2 logs birdeye --err --lines 10 --nostream
        print_status "Attempting restart..."
        pm2 restart birdeye
        ;;
    *)
        print_warning "❓ Unknown bot status: $PM2_STATUS"
        ;;
esac

# Check memory usage
MEMORY_USAGE=$(pm2 jlist birdeye | jq -r '.[0].monit.memory' 2>/dev/null || echo "0")
MEMORY_MB=$((MEMORY_USAGE / 1024 / 1024))

if [ $MEMORY_MB -gt 800 ]; then
    print_warning "⚠️ High memory usage: ${MEMORY_MB}MB (limit: 1GB)"
elif [ $MEMORY_MB -gt 0 ]; then
    print_success "💾 Memory usage: ${MEMORY_MB}MB"
fi

# Check uptime
UPTIME=$(pm2 jlist birdeye | jq -r '.[0].pm2_env.pm_uptime' 2>/dev/null || echo "0")
if [ $UPTIME -gt 0 ]; then
    UPTIME_HOURS=$(( ($(date +%s) * 1000 - UPTIME) / 1000 / 3600 ))
    print_success "⏰ Uptime: ${UPTIME_HOURS} hours"
fi

# Check restart count
RESTARTS=$(pm2 jlist birdeye | jq -r '.[0].pm2_env.restart_time' 2>/dev/null || echo "0")
if [ $RESTARTS -gt 5 ]; then
    print_warning "🔄 High restart count: $RESTARTS restarts"
elif [ $RESTARTS -ge 0 ]; then
    print_success "🔄 Restart count: $RESTARTS"
fi

# Check log file sizes
if [ -f "logs/combined.log" ]; then
    LOG_SIZE=$(du -m logs/combined.log | cut -f1)
    if [ $LOG_SIZE -gt 100 ]; then
        print_warning "📋 Large log file: ${LOG_SIZE}MB (consider rotation)"
    else
        print_success "📋 Log file size: ${LOG_SIZE}MB"
    fi
fi

# Final status
FINAL_STATUS=$(pm2 jlist birdeye | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
if [ "$FINAL_STATUS" = "online" ]; then
    print_success "🎯 BirdEye Sniper Bot is healthy and operational!"
    
    echo ""
    echo "📊 Quick Status:"
    pm2 status birdeye --no-color
    
    exit 0
else
    print_error "❌ BirdEye Sniper Bot health check failed!"
    echo ""
    echo "📊 Current Status:"
    pm2 status birdeye --no-color
    echo ""
    echo "📋 Recent Logs:"
    pm2 logs birdeye --lines 10 --nostream
    
    exit 1
fi
