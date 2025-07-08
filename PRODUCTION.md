# 🚀 Production Deployment Guide

## 📋 Quick Start for Production

### Prerequisites
- Ubuntu/Debian server with root access
- Node.js 18+ installed
- PM2 process manager
- Git configured with repository access

### 🔧 Initial Setup

1. **Clone and Setup**
```bash
git clone https://github.com/yourusername/bird.git
cd bird
npm run setup
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your actual values
nano .env
```

3. **Deploy to Production**
```bash
npm run deploy
```

## 🎯 Production Management

### Daily Operations
```bash
# Check bot status
npm run pm2:status

# View live logs
npm run pm2:logs

# Health check
npm run health

# Create backup
npm run backup
```

### Deployment Commands
```bash
# Manual update from GitHub
npm run update

# Full redeploy
npm run deploy

# Emergency restart
npm run pm2:restart
```

## 🔄 Auto-Deployment Setup

### GitHub Actions (Recommended)

1. **Setup Self-Hosted Runner**
```bash
# On your server, install GitHub Actions runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
./config.sh --url https://github.com/yourusername/bird --token YOUR_TOKEN
sudo ./svc.sh install
sudo ./svc.sh start
```

2. **Push to Main Branch**
- Any push to `main` branch automatically deploys
- Tests run first, then zero-downtime deployment
- Health checks ensure deployment success

### Webhook Alternative

1. **Setup Webhook Endpoint**
```bash
# Install webhook listener (optional)
npm install -g webhook
webhook -hooks hooks.json -verbose
```

2. **Configure GitHub Webhook**
- URL: `http://your-server:9000/hooks/deploy`
- Event: `push` to `main` branch
- Script: `scripts/webhook-deploy.sh`

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Automated health check (add to crontab)
*/5 * * * * /root/bird/scripts/health-check.sh >> /root/bird/logs/health.log 2>&1

# Daily backup (add to crontab) 
0 2 * * * /root/bird/scripts/backup.sh >> /root/bird/logs/backup.log 2>&1
```

### Log Management
```bash
# View real-time logs
pm2 logs birdeye --lines 100

# Monitor performance
pm2 monit

# Log rotation (automatic via PM2)
pm2 install pm2-logrotate
```

### Performance Tuning
```bash
# Memory optimization
pm2 restart birdeye --max-memory-restart 1G

# CPU optimization  
pm2 scale birdeye +1  # Add instance if needed
```

## 🛡️ Security Best Practices

### Environment Security
- Never commit `.env` files
- Use strong tokens and keys
- Regular key rotation
- Firewall configuration

### Server Security
```bash
# Firewall setup
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Fail2ban for SSH protection
apt install fail2ban
systemctl enable fail2ban
```

### Bot Security
- Regular health checks
- Automated backups
- Error monitoring
- Access control validation

## 🚨 Troubleshooting

### Common Issues

1. **Bot Not Starting**
```bash
# Check PM2 status
pm2 status birdeye

# Check logs for errors
pm2 logs birdeye --err

# Restart with debug
NODE_ENV=development pm2 restart birdeye
```

2. **Memory Issues**
```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart birdeye --max-memory-restart 800M
```

3. **Deployment Failures**
```bash
# Check deployment logs
tail -f logs/deployments.log

# Manual health check
./scripts/health-check.sh

# Force restart
pm2 delete birdeye && pm2 start ecosystem.config.js
```

### Emergency Recovery
```bash
# Stop bot
pm2 stop birdeye

# Restore from backup
tar -xzf backups/YYYYMMDD_HHMMSS.tar.gz
cp YYYYMMDD_HHMMSS/* .

# Update environment
nano .env

# Restart
pm2 start ecosystem.config.js
```

## 📈 Performance Monitoring

### Key Metrics
- Bot uptime: `pm2 status birdeye`
- Memory usage: `pm2 monit`
- Error rate: `tail logs/err.log`
- Response time: Bot command latency

### Alerting Setup
```bash
# Install PM2 monitoring (optional)
pm2 install pm2-server-monit

# Setup email alerts
npm install -g pm2-email
pm2 set pm2-email:email your-email@domain.com
```

## 🔄 Backup & Recovery

### Automated Backups
- Daily backups via cron
- 7-day retention policy
- Compressed storage
- Critical data only

### Manual Backup
```bash
npm run backup
```

### Recovery Process
1. Stop bot: `pm2 stop birdeye`
2. Restore files from backup
3. Update `.env` with actual credentials
4. Restart: `pm2 start ecosystem.config.js`
5. Verify: `npm run health`

---

## 📞 Support

For production issues:
1. Check logs: `pm2 logs birdeye`
2. Run health check: `npm run health`
3. Create backup: `npm run backup`
4. Contact support with logs and error details
