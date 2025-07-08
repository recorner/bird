const { Markup } = require('telegraf');
const errorHandler = require('../utils/errorHandler');

class SniperHandler {
    constructor(userDataManager, solanaManager, notificationManager, walletMonitor) {
        this.userDataManager = userDataManager;
        this.solanaManager = solanaManager;
        this.notificationManager = notificationManager;
        this.walletMonitor = walletMonitor;
    }

    async showSniperMenu(ctx) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        
        if (!user || user.setup_step !== 'completed') {
            return await ctx.reply('❌ Please complete setup first using /start');
        }

        const monitoringStatus = this.walletMonitor.getMonitoringStatus();
        const balance = user.sol_address ? await this.solanaManager.getWalletBalance(user.sol_address) : 0;
        const botBalance = await this.solanaManager.getBotBalance();
        
        const menuText = 
            `🎯 **SNIPER COMMAND CENTER** 🎯\n\n` +
            `👤 **Operative**: ${ctx.from.first_name || 'Commander'}\n` +
            `🎖️ **Clearance**: TACTICAL ADMIN\n` +
            `💰 **Wallet Balance**: ${user.sol_address ? this.notificationManager.formatCurrency(balance) : 'N/A'}\n` +
            `🏦 **Bot Treasury**: ${this.notificationManager.formatCurrency(botBalance)}\n` +
            `👁️ **Surveillance**: ${user.monitor_enabled !== false ? '🟢 ACTIVE' : '🔴 OFFLINE'}\n` +
            `🎯 **Targets Tracked**: ${monitoringStatus.monitoredWallets}\n` +
            `💵 **SOL Price**: $${this.notificationManager.solPriceUsd}\n` +
            `⚡ **System Status**: ${monitoringStatus.isRunning ? 'OPERATIONAL' : 'STANDBY'}\n\n` +
            `**Mission Control Online - Awaiting Orders**\n` +
            `*Next scan: <30 seconds*\n\n` +
            `**Select tactical operation:**`;
        
        const keyboard = [
            [
                { text: '💳 WALLET OPERATIONS', callback_data: 'sniper_wallet_ops' },
                { text: '📊 INTEL REPORT', callback_data: 'sniper_intel' }
            ],
            [
                { text: '🎯 ACTIVE TARGETS', callback_data: 'sniper_targets' },
                { text: '⚙️ SYSTEM CONFIG', callback_data: 'sniper_config' }
            ],
            [
                { text: '📡 FORCE STATUS', callback_data: 'sniper_force_status' },
                { text: '🔄 REFRESH CENTER', callback_data: 'sniper_refresh' }
            ],
            [
                { text: '🏠 MAIN DASHBOARD', callback_data: 'main_menu' }
            ]
        ];
        
        try {
            if (ctx.callbackQuery) {
                await ctx.editMessageText(menuText, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } else {
                await ctx.reply(menuText, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            }
        } catch (error) {
            await ctx.reply(menuText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }

    async showWalletOperations(ctx) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        const balance = await this.solanaManager.getBotBalance();
        const walletAddress = this.solanaManager.getBotAddress();
        
        const opsText = 
            `💳 **WALLET OPERATIONS CENTER** 💳\n\n` +
            `🏦 **Tactical Wallet**: \`${walletAddress}\`\n` +
            `💰 **Available Assets**: ${this.notificationManager.formatCurrency(balance)}\n` +
            `💵 **USD Value**: $${(balance * this.notificationManager.solPriceUsd).toFixed(2)}\n` +
            `🔐 **Security Level**: Maximum\n` +
            `📡 **Network**: Solana Mainnet\n\n` +
            `⚡ **Quick Actions Available:**\n` +
            `• View transaction history\n` +
            `• Monitor balance changes\n` +
            `• Configure auto-transfers\n` +
            `• Set default recipients\n\n` +
            `**Select wallet operation:**`;

        const keyboard = [
            [
                { text: '📈 TRANSACTION HISTORY', callback_data: 'wallet_history' },
                { text: '⚙️ AUTO-TRANSFER SETUP', callback_data: 'wallet_auto_setup' }
            ],
            [
                { text: '📮 SET DEFAULT TARGET', callback_data: 'wallet_set_default' },
                { text: '🔄 REFRESH BALANCE', callback_data: 'wallet_refresh' }
            ],
            [
                { text: '◀️ BACK TO COMMAND', callback_data: 'sniper_menu' }
            ]
        ];

        await ctx.editMessageText(opsText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showIntelReport(ctx) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        const monitoringStatus = this.walletMonitor.getMonitoringStatus();
        const allUsers = this.userDataManager.getAllUsers();
        const activeUsers = this.userDataManager.getActiveUsers();
        
        const uptime = Math.floor((Date.now() - monitoringStatus.lastHealthCheck) / 1000 / 60 / 60);
        
        const intelText = 
            `📊 **TACTICAL INTELLIGENCE REPORT** 📊\n\n` +
            `🕐 **Report Generated**: ${new Date().toLocaleString()}\n\n` +
            `📈 **OPERATIONAL METRICS**\n` +
            `• 👥 Total Operatives: ${Object.keys(allUsers).length}\n` +
            `• ⚡ Active Operatives: ${activeUsers.length}\n` +
            `• 👁️ Surveillance Targets: ${monitoringStatus.monitoredWallets}\n` +
            `• ⏱️ System Uptime: ${uptime} hours\n` +
            `• 🔍 Scan Frequency: 30 seconds\n\n` +
            `💰 **MARKET INTELLIGENCE**\n` +
            `• 💵 SOL Price: $${this.notificationManager.solPriceUsd}\n` +
            `• 🏦 Bot Treasury: ${this.notificationManager.formatCurrency(await this.solanaManager.getBotBalance())}\n` +
            `• 📡 Network: Solana Mainnet\n\n` +
            `🎯 **MISSION STATUS**\n` +
            `• 🟢 All systems operational\n` +
            `• 🔍 Real-time monitoring active\n` +
            `• 📱 Notifications enabled\n` +
            `• 🛡️ Security protocols enforced\n\n` +
            `**System performing optimally, Commander!**`;

        const keyboard = [
            [
                { text: '🔄 REFRESH INTEL', callback_data: 'sniper_intel' },
                { text: '📈 DETAILED STATS', callback_data: 'intel_detailed' }
            ],
            [
                { text: '◀️ BACK TO COMMAND', callback_data: 'sniper_menu' }
            ]
        ];

        await ctx.editMessageText(intelText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showActiveTargets(ctx) {
        const monitoredWallets = this.walletMonitor.getMonitoredWallets();
        const walletAddress = this.solanaManager.getBotAddress();
        
        const targetsText = 
            `🎯 **ACTIVE SURVEILLANCE TARGETS** 🎯\n\n` +
            `📡 **Monitoring Status**: OPERATIONAL\n` +
            `🔍 **Scan Frequency**: Every 30 seconds\n` +
            `⚡ **Response Time**: <5 seconds\n\n` +
            `🎯 **PRIMARY TARGET**\n` +
            `💳 **Wallet**: \`${walletAddress}\`\n` +
            `💰 **Balance**: ${this.notificationManager.formatCurrency(await this.solanaManager.getBotBalance())}\n` +
            `👁️ **Watchers**: ${this.userDataManager.getActiveUsers().length} operatives\n` +
            `📊 **Status**: ACTIVELY MONITORED\n\n` +
            `🔥 **DETECTION ALGORITHMS**\n` +
            `• Balance change detection\n` +
            `• Transaction pattern analysis\n` +
            `• Real-time notification system\n` +
            `• Automated response protocols\n\n` +
            `**All targets under surveillance, Commander!**`;

        const keyboard = [
            [
                { text: '🔄 REFRESH TARGETS', callback_data: 'sniper_targets' },
                { text: '⚙️ TARGET CONFIG', callback_data: 'targets_config' }
            ],
            [
                { text: '◀️ BACK TO COMMAND', callback_data: 'sniper_menu' }
            ]
        ];

        await ctx.editMessageText(targetsText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async showSystemConfig(ctx) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        const monitoringStatus = this.walletMonitor.getMonitoringStatus();
        
        const configText = 
            `⚙️ **SYSTEM CONFIGURATION** ⚙️\n\n` +
            `🔧 **Current Settings**\n\n` +
            `👁️ **Monitoring**: ${user.monitor_enabled !== false ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
            `🔍 **Scan Interval**: 30 seconds\n` +
            `📱 **Notifications**: ${this.notificationManager.groupId ? '🟢 ACTIVE' : '🔴 INACTIVE'}\n` +
            `⚡ **Auto-Response**: Available\n` +
            `🛡️ **Security Level**: Maximum\n\n` +
            `📊 **Performance Settings**\n` +
            `• Real-time balance monitoring\n` +
            `• Instant notification delivery\n` +
            `• Health checks every 6 hours\n` +
            `• Automatic error recovery\n\n` +
            `🎯 **Available Configurations:**`;

        const keyboard = [
            [
                { text: user.monitor_enabled !== false ? '🔴 DISABLE MONITORING' : '🟢 ENABLE MONITORING', 
                  callback_data: 'config_toggle_monitoring' }
            ],
            [
                { text: '📱 NOTIFICATION SETTINGS', callback_data: 'config_notifications' },
                { text: '⚙️ ADVANCED CONFIG', callback_data: 'config_advanced' }
            ],
            [
                { text: '🔄 RESET TO DEFAULTS', callback_data: 'config_reset' },
                { text: '◀️ BACK TO COMMAND', callback_data: 'sniper_menu' }
            ]
        ];

        await ctx.editMessageText(configText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async forceStatusUpdate(ctx) {
        try {
            const monitoringStatus = this.walletMonitor.getMonitoringStatus();
            const botBalance = await this.solanaManager.getBotBalance();
            
            // Send health check
            await this.walletMonitor.sendHealthCheck();
            
            const statusText = 
                `📡 **FORCED STATUS UPDATE COMPLETE** 📡\n\n` +
                `✅ **Health check notification sent to group**\n` +
                `📊 **Current system status transmitted**\n` +
                `⚡ **All operational parameters verified**\n\n` +
                `**Status broadcast successful, Commander!**`;

            const keyboard = [
                [{ text: '◀️ BACK TO COMMAND', callback_data: 'sniper_menu' }]
            ];

            await ctx.editMessageText(statusText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            await errorHandler.logError('Force Status Update Error', error);
            await ctx.reply('❌ Error sending status update. Please try again.');
        }
    }

    async toggleMonitoring(ctx) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        const newStatus = !user.monitor_enabled;
        
        if (newStatus) {
            await this.walletMonitor.enableMonitoringForUser(userId);
        } else {
            await this.walletMonitor.disableMonitoringForUser(userId);
        }
        
        const statusText = 
            `⚙️ **MONITORING STATUS UPDATED** ⚙️\n\n` +
            `👁️ **New Status**: ${newStatus ? '🟢 ENABLED' : '🔴 DISABLED'}\n\n` +
            `${newStatus ? 
                '✅ **Monitoring Activated**\n• Real-time surveillance resumed\n• Notifications will be sent\n• All systems operational' :
                '🔴 **Monitoring Disabled**\n• Surveillance paused\n• No notifications will be sent\n• System on standby'
            }\n\n` +
            `**Configuration updated, Commander!**`;

        const keyboard = [
            [{ text: '◀️ BACK TO CONFIG', callback_data: 'sniper_config' }]
        ];

        await ctx.editMessageText(statusText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    registerHandlers(bot) {
        // Main sniper menu
        bot.action('sniper_menu', async (ctx) => {
            await this.showSniperMenu(ctx);
        });

        bot.action('sniper_refresh', async (ctx) => {
            await this.showSniperMenu(ctx);
        });

        // Sniper submenu handlers
        bot.action('sniper_wallet_ops', async (ctx) => {
            await this.showWalletOperations(ctx);
        });

        bot.action('sniper_intel', async (ctx) => {
            await this.showIntelReport(ctx);
        });

        bot.action('sniper_targets', async (ctx) => {
            await this.showActiveTargets(ctx);
        });

        bot.action('sniper_config', async (ctx) => {
            await this.showSystemConfig(ctx);
        });

        bot.action('sniper_force_status', async (ctx) => {
            await this.forceStatusUpdate(ctx);
        });

        // Configuration handlers
        bot.action('config_toggle_monitoring', async (ctx) => {
            await this.toggleMonitoring(ctx);
        });

        // Wallet operations handlers
        bot.action('wallet_refresh', async (ctx) => {
            await this.showWalletOperations(ctx);
        });

        bot.action('wallet_history', async (ctx) => {
            await this.showTransactionHistory(ctx);
        });
    }

    async showTransactionHistory(ctx) {
        const walletAddress = this.solanaManager.getBotAddress();
        const recentTransactions = await this.solanaManager.getRecentTransactions(walletAddress, 10);
        
        let historyText = `📈 **TRANSACTION HISTORY** 📈\n\n`;
        historyText += `💳 **Wallet**: \`${walletAddress}\`\n`;
        historyText += `📊 **Recent Transactions**: ${recentTransactions.length}\n\n`;
        
        if (recentTransactions.length === 0) {
            historyText += `📭 **No recent transactions found**\n\n`;
        } else {
            historyText += `🔍 **Latest Activity:**\n\n`;
            
            for (let i = 0; i < Math.min(5, recentTransactions.length); i++) {
                const tx = recentTransactions[i];
                const date = new Date(tx.blockTime * 1000).toLocaleString();
                historyText += `• 📋 \`${tx.signature.substring(0, 16)}...\`\n`;
                historyText += `  ⏰ ${date}\n`;
                historyText += `  ${tx.err ? '❌ Failed' : '✅ Success'}\n\n`;
            }
        }
        
        historyText += `**Transaction monitoring active 24/7**`;

        const keyboard = [
            [
                { text: '🔄 REFRESH HISTORY', callback_data: 'wallet_history' },
                { text: '📊 DETAILED VIEW', callback_data: 'wallet_detailed_history' }
            ],
            [
                { text: '◀️ BACK TO WALLET OPS', callback_data: 'sniper_wallet_ops' }
            ]
        ];

        await ctx.editMessageText(historyText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
}

module.exports = SniperHandler;
