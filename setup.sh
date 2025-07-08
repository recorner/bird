#!/bin/bash

# BirdEye Sniper Bot Setup Script

echo ""
echo "🦅════════════════════════════════════════════════════════════════🦅"
echo "                    BirdEye Sniper Bot Setup                        "
echo "              The Ultimate Memecoin Sniping Solution                "
echo "🦅════════════════════════════════════════════════════════════════🦅"
echo ""

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Check if Node.js is installed
print_header "🔍 Checking System Requirements..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "  CentOS/RHEL: sudo yum install nodejs npm"
    echo "  or visit: https://nodejs.org/"
    echo ""
    exit 1
else
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
fi

# Check if PM2 is installed
print_header "📦 Checking Process Manager..."
if ! command -v pm2 &> /dev/null; then
    print_status "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
    if [ $? -eq 0 ]; then
        print_success "PM2 installed successfully!"
    else
        print_error "Failed to install PM2!"
        exit 1
    fi
else
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 found: $PM2_VERSION"
fi

# Install dependencies
print_header "📦 Installing Bot Dependencies..."
print_status "Installing required packages..."
npm install
if [ $? -eq 0 ]; then
    print_success "All dependencies installed successfully!"
else
    print_error "Failed to install dependencies!"
    exit 1
fi

# Check if .env exists and has bot token
print_header "🔐 Checking Configuration..."
if [ ! -f .env ]; then
    print_error "Configuration file (.env) not found!"
    echo ""
    echo "Please create a .env file with the following structure:"
    echo ""
    echo "BOT_TOKEN=your_telegram_bot_token_here"
    echo "GROUP_ID=your_telegram_group_id_here"
    echo "ADMIN_IDS=your_telegram_user_id_here"
    echo "SOLANA_ADDRESS=your_solana_wallet_address_here"
    echo "SOLANA_PRIVATE_KEY=your_base64_private_key_here"
    echo ""
    exit 1
else
    print_success ".env file found!"
fi

if ! grep -q "BOT_TOKEN=.*[a-zA-Z0-9]" .env; then
    print_error "BOT_TOKEN not configured in .env file!"
    echo ""
    echo "🤖 To get your BOT_TOKEN:"
    echo "   1. Message @BotFather on Telegram"
    echo "   2. Send /newbot command"
    echo "   3. Follow the instructions"
    echo "   4. Copy the token and add it to your .env file"
    echo ""
    exit 1
else
    print_success "BOT_TOKEN configured!"
fi

if ! grep -q "GROUP_ID=.*[0-9]" .env; then
    print_warning "GROUP_ID not configured - group notifications will be disabled"
    echo ""
    echo "📱 To get your GROUP_ID:"
    echo "   1. Add @userinfobot to your Telegram group"
    echo "   2. It will show the group ID (starts with -100)"
    echo "   3. Add it to your .env file as GROUP_ID=-100xxxxxxxxx"
    echo ""
else
    print_success "GROUP_ID configured!"
fi

if ! grep -q "SOLANA_ADDRESS=.*[a-zA-Z0-9]" .env; then
    print_warning "SOLANA_ADDRESS not configured - wallet features will be limited"
else
    print_success "SOLANA_ADDRESS configured!"
fi

# Create logs directory
print_header "📁 Setting up Directory Structure..."
mkdir -p logs
if [ $? -eq 0 ]; then
    print_success "Logs directory created!"
else
    print_warning "Could not create logs directory"
fi

# Setup complete
echo ""
echo "🦅════════════════════════════════════════════════════════════════🦅"
print_success "BirdEye Sniper Bot Setup Complete!"
echo "🦅════════════════════════════════════════════════════════════════🦅"
echo ""

print_header "🚀 Available Commands:"
echo ""
echo "  🟢 Start Bot:"
echo "     npm run pm2:start        # Start with PM2 (recommended)"
echo "     npm start                # Start normally"
echo ""
echo "  📊 Monitor & Control:"
echo "     npm run pm2:logs         # View real-time logs"
echo "     npm run pm2:status       # Check bot status"
echo "     npm run pm2:monit        # Open PM2 monitoring dashboard"
echo ""
echo "  🔄 Management:"
echo "     npm run pm2:restart      # Restart the bot"
echo "     npm run pm2:reload       # Reload without downtime"
echo "     npm run pm2:stop         # Stop the bot"
echo ""
echo "  🛠️ Development:"
echo "     npm run dev              # Start in development mode"
echo "     npm run health           # Run health check"
echo ""

print_header "⚡ Quick Start:"
echo ""
echo "  1. Start the bot:    ${GREEN}npm run pm2:start${NC}"
echo "  2. View logs:        ${GREEN}npm run pm2:logs${NC}"
echo "  3. Check status:     ${GREEN}npm run pm2:status${NC}"
echo ""

print_header "🎯 Next Steps:"
echo ""
echo "  • Test your bot by sending /start in Telegram"
echo "  • Complete the setup process in the bot"
echo "  • Use /sniper command to access tactical operations"
echo "  • Monitor logs for any issues"
echo ""

print_success "Ready for memecoin sniping operations, Commander! 🎖️"
echo ""
