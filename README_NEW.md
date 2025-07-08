# 🦅 BirdEye Sniper Bot - Enhanced Solana Wallet Monitor

An advanced Telegram bot for monitoring Solana wallets with automatic balance detection, transaction notifications, and admin-controlled fund transfers.

## 🚀 Features

### 💰 Wallet Monitoring
- **Real-time Balance Tracking**: Monitors Solana wallets every 30 seconds
- **Instant Notifications**: Get notified immediately when funds are received
- **Transaction Details**: Full transaction information with Helius API integration
- **USD Conversion**: All amounts displayed in both SOL and USD

### 🔄 Automated Fund Management
- **Auto-send**: Automatically sends funds to default address after 30 minutes
- **Manual Control**: Admin-only manual send with percentage or custom amounts
- **Smart Confirmations**: Multi-step confirmation process for security

### 👮‍♂️ Admin Controls
- **Admin-only Actions**: Only specified admins can control fund transfers
- **Group Notifications**: All activities posted to designated Telegram group
- **Flexible Amounts**: Send 25%, 50%, 75%, or custom amounts

### 🛡️ Security Features
- **Private Key Protection**: Secure storage and handling of wallet keys
- **Multi-step Confirmation**: Confirm recipient and amount before sending
- **Admin Verification**: All sensitive actions require admin privileges

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Telegram Bot Token** (from @BotFather)
3. **Solana Wallet** with private key
4. **Helius API Key** (optional, for enhanced transaction details)

## 🔧 Installation

1. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd bird
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

3. **Configure Environment Variables**
   Edit `.env` file with your values:
   ```env
   # Telegram Configuration
   BOT_TOKEN=your_telegram_bot_token
   GROUP_ID=-1001234567890          # Your Telegram group ID
   ADMIN_IDS=123456789,987654321    # Comma-separated admin user IDs
   
   # Solana Configuration
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   SOLANA_ADDRESS=your_wallet_address
   SOLANA_PRIVATE_KEY=your_base64_private_key
   
   # Optional: Helius API for enhanced transaction details
   HELIUS_API_KEY=your_helius_api_key
   
   # Data Storage
   DATA_FILE=users.json
   ```

## 🚀 Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using PM2 (Recommended for Production)
```bash
npm run pm2        # Start with PM2
npm run pm2:logs   # View logs
npm run pm2:stop   # Stop the bot
npm run pm2:restart # Restart the bot
```

## 📱 Bot Commands

### Admin Commands
- `/wallet` - View wallet status and management options
- `/start` - Initialize bot setup

### Admin Actions in Groups
When funds are detected:
1. **Notification**: Bot posts deposit notification to group
2. **Send Options**: Click "Yes, Send Funds" to initiate transfer
3. **Recipient**: Enter destination address
4. **Amount Selection**: Choose 25%, 50%, 75%, or custom amount
5. **Confirmation**: Final confirmation before sending

## 🔄 Wallet Monitoring Flow

1. **Balance Detection**: Bot checks wallets every 30 seconds
2. **Deposit Alert**: Immediate notification when funds received (>0.001 SOL)
3. **Transaction Details**: Fetches and displays transaction information
4. **User Interaction**: Admins can choose to send funds or ignore
5. **Auto-send**: After 30 minutes, funds automatically sent to default address

## 🔐 Security Best Practices

1. **Private Key Storage**: Never commit private keys to version control
2. **Admin Verification**: Only trusted users should be added as admins
3. **Group Security**: Ensure your Telegram group is private
4. **RPC Security**: Use secure RPC endpoints
5. **Regular Monitoring**: Monitor bot logs for suspicious activity

## 🐛 Troubleshooting

### Common Issues

1. **Bot Not Responding**
   - Check BOT_TOKEN is correct
   - Verify bot is added to group with admin permissions

2. **Wallet Monitoring Not Working**
   - Verify SOLANA_ADDRESS is valid
   - Check RPC endpoint connectivity
   - Ensure sufficient RPC rate limits

3. **Transaction Failures**
   - Check wallet has sufficient balance for fees
   - Verify recipient address is valid
   - Ensure private key is correctly formatted

4. **Permission Errors**
   - Verify user ID is in ADMIN_IDS
   - Check group permissions

### Debug Mode
Set `NODE_ENV=development` for detailed logging:
```bash
NODE_ENV=development npm run dev
```

## 📊 Monitoring & Logs

### PM2 Logs
```bash
npm run pm2:logs
```

### Log Files
- Monitor logs for wallet activity
- Check for RPC connection issues
- Track transaction successes/failures

## 📜 License

MIT License - See LICENSE file for details

---

**⚠️ Warning**: This bot handles real cryptocurrency transactions. Always test thoroughly with small amounts before using in production. Keep your private keys secure and never share them with unauthorized parties.
