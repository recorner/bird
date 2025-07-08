#!/bin/bash

# BirdEye Sniper Bot - Self-Deployment Monitor
# This script runs on your server and automatically pulls and deploys changes

set -e

# Configuration
REPO_DIR="/root/bird"
LOG_FILE="$REPO_DIR/logs/auto-deploy-monitor.log"
LOCK_FILE="/tmp/birdeye-deploy.lock"
CHECK_INTERVAL=60  # Check every 60 seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if another deployment is running
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "🔒 Another deployment is running (PID: $pid)"
            return 1
        else
            log "🗑️ Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    return 0
}

# Create lock file
create_lock() {
    echo $$ > "$LOCK_FILE"
}

# Remove lock file
remove_lock() {
    rm -f "$LOCK_FILE"
}

# Check for updates
check_for_updates() {
    cd "$REPO_DIR" || {
        log_error "Cannot access repository directory: $REPO_DIR"
        return 1
    }
    
    # Fetch latest changes
    git fetch origin main 2>/dev/null || {
        log_error "Failed to fetch from origin"
        return 1
    }
    
    # Check if there are new commits
    local local_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/main)
    
    if [ "$local_commit" != "$remote_commit" ]; then
        log "🔄 New commits detected!"
        log "📋 Local:  $local_commit"
        log "📋 Remote: $remote_commit"
        return 0
    else
        return 1
    fi
}

# Deploy updates
deploy_updates() {
    log "🚀 Starting deployment..."
    
    cd "$REPO_DIR" || return 1
    
    # Get commit info before pulling
    local old_commit=$(git rev-parse --short HEAD)
    
    # Pull latest changes
    log "📥 Pulling latest changes..."
    git reset --hard origin/main || {
        log_error "Failed to pull changes"
        return 1
    }
    
    local new_commit=$(git rev-parse --short HEAD)
    local commit_message=$(git log -1 --pretty=format:"%s")
    
    log "📋 Updated from $old_commit to $new_commit"
    log "💬 Commit message: $commit_message"
    
    # Install dependencies
    log "📦 Installing dependencies..."
    npm ci --production || {
        log_error "Failed to install dependencies"
        return 1
    }
    
    # Stop existing bot
    log "⏹️ Stopping existing bot..."
    pm2 stop birdeye 2>/dev/null || log "ℹ️ Bot was not running"
    
    # Start bot
    log "▶️ Starting bot..."
    pm2 start ecosystem.config.js --env production || {
        log_error "Failed to start bot"
        return 1
    }
    
    # Save PM2 configuration
    pm2 save
    
    # Wait for bot to start
    sleep 10
    
    # Check if bot is running
    if pm2 list | grep -q "birdeye.*online"; then
        log_success "Bot deployed successfully!"
        
        # Send deployment notification
        log "📱 Sending deployment notification..."
        ./scripts/auto-deploy.sh webhook || log "⚠️ Failed to send notification"
        
        return 0
    else
        log_error "Bot failed to start after deployment"
        return 1
    fi
}

# Main monitoring loop
monitor_for_updates() {
    log "👁️ Starting deployment monitor..."
    log "🔍 Checking for updates every ${CHECK_INTERVAL} seconds"
    log "📁 Repository: $REPO_DIR"
    
    while true; do
        if check_lock; then
            if check_for_updates; then
                create_lock
                
                if deploy_updates; then
                    log_success "Deployment completed successfully"
                else
                    log_error "Deployment failed"
                fi
                
                remove_lock
            fi
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Start daemon
start_daemon() {
    log "🚀 Starting BirdEye deployment monitor daemon..."
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check if already running
    if pgrep -f "auto-deploy-monitor.sh" >/dev/null; then
        log "⚠️ Monitor is already running"
        exit 1
    fi
    
    # Start monitoring in background
    nohup "$0" monitor >> "$LOG_FILE" 2>&1 &
    local pid=$!
    
    log_success "Monitor started with PID: $pid"
    log "📝 Logs: $LOG_FILE"
    log "⏹️ To stop: kill $pid"
    
    # Save PID for easy stopping
    echo "$pid" > "/tmp/birdeye-monitor.pid"
}

# Stop daemon
stop_daemon() {
    log "⏹️ Stopping deployment monitor..."
    
    if [ -f "/tmp/birdeye-monitor.pid" ]; then
        local pid=$(cat "/tmp/birdeye-monitor.pid")
        if kill "$pid" 2>/dev/null; then
            log_success "Monitor stopped (PID: $pid)"
        else
            log "⚠️ Process not found"
        fi
        rm -f "/tmp/birdeye-monitor.pid"
    else
        log "⚠️ No PID file found"
    fi
    
    # Kill any remaining processes
    pkill -f "auto-deploy-monitor.sh" 2>/dev/null || true
    remove_lock
}

# Show status
show_status() {
    if [ -f "/tmp/birdeye-monitor.pid" ]; then
        local pid=$(cat "/tmp/birdeye-monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            log "✅ Monitor is running (PID: $pid)"
            log "📝 Log file: $LOG_FILE"
            
            # Show recent activity
            if [ -f "$LOG_FILE" ]; then
                echo ""
                echo "📋 Recent activity:"
                tail -5 "$LOG_FILE"
            fi
        else
            log "❌ Monitor is not running (stale PID file)"
            rm -f "/tmp/birdeye-monitor.pid"
        fi
    else
        log "❌ Monitor is not running"
    fi
}

# Main script logic
case "${1:-start}" in
    "start")
        start_daemon
        ;;
    "stop")
        stop_daemon
        ;;
    "restart")
        stop_daemon
        sleep 2
        start_daemon
        ;;
    "status")
        show_status
        ;;
    "monitor")
        # Internal command for monitoring loop
        monitor_for_updates
        ;;
    "test")
        # Test deployment without daemon
        log "🧪 Testing deployment process..."
        if check_lock; then
            create_lock
            if check_for_updates; then
                deploy_updates
            else
                log "ℹ️ No updates available"
            fi
            remove_lock
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the deployment monitor daemon"
        echo "  stop    - Stop the deployment monitor daemon"
        echo "  restart - Restart the deployment monitor daemon"
        echo "  status  - Show monitor status"
        echo "  test    - Test deployment process once"
        exit 1
        ;;
esac
