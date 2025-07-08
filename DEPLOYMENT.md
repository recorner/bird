# 🚀 BirdEye Sniper Bot - Deployment Guide

## 📋 Overview

This guide covers the automated deployment system for BirdEye Sniper Bot, including manual deployment, webhook-based auto-deployment, and GitHub Actions integration.

## 🛠️ Deployment Methods

### 1. Manual Deployment

```bash
# Quick deployment
npm run deploy

# Check deployment status
npm run deploy:status

# Start webhook server for auto-deployment
npm run deploy:webhook
```

### 2. GitHub Actions (Recommended)

The bot includes a GitHub Actions workflow that automatically deploys when code is pushed to the `main` branch.

#### Setup GitHub Actions:

1. **Add your server as a self-hosted runner:**
   ```bash
   # On your server, go to GitHub repo Settings > Actions > Runners
   # Follow the instructions to add a self-hosted runner
   ```

2. **Ensure your server has the required dependencies:**
   ```bash
   # PM2 for process management
   npm install -g pm2
   
   # Make sure git, node, and npm are installed
   node --version
   npm --version
   git --version
   ```

3. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Deploy updates"
   git push origin main
   ```

The workflow will automatically:
- Pull latest code
- Install dependencies
- Run tests (if available)
- Stop old bot instance
- Start new bot instance
- Perform health checks
- Send deployment notifications

### 3. Webhook Deployment

For webhook-based deployment (useful for other Git platforms):

```bash
# Start webhook server
npm run deploy:webhook

# The server listens on port 9000
# Configure your Git platform to send webhooks to:
# http://your-server:9000
```

## 📱 Deployment Notifications

After successful deployment, the system automatically sends a comprehensive notification to your Telegram group including:

### ✅ Success Notification
```
🚀 **DEPLOYMENT SUCCESSFUL** 🚀

✅ Status: DEPLOYMENT COMPLETED
🎯 Branch: main
📋 Commit: abc1234
⏰ Time: 2025-07-08 17:45:30

🤖 Bot Status: 🟢 ONLINE
💰 Wallet Balance: 1.2345 SOL ($187.65)
📡 Network: Solana Mainnet

System Information:
• Uptime: 2 hours, 15 minutes
• Memory: 245MB/512MB
• Disk: 8.2GB/20GB (41% used)

🎖️ All systems operational - Ready for tactical operations!
```

### ❌ Failure Notification
```
💥 **DEPLOYMENT FAILED** 💥

❌ Status: DEPLOYMENT ERROR
🎯 Branch: main
📋 Commit: abc1234
⏰ Time: 2025-07-08 17:45:30

🚨 Error Details:
`Bot failed to start after deployment`

👨‍💻 Action Required: Check deployment logs
📞 Contact: System administrator

⚡ Previous version may still be running
```

## 🔧 Configuration

### Environment Variables

Ensure your `.env` file is properly configured:

```env
# Required for deployment notifications
BOT_TOKEN=your_telegram_bot_token
GROUP_ID=your_telegram_group_id
ADMIN_IDS=your_admin_user_ids

# Required for wallet balance reporting
SOLANA_RPC_URL=your_solana_rpc_endpoint
SOLANA_ADDRESS=your_wallet_address
SOLANA_PRIVATE_KEY=your_base64_private_key
```

### PM2 Ecosystem Configuration

The `ecosystem.config.js` file is automatically used for deployment:

```javascript
module.exports = {
  apps: [{
    name: 'birdeye',
    script: 'index.js',
    // ... other PM2 configurations
  }]
};
```

## 📊 Monitoring Deployment

### Check Bot Status
```bash
# Quick status check
npm run deploy:status

# Detailed PM2 status
npm run pm2:status

# View logs
npm run pm2:logs

# Monitor in real-time
npm run pm2:monit
```

### Deployment Logs
```bash
# View deployment logs
tail -f logs/deployment.log

# View detailed deployment logs
tail -f logs/deployment_detailed.log

# View last deployment info
cat logs/last_deployment.json
```

## 🛡️ Security Considerations

### 1. Environment Protection
- Never commit `.env` files to version control
- Use secure channels to deploy sensitive configuration
- Rotate API keys and tokens regularly

### 2. Access Control
- Limit GitHub Actions runner access
- Use secure webhook endpoints
- Monitor deployment logs for unauthorized access

### 3. Backup Strategy
```bash
# Backup before deployment
cp .env .env.backup
cp users.json users.json.backup

# Restore if needed
cp .env.backup .env
cp users.json.backup users.json
```

## 🔄 Rollback Procedures

### Quick Rollback
```bash
# Stop current version
pm2 stop birdeye

# Checkout previous commit
git checkout HEAD~1

# Deploy previous version
npm run deploy
```

### Manual Rollback
```bash
# Find previous working commit
git log --oneline -10

# Checkout specific commit
git checkout <commit-hash>

# Force deployment
npm run deploy
```

## 📈 Deployment Best Practices

### 1. Pre-Deployment Checklist
- [ ] Test changes locally
- [ ] Verify configuration files
- [ ] Check wallet balance and access
- [ ] Ensure backup of critical data
- [ ] Notify users of potential downtime

### 2. Post-Deployment Verification
- [ ] Verify bot is responding to commands
- [ ] Check monitoring is active
- [ ] Confirm group notifications work
- [ ] Test critical bot functions
- [ ] Monitor logs for errors

### 3. Scheduled Deployments
```bash
# Use cron for scheduled deployments
# Example: Deploy every Sunday at 2 AM
0 2 * * 0 cd /root/bird && npm run deploy
```

## 🚨 Troubleshooting

### Common Issues

1. **Bot fails to start after deployment:**
   ```bash
   # Check PM2 logs
   pm2 logs birdeye --lines 50
   
   # Check configuration
   node -c index.js
   
   # Verify dependencies
   npm ci --production
   ```

2. **Notifications not working:**
   ```bash
   # Test bot token
   curl -X GET "https://api.telegram.org/bot$BOT_TOKEN/getMe"
   
   # Verify group ID
   echo $GROUP_ID
   
   # Check network connectivity
   ping api.telegram.org
   ```

3. **Deployment hangs:**
   ```bash
   # Kill hanging processes
   pm2 kill
   
   # Clean npm cache
   npm cache clean --force
   
   # Restart deployment
   npm run deploy
   ```

### Emergency Procedures

**If deployment breaks the bot:**
```bash
# Emergency stop
pm2 stop all

# Quick rollback
git checkout HEAD~1
npm ci --production
pm2 start ecosystem.config.js

# Verify recovery
npm run deploy:status
```

## 📞 Support

For deployment issues:
1. Check deployment logs: `tail -f logs/deployment.log`
2. Review PM2 logs: `pm2 logs birdeye`
3. Verify system resources: `htop` or `npm run deploy:status`
4. Contact system administrator with error details

---

**Ready for automated tactical deployments! 🎖️**
