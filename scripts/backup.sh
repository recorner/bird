#!/bin/bash

# 🔄 Backup Script for BirdEye Sniper Bot
# Creates backups of critical data and configurations

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[BACKUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Create backup directory with timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_status "🔄 Creating backup in $BACKUP_DIR..."

# Backup user data
if [ -f "users.json" ]; then
    cp users.json "$BACKUP_DIR/"
    print_success "✅ User data backed up"
fi

# Backup environment configuration (without sensitive data)
if [ -f ".env" ]; then
    # Create sanitized version without keys
    grep -E '^[A-Z_]+(=|\s*=\s*)' .env | \
    sed -E 's/(TOKEN|KEY|PRIVATE_KEY)=.*/\1=***REDACTED***/g' > "$BACKUP_DIR/.env.template"
    print_success "✅ Environment template backed up"
fi

# Backup PM2 configuration
if [ -f "ecosystem.config.js" ]; then
    cp ecosystem.config.js "$BACKUP_DIR/"
    print_success "✅ PM2 configuration backed up"
fi

# Backup logs (last 1000 lines)
if [ -d "logs" ]; then
    mkdir -p "$BACKUP_DIR/logs"
    if [ -f "logs/combined.log" ]; then
        tail -1000 logs/combined.log > "$BACKUP_DIR/logs/combined.log" 2>/dev/null || true
    fi
    if [ -f "logs/err.log" ]; then
        tail -1000 logs/err.log > "$BACKUP_DIR/logs/err.log" 2>/dev/null || true
    fi
    print_success "✅ Recent logs backed up"
fi

# Create backup manifest
cat > "$BACKUP_DIR/backup_info.txt" << EOF
BirdEye Sniper Bot Backup
========================
Backup Date: $(date)
Backup Directory: $BACKUP_DIR
Bot Version: $(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")
Node Version: $(node --version)
PM2 Status: $(pm2 jlist birdeye | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")

Files Included:
- users.json (user data)
- .env.template (sanitized environment)
- ecosystem.config.js (PM2 configuration)
- logs/ (recent log files)

Restore Instructions:
1. Stop bot: pm2 stop birdeye
2. Restore files to main directory
3. Update .env with actual keys
4. Restart bot: pm2 start birdeye
EOF

print_success "✅ Backup manifest created"

# Compress backup
tar -czf "${BACKUP_DIR}.tar.gz" -C backups "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"

print_success "🎯 Backup completed: ${BACKUP_DIR}.tar.gz"

# Keep only last 7 backups
find backups/ -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true

print_status "📦 Backup saved and old backups cleaned up"
