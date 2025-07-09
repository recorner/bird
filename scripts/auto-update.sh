#!/bin/bash

# BirdEye Sniper Bot - Self-Update Monitor
# This script runs on your server and automatically pulls updates from GitHub

set -e

# Configuration
REPO_DIR="/root/bird"
BRANCH="main"
BOT_NAME="birdeye"
CHECK_INTERVAL=300  # Check every 5 minutes
LOG_FILE="$REPO_DIR/logs/auto-update.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in the right directory
if [ ! -d "$REPO_DIR" ]; then
    log_error "Repository directory $REPO_DIR not found!"
    exit 1
fi

cd "$REPO_DIR"

# Function to check for updates
check_for_updates() {
    log "🔍 Checking for updates from GitHub..."
    
    # Fetch latest changes
    git fetch origin >/dev/null 2>&1
    
    # Get current and remote commit hashes
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/$BRANCH)
    
    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        log_success "📥 New updates found! Local: ${LOCAL_COMMIT:0:7}, Remote: ${REMOTE_COMMIT:0:7}"
        return 0  # Updates available
    else
        log "✅ Already up to date (${LOCAL_COMMIT:0:7})"
        return 1  # No updates
    fi
}

# Function to deploy updates
deploy_updates() {
    log "🚀 Starting deployment..."
    
    # Get commit info before pulling
    COMMIT_HASH=$(git rev-parse --short origin/$BRANCH)
    COMMIT_MSG=$(git log origin/$BRANCH -1 --pretty=format:"%s")
    COMMIT_AUTHOR=$(git log origin/$BRANCH -1 --pretty=format:"%an")
    
    # Pull latest changes
    log "📥 Pulling latest changes..."
    git pull origin $BRANCH
    
    # Install dependencies
    log "📦 Installing dependencies..."
    npm ci --production
    
    # Stop bot
    log "⏹️ Stopping bot..."
    pm2 stop $BOT_NAME 2>/dev/null || log "ℹ️ Bot was not running"
    
    # Start bot
    log "▶️ Starting bot..."
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save >/dev/null 2>&1
    
    # Wait for bot to start
    sleep 10
    
    # Check if bot is running
    if pm2 list | grep -q "$BOT_NAME.*online"; then
        log_success "✅ Bot deployed successfully!"
        
        # Send deployment notification
        send_deployment_notification "$COMMIT_HASH" "$COMMIT_MSG" "$COMMIT_AUTHOR"
        
        return 0
    else
        log_error "❌ Bot failed to start after deployment!"
        return 1
    fi
}

# Function to send deployment notification
send_deployment_notification() {
    local commit_hash="$1"
    local commit_msg="$2"
    local commit_author="$3"
    
    log "📱 Sending deployment notification..."
    
    # Get system info
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' || echo "N/A")
    local memory_usage=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }' || echo "N/A")
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' || echo "N/A")
    local uptime=$(uptime -p || echo "N/A")
    local hostname=$(hostname || echo "Unknown")
    
    # Get wallet info
    local wallet_info=""
    if [ -f ".env" ] && command -v node >/dev/null 2>&1; then
        wallet_info=$(node -e "
            try {
                require('dotenv').config();
                const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
                
                async function getWalletInfo() {
                    const privateKey = process.env.SOLANA_PRIVATE_KEY;
                    if (!privateKey) {
                        console.log('Configuration pending|N/A');
                        return;
                    }
                    
                    try {
                        // Try base64 first, then base58 if it fails
                        let secretKey;
                        try {
                            secretKey = Buffer.from(privateKey, 'base64');
                        } catch (error) {
                            const bs58 = require('bs58');
                            secretKey = bs58.decode(privateKey);
                        }
                        
                        const keypair = Keypair.fromSecretKey(secretKey);
                        const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
                        const balance = await connection.getBalance(keypair.publicKey);
                        const solBalance = balance / LAMPORTS_PER_SOL;
                        console.log(\`\${keypair.publicKey.toString()}|\${solBalance.toFixed(4)}\`);
                    } catch (error) {
                        console.log('Configuration pending|ERROR');
                    }
                }
                
                getWalletInfo();
            } catch (error) {
                console.log('Configuration pending|ERROR');
            }
        " 2>/dev/null || echo "Configuration pending|ERROR")
        
        if [[ "$wallet_info" == *"|"* ]]; then
            wallet_address=$(echo "$wallet_info" | cut -d'|' -f1)
            wallet_balance=$(echo "$wallet_info" | cut -d'|' -f2)
        else
            wallet_address="Configuration pending"
            wallet_balance="N/A"
        fi
    else
        wallet_address="Configuration pending"
        wallet_balance="N/A"
    fi
    
    # Create notification message
    local notification="✅ **AUTO-DEPLOYMENT SUCCESSFUL** ✅

📦 **Application**: BirdEye Sniper Bot
🎯 **Branch**: $BRANCH
📋 **Commit**: \`$commit_hash\`
💬 **Message**: $commit_msg
👤 **Author**: $commit_author
⏰ **Deployed**: $(date '+%Y-%m-%d %H:%M:%S')
🖥️ **Server**: $hostname

🤖 **Bot Status**: 🟢 RUNNING
💳 **Wallet**: \`$wallet_address\`
💰 **Balance**: ${wallet_balance} SOL
📡 **Network**: Solana Mainnet

📊 **System Metrics**:
🖥️ CPU Usage: ${cpu_usage}%
💾 Memory: ${memory_usage}
💿 Disk Usage: ${disk_usage}
⏱️ Uptime: ${uptime}

🔄 **Deployment Type**: Auto-Update Monitor
🎖️ **All systems operational - Ready for tactical operations!**"
    
    # Send notification using curl (more reliable than node)
    if [ -f ".env" ]; then
        local bot_token=$(grep "BOT_TOKEN=" .env | cut -d'=' -f2)
        local group_id=$(grep "GROUP_ID=" .env | cut -d'=' -f2)
        
        if [ ! -z "$bot_token" ] && [ ! -z "$group_id" ]; then
            curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
                -d "chat_id=${group_id}" \
                -d "parse_mode=Markdown" \
                -d "text=${notification}" \
                -d "disable_web_page_preview=true" \
                >/dev/null 2>&1 && log_success "📱 Notification sent!" || log_error "📱 Failed to send notification"
        else
            log_error "📱 Telegram credentials not configured"
        fi
    else
        log_error "📱 .env file not found"
    fi
}

# Main monitoring loop
monitor_updates() {
    log_success "🔄 Auto-update monitor started (checking every $CHECK_INTERVAL seconds)"
    
    while true; do
        if check_for_updates; then
            if deploy_updates; then
                log_success "🎉 Deployment completed successfully!"
            else
                log_error "💥 Deployment failed!"
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Handle script arguments
case "${1:-monitor}" in
    "monitor")
        monitor_updates
        ;;
    "check")
        if check_for_updates; then
            echo "✅ Updates available"
            exit 0
        else
            echo "📝 Already up to date"
            exit 1
        fi
        ;;
    "deploy")
        if deploy_updates; then
            echo "✅ Deployment successful"
            exit 0
        else
            echo "❌ Deployment failed"
            exit 1
        fi
        ;;
    "test")
        log "🧪 Testing notification system..."
        send_deployment_notification "test123" "Test deployment notification" "Auto-Update Monitor"
        ;;
    *)
        echo "Usage: $0 [monitor|check|deploy|test]"
        echo "  monitor - Start continuous monitoring (default)"
        echo "  check   - Check for updates once"
        echo "  deploy  - Deploy updates once"
        echo "  test    - Test notification system"
        exit 1
        ;;
esac
