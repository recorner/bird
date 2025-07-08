#!/bin/bash

# BirdEye Sniper Bot Setup Script

echo "🦅 BirdEye Sniper Bot Setup"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists and has bot token
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

if ! grep -q "BOT_TOKEN=.*[a-zA-Z0-9]" .env; then
    echo "⚠️  Please configure your BOT_TOKEN in .env file"
    echo "   Get your token from @BotFather on Telegram"
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the bot:"
echo "   npm run pm2"
echo ""
echo "📊 To view logs:"
echo "   npm run pm2:logs"
echo ""
echo "🔄 To restart:"
echo "   npm run pm2:restart"
echo ""
echo "⏹️  To stop:"
echo "   npm run pm2:stop"
