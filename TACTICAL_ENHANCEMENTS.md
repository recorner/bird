# 🎯 Enhanced BirdEye Sniper Bot - Tactical Command Center

## ✅ New Features Implemented

### 🛡️ **Enhanced Admin System**
- **Group Admin Detection**: Bot now automatically detects Telegram group admins
- **Dual Authorization**: Users can be authorized either through ADMIN_IDS OR by being group admins
- **Dynamic Updates**: Group admin list refreshes automatically

### 🎯 **Sniper Command Center**
- **New Command**: `/sniper` - Launches the tactical command interface
- **Professional Interface**: Military-themed messaging (without offensive content)
- **Command Dashboard**: Complete overview of operations and status
- **Quick Actions**: Force status updates, intel reports, system config

### 📡 **Auto Status Updates**
- **Regular Reports**: Bot sends status updates every 3 hours
- **Operational Intelligence**: Shows uptime, monitored wallets, SOL price
- **Mission Status**: Confirms all systems operational

### 🎖️ **Tactical Messaging Theme**
- **Professional Military Style**: "Commander", "Operative", "Target", "Deploy"
- **Mission-focused Language**: "Execute Deployment", "Target Acquired", etc.
- **Status Reports**: Tactical intelligence and operational status
- **Clean & Professional**: No offensive or inappropriate terminology

## 🎮 Bot Commands

### Admin Commands
- `/start` - Initialize bot setup
- `/wallet` - Tactical wallet operations center  
- `/sniper` - **NEW** - Main command center dashboard

### Sniper Menu Options
- 💳 **WALLET OPERATIONS** - Direct access to wallet management
- 📊 **INTEL REPORT** - Detailed operational intelligence
- ⚙️ **SYSTEM CONFIG** - Configuration options
- 🎯 **ACTIVE TARGETS** - View monitored wallets
- 📡 **FORCE STATUS UPDATE** - Manual status broadcast
- 🔄 **REFRESH COMMAND CENTER** - Reload dashboard

## 🔐 Authorization System

### Who Can Access Admin Features:
1. **Environment ADMIN_IDS**: Users listed in ADMIN_IDS environment variable
2. **Group Admins**: Anyone who is an admin in the configured Telegram group
3. **Automatic Detection**: Bot automatically detects group admin changes

### Current Configuration:
```env
ADMIN_IDS=7904666227,7081512132,6445942795
GROUP_ID=-1002345678901  # You need to set your actual group ID
```

## 📡 Status Updates

### Every 3 Hours, Bot Sends:
- Operational status confirmation
- Number of wallets being monitored
- Current uptime
- SOL price
- System health check
- "Still sniping" confirmation

## 🎯 Tactical Messaging Examples

### Deposit Detection:
```
🚨 TARGET ACQUIRED 🚨
💳 WALLET: 4e43fRY...
📈 INCOMING ASSETS: 2.5000 SOL ($425.50)
💰 NEW BALANCE: 2.5000 SOL ($425.50)
⏰ TIMESTAMP: 2025-07-08 15:30:22

🔍 ANALYZING TRANSACTION DATA...
```

### Deployment Confirmation:
```
✅ DEPLOYMENT SUCCESSFUL ✅
💳 SOURCE: 4e43fRY...
📮 TARGET: 9x8wE2...
💰 ASSETS DEPLOYED: 1.2500 SOL ($212.75)
🔗 OPERATION ID: 5x7nQ3p...
⏰ TIMESTAMP: 2025-07-08 15:35:45

MISSION ACCOMPLISHED, Commander!
```

### Status Updates:
```
🎯 SNIPER STATUS REPORT 🎯
⚡ OPERATIONAL STATUS: ACTIVE
👁️ WALLETS MONITORED: 1
⏱️ UPTIME: 3 hours
💰 SOL PRICE: $170.22
🔍 SCANNING FREQUENCY: Every 30 seconds

📊 SYSTEM STATUS: All systems operational, Commander!
🎯 MISSION: Continuous wallet surveillance active

Next status report in 3 hours...
```

## 🚀 How to Use

1. **Set Group ID**: Update GROUP_ID in .env with your actual Telegram group ID
2. **Start Bot**: `npm run pm2`
3. **Use `/sniper`**: Access the tactical command center
4. **Monitor Operations**: Bot will send status updates every 3 hours

## 🔧 Final Configuration Needed

1. **Get Your Group ID**:
   - Add @userinfobot to your Telegram group
   - Copy the group ID (starts with -100)
   - Update GROUP_ID in .env file

2. **Test the Bot**:
   ```bash
   npm run dev  # Test in development
   npm run pm2  # Deploy to production
   ```

3. **Verify Admin Access**:
   - Use `/sniper` command in your group
   - Confirm group admins can access features

Your enhanced BirdEye Sniper Bot is now ready with professional tactical theming, group admin detection, and comprehensive command center functionality! 🎯
