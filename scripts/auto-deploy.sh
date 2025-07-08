#!/bin/bash

# BirdEye Sniper Bot Auto-Deployment Script
# This script automatically deploys the bot when changes are pushed to main branch

set -e  # Exit on any error

# Configuration
REPO_DIR="/root/bird"
BRANCH="main"
BOT_NAME="birdeye"
LOG_FILE="$REPO_DIR/logs/deployment.log"
WEBHOOK_PORT=9000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to send deployment notification
send_notification() {
    local status="$1"
    local message="$2"
    local bot_status="$3"
    local balance="$4"
    local commit_hash="$5"
    
    cd "$REPO_DIR"
    
    # Get system information
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' || echo "N/A")
    local memory_usage=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }' || echo "N/A")
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' || echo "N/A")
    local uptime=$(uptime -p || echo "N/A")
    local hostname=$(hostname || echo "Unknown")
    
    # Get wallet information
    local wallet_address=""
    local wallet_balance=""
    if [ -f ".env" ] && command -v node >/dev/null 2>&1; then
        wallet_info=$(node -e "
            try {
                require('dotenv').config();
                const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
                const bs58 = require('bs58');
                
                async function getWalletInfo() {
                    const privateKey = process.env.PRIVATE_KEY;
                    if (!privateKey) {
                        console.log('WALLET_NOT_CONFIGURED');
                        return;
                    }
                    
                    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
                    const connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');
                    
                    try {
                        const balance = await connection.getBalance(keypair.publicKey);
                        const solBalance = balance / LAMPORTS_PER_SOL;
                        console.log(\`\${keypair.publicKey.toString()}|\${solBalance.toFixed(4)}\`);
                    } catch (error) {
                        console.log(\`\${keypair.publicKey.toString()}|ERROR\`);
                    }
                }
                
                getWalletInfo();
            } catch (error) {
                console.log('WALLET_ERROR');
            }
        " 2>/dev/null || echo "WALLET_ERROR")
        
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
    
    # Create deployment notification with enhanced system info
    local status_emoji="✅"
    local status_text="DEPLOYMENT SUCCESSFUL"
    if [ "$status" != "success" ]; then
        status_emoji="❌"
        status_text="DEPLOYMENT FAILED"
    fi
    
    if [ "$status" = "success" ]; then
        notification="${status_emoji} **${status_text}** ${status_emoji}\n\n"
        notification+="📦 **Application**: BirdEye Sniper Bot\n"
        notification+="🎯 **Branch**: $BRANCH\n"
        notification+="📋 **Commit**: \`$commit_hash\`\n"
        notification+="⏰ **Deployed**: $(date '+%Y-%m-%d %H:%M:%S')\n"
        notification+="🖥️ **Server**: $hostname\n\n"
        
        notification+="🤖 **Bot Status**: $bot_status\n"
        notification+="� **Wallet**: \`$wallet_address\`\n"
        notification+="💰 **Balance**: ${wallet_balance} SOL\n"
        notification+="📡 **Network**: Solana Mainnet\n\n"
        
        notification+="📊 **System Metrics**:\n"
        notification+="🖥️ CPU Usage: ${cpu_usage}%\n"
        notification+="💾 Memory: ${memory_usage}\n"
        notification+="💿 Disk Usage: ${disk_usage}\n"
        notification+="⏱️ Uptime: ${uptime}\n\n"
        
        notification+="🎖️ **All systems operational - Ready for tactical operations!**"
    else
        notification="${status_emoji} **${status_text}** ${status_emoji}\n\n"
        notification+="📦 **Application**: BirdEye Sniper Bot\n"
        notification+="🎯 **Branch**: $BRANCH\n"
        notification+="📋 **Commit**: \`$commit_hash\`\n"
        notification+="⏰ **Failed At**: $(date '+%Y-%m-%d %H:%M:%S')\n"
        notification+="🖥️ **Server**: $hostname\n\n"
        
        notification+="🚨 **Error Details**:\n"
        notification+="\`$message\`\n\n"
        
        notification+="📊 **System Status**:\n"
        notification+="🖥️ CPU: ${cpu_usage}%\n"
        notification+="💾 Memory: ${memory_usage}\n"
        notification+="💿 Disk: ${disk_usage}\n"
        notification+="⏱️ Uptime: ${uptime}\n\n"
        
        notification+="👨‍💻 **Action Required**: Check deployment logs\n"
        notification+="⚡ **Previous version may still be running**"
    fi
    
    # Send notification using curl (more reliable than axios)
    if [ -f ".env" ] && grep -q "BOT_TOKEN" .env && grep -q "GROUP_ID" .env; then
        local bot_token=$(grep "BOT_TOKEN=" .env | cut -d'=' -f2 | tr -d '"')
        local group_id=$(grep "GROUP_ID=" .env | cut -d'=' -f2 | tr -d '"')
        
        if [ ! -z "$bot_token" ] && [ ! -z "$group_id" ]; then
            # Clean the notification message for JSON
            local clean_notification=$(echo "$notification" | sed 's/"/\\"/g' | sed 's/`/\\`/g')
            
            # Send notification with curl
            local response=$(curl -s --connect-timeout 10 --max-time 30 -X POST \
                "https://api.telegram.org/bot${bot_token}/sendMessage" \
                -H "Content-Type: application/json" \
                -d "{
                    \"chat_id\": \"${group_id}\",
                    \"text\": \"${clean_notification}\",
                    \"parse_mode\": \"Markdown\",
                    \"disable_web_page_preview\": true
                }" 2>/dev/null)
            
            if echo "$response" | grep -q '"ok":true'; then
                log_success "✅ Deployment notification sent successfully"
            else
                log_warning "⚠️ Markdown notification failed, trying plain text..."
                
                # Fallback to plain text
                local simple_notification=$(echo "$notification" | sed 's/[*_`\[\]]//g')
                local fallback_response=$(curl -s --connect-timeout 5 --max-time 15 -X POST \
                    "https://api.telegram.org/bot${bot_token}/sendMessage" \
                    -H "Content-Type: application/json" \
                    -d "{
                        \"chat_id\": \"${group_id}\",
                        \"text\": \"${simple_notification}\"
                    }" 2>/dev/null)
                
                if echo "$fallback_response" | grep -q '"ok":true'; then
                    log_success "✅ Plain text notification sent successfully"
                else
                    log_error "❌ Failed to send notification: $(echo "$fallback_response" | jq -r '.description' 2>/dev/null || echo 'Unknown error')"
                fi
            fi
        else
            log_warning "⚠️ Bot token or group ID not configured properly"
        fi
    else
        log_warning "⚠️ .env file not found or missing Telegram configuration"
    fi
}

# Function to get bot status
get_bot_status() {
    if pm2 list | grep -q "$BOT_NAME.*online"; then
        echo "🟢 ONLINE"
    elif pm2 list | grep -q "$BOT_NAME.*stopped"; then
        echo "🔴 STOPPED"
    elif pm2 list | grep -q "$BOT_NAME.*errored"; then
        echo "💥 ERROR"
    else
        echo "❓ UNKNOWN"
    fi
}

# Function to get wallet balance
get_wallet_balance() {
    cd "$REPO_DIR"
    node -e "
        require('dotenv').config();
        const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
        
        async function getBalance() {
            try {
                if (!process.env.SOLANA_ADDRESS) {
                    console.log('0.0000 SOL');
                    return;
                }
                
                const connection = new Connection(
                    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
                    'confirmed'
                );
                
                const publicKey = new PublicKey(process.env.SOLANA_ADDRESS);
                const balance = await connection.getBalance(publicKey);
                const solBalance = balance / LAMPORTS_PER_SOL;
                
                console.log(\`\${solBalance.toFixed(4)} SOL\`);
            } catch (error) {
                console.log('0.0000 SOL');
            }
        }
        
        getBalance();
    " 2>/dev/null || echo "0.0000 SOL"
}

# Main deployment function
deploy() {
    local commit_hash=$(git rev-parse --short HEAD)
    
    log "🚀 Starting auto-deployment for commit $commit_hash"
    
    # Ensure we're in the repo directory
    cd "$REPO_DIR" || {
        log_error "Failed to change to repository directory: $REPO_DIR"
        send_notification "failed" "Repository directory not found" "❓ UNKNOWN" "0.0000 SOL" "$commit_hash"
        exit 1
    }
    
    # Pull latest changes
    log "📥 Pulling latest changes from $BRANCH branch..."
    if ! git pull origin "$BRANCH"; then
        log_error "Failed to pull latest changes"
        send_notification "failed" "Git pull failed" "❓ UNKNOWN" "0.0000 SOL" "$commit_hash"
        exit 1
    fi
    
    # Update commit hash after pull
    commit_hash=$(git rev-parse --short HEAD)
    log "📋 Deploying commit: $commit_hash"
    
    # Install/update dependencies
    log "📦 Installing dependencies..."
    if ! npm ci --production; then
        log_error "Failed to install dependencies"
        send_notification "failed" "Dependency installation failed" "❓ UNKNOWN" "0.0000 SOL" "$commit_hash"
        exit 1
    fi
    
    # Run tests if available
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        log "🧪 Running tests..."
        if ! npm test; then
            log_warning "Tests failed, but continuing deployment"
        fi
    fi
    
    # Stop existing bot instance
    log "⏹️ Stopping existing bot instance..."
    pm2 stop "$BOT_NAME" 2>/dev/null || log_warning "Bot was not running"
    
    # Start bot with new code
    log "▶️ Starting bot with new code..."
    if ! pm2 start ecosystem.config.js; then
        log_error "Failed to start bot"
        send_notification "failed" "Bot startup failed" "💥 ERROR" "0.0000 SOL" "$commit_hash"
        exit 1
    fi
    
    # Wait a moment for bot to initialize
    sleep 5
    
    # Check if bot is running properly
    if pm2 list | grep -q "$BOT_NAME.*online"; then
        log_success "Bot is running successfully"
        
        # Get current status and balance
        local bot_status=$(get_bot_status)
        local balance=$(get_wallet_balance)
        
        # Send success notification
        send_notification "success" "Deployment completed successfully" "$bot_status" "$balance" "$commit_hash"
        
        log_success "🎉 Deployment completed successfully!"
        log "🎖️ Bot Status: $bot_status"
        log "💰 Wallet Balance: $balance"
        
    else
        log_error "Bot failed to start properly"
        send_notification "failed" "Bot failed to start after deployment" "💥 ERROR" "0.0000 SOL" "$commit_hash"
        
        # Try to get error logs
        log_error "Bot error logs:"
        pm2 logs "$BOT_NAME" --lines 10 --nostream | tee -a "$LOG_FILE"
        exit 1
    fi
    
    # Save deployment info
    echo "{
        \"timestamp\": \"$(date -Iseconds)\",
        \"commit\": \"$commit_hash\",
        \"status\": \"success\",
        \"bot_status\": \"$bot_status\",
        \"balance\": \"$balance\"
    }" > "$REPO_DIR/logs/last_deployment.json"
    
    log_success "✅ Auto-deployment completed successfully!"
}

# Webhook handler function
webhook_handler() {
    log "📡 Starting deployment webhook server on port $WEBHOOK_PORT"
    
    # Simple webhook server using netcat
    while true; do
        echo -e "HTTP/1.1 200 OK\nContent-Length: 0\n\n" | nc -l -p "$WEBHOOK_PORT" -q 1 >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            log "🔔 Webhook triggered - starting deployment..."
            deploy
            log "⏳ Waiting for next webhook..."
        fi
        
        sleep 1
    done
}

# Main execution
case "${1:-deploy}" in
    "webhook")
        webhook_handler
        ;;
    "deploy")
        deploy
        ;;
    "status")
        log "📊 Current bot status: $(get_bot_status)"
        log "💰 Current balance: $(get_wallet_balance)"
        ;;
    *)
        echo "Usage: $0 {deploy|webhook|status}"
        echo "  deploy  - Run deployment manually"
        echo "  webhook - Start webhook server for auto-deployment"
        echo "  status  - Check current bot status"
        exit 1
        ;;
esac
