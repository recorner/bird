# 🦅 BirdEye Sniper Bot

**The Ultimate Memecoin Copy-Trading Telegram Bot**

A sophisticated, modular Telegram bot for real-time wallet monitoring and memecoin sniping on the Solana blockchain. Built with military-grade precision and reliability.

## ✨ Features

- 🎯 **Real-time Wallet Monitoring** - Track multiple wallets simultaneously
- ⚡ **Lightning-fast Notifications** - Instant alerts for all transactions  
- 💰 **Balance Change Detection** - Monitor SOL and token balance changes
- 🔍 **Transaction Analysis** - Detailed breakdown of all wallet activities
- 🛡️ **Military-grade Security** - End-to-end encrypted communications
- 📊 **Advanced Analytics** - Comprehensive trading insights
- 🎮 **Intuitive Interface** - Easy-to-use Telegram commands
- 🔄 **Auto-deployment** - CI/CD pipeline with health monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PM2 (for production)
- Telegram Bot Token
- Solana RPC endpoint

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd bird

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run setup script
./setup.sh

# Start bot
npm start
```

## 📁 Project Structure

```
bird/
├── index.js                 # Main entry point
├── src/
│   ├── bot.js              # Core bot class
│   ├── config/
│   │   └── config.js       # Configuration management
│   ├── modules/
│   │   ├── userDataManager.js      # User data handling
│   │   ├── solanaManager.js        # Solana blockchain interface
│   │   ├── notificationManager.js  # Telegram notifications
│   │   ├── walletMonitor.js        # Real-time monitoring
│   │   └── healthCheckService.js   # System health monitoring
│   ├── handlers/
│   │   ├── setupHandler.js         # User setup & onboarding
│   │   └── sniperHandler.js        # Sniper operations
│   └── utils/
│       └── errorHandler.js         # Error handling & logging
├── scripts/
│   ├── auto-deploy.sh      # Auto-deployment script
│   ├── backup.sh           # Backup utilities
│   ├── health-check.sh     # Health monitoring
│   └── webhook-deploy.sh   # Webhook deployment
├── .github/
│   └── workflows/
│       └── auto-deploy.yml # GitHub Actions CI/CD
├── logs/                   # Application logs
├── package.json
├── ecosystem.config.js     # PM2 configuration
└── README.md
```

## 🛠️ Configuration

### Environment Variables (.env)
```bash
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
GROUP_ID=your_telegram_group_id
ADMIN_IDS=admin_user_id_1,admin_user_id_2

# Solana Configuration  
PRIVATE_KEY=your_base64_encoded_private_key
RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Optional Settings
NODE_ENV=production
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=21600000
```

## 📱 Bot Commands

### User Commands
- `/start` - Initialize bot setup
- `/sniper` - Access sniper command center (authorized users)
- `/status` - View system status
- `/help` - Show help information

### Admin Commands  
- `/wallet` - View wallet information (super admin)
- `/health` - System health check (admin)

## 🎯 Sniper Features

- **Real-time Monitoring** - Track wallet activities instantly
- **Balance Alerts** - Get notified of all balance changes
- **Transaction Details** - Full transaction analysis
- **Multi-wallet Support** - Monitor multiple addresses
- **Custom Notifications** - Personalized alert settings

## 🔧 Deployment

### Development
```bash
npm run dev
```

### Production with PM2
```bash
npm run pm2:start
```

### Auto-deployment
The bot includes automatic deployment via GitHub Actions:

1. Push to `main` branch triggers deployment
2. System health check performed
3. Telegram notifications sent with:
   - Deployment status
   - System metrics (CPU, memory, disk)
   - Wallet information
   - Bot status

### Manual Deployment
```bash
./scripts/auto-deploy.sh deploy
```

## 📊 Monitoring

### Health Checks
- Automatic health monitoring every 6 hours
- System metrics tracking
- Performance monitoring
- Error detection and reporting

### Logging
- Comprehensive logging system
- Error tracking and reporting  
- Performance metrics
- Audit trails

## 🔐 Security Features

- **Encrypted Private Keys** - Secure key storage
- **Admin Access Control** - Multi-level authorization
- **Audit Logging** - Complete activity tracking
- **Rate Limiting** - Anti-spam protection
- **Input Validation** - SQL injection prevention

## 🚨 Important Security Notes

1. **Private Key Security**: Store your private key securely and never share it
2. **Admin Access**: Only authorized users can access sensitive commands
3. **Environment Variables**: Keep your .env file private and secure
4. **Regular Backups**: Backup your configuration and user data regularly

## 📈 Performance

- **Real-time Processing** - Sub-second response times
- **Scalable Architecture** - Modular design for easy scaling
- **Memory Efficient** - Optimized for long-running operations
- **Error Recovery** - Automatic error handling and recovery

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Check the logs in the `logs/` directory
- Run health check: `npm run health`
- Contact your system administrator

---

**⚠️ Disclaimer**: This bot is for educational and research purposes. Always comply with applicable laws and regulations when trading cryptocurrencies. Use at your own risk.
