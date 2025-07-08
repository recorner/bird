#!/bin/bash

# 🦅 BirdEye Sniper Bot - Enhanced Setup Script

echo "🦅 BirdEye Sniper Bot - Enhanced Solana Wallet Monitor Setup"
echo "=============================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    
    echo ""
    echo "🔧 IMPORTANT: Please edit the .env file with your actual values:"
    echo "   - BOT_TOKEN: Your Telegram bot token from @BotFather"
    echo "   - GROUP_ID: Your Telegram group ID (e.g., -1001234567890)"
    echo "   - ADMIN_IDS: Comma-separated admin user IDs"
    echo "   - SOLANA_ADDRESS: Your Solana wallet address"
    echo "   - SOLANA_PRIVATE_KEY: Your wallet's private key (base64 encoded)"
    echo "   - HELIUS_API_KEY: (Optional) Your Helius API key"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create users.json if it doesn't exist
if [ ! -f users.json ]; then
    echo "{}" > users.json
    echo "✅ users.json file created"
fi

# Create logs directory
mkdir -p logs
echo "✅ logs directory created"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file with your actual values: nano .env"
echo "   2. Test the bot: npm run dev"
echo "   3. Start in production: npm run pm2"
echo ""
echo "📚 Additional commands:"
echo "   - View logs: npm run pm2:logs"
echo "   - Stop bot: npm run pm2:stop"
echo "   - Restart bot: npm run pm2:restart"
echo ""
echo "⚠️  Security reminders:"
echo "   - Never share your private keys"
echo "   - Keep your .env file secure"
echo "   - Only add trusted users as admins"
echo "   - Test with small amounts first"
echo ""
echo "🦅 Happy sniping!"
