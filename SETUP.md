# 🦅 BirdEye Sniper Bot - Configuration Guide

## Quick Start

### 1. Get Your Telegram Bot Token
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Choose a name: `BirdEye Sniper Bot`
4. Choose a username: `@YourBotName_bot`
5. Copy the token provided

### 2. Configure Environment
Edit the `.env` file:
```bash
# Replace with your actual bot token
BOT_TOKEN=123456789:AABBCCDDEEFFgghhiijjkkllmmnnoopp

# Solana wallet configuration (example keys provided)
SOLANA_ADDRESS=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
SOLANA_PRIVATE_KEY=2b1e3f7c8d9a4b6e1f2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c
```

### 3. Start the Bot
```bash
# Run setup (installs PM2 if needed)
./setup.sh

# Start with PM2
npm run pm2

# Check status
pm2 status

# View logs
npm run pm2:logs
```

## Bot Commands & Flow

### User Journey:
1. **Start**: `/start` command
2. **Welcome**: Professional greeting + setup button
3. **Email**: DigitalOcean account email validation
4. **IP Address**: IPv4 address verification
5. **Wallet**: Generate Solana wallet with keys
6. **Complete**: Access to main menu

### Admin Commands:
- View user data: `cat users.json`
- Check bot status: `pm2 status BirdEyeSniperBot`
- Restart bot: `npm run pm2:restart`

## Security Notes

⚠️ **Important Security Practices:**

1. **Environment Variables**: Never commit `.env` to version control
2. **Private Keys**: The example keys are for demo only - use real keys in production
3. **User Data**: `users.json` contains sensitive information - secure appropriately
4. **Server Access**: Restrict access to the server running the bot

## Troubleshooting

### Bot Not Responding
```bash
# Check if bot is running
pm2 status

# Check logs for errors
npm run pm2:logs

# Restart bot
npm run pm2:restart
```

### Common Issues
- **Invalid Token**: Check BOT_TOKEN in .env
- **Permission Denied**: Run `chmod +x setup.sh`
- **Module Not Found**: Run `npm install`
- **PM2 Not Found**: Install with `npm install -g pm2`

## File Structure
```
/root/bird/
├── index.js           # Main bot logic
├── package.json       # Dependencies
├── .env              # Environment variables
├── users.json        # User data storage
├── ecosystem.config.js # PM2 configuration
├── setup.sh          # Setup script
├── logs/             # Log files
└── README.md         # Documentation
```

## Production Deployment

For production deployment:

1. **Server Requirements**: Linux VPS with Node.js 16+
2. **Process Management**: PM2 for auto-restart and monitoring
3. **Security**: Firewall, SSH keys, secure .env file
4. **Monitoring**: PM2 logs and system monitoring
5. **Backup**: Regular backup of users.json

---

🎯 **Ready to dominate the memecoin market!**
