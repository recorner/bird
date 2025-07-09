const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const config = require('./config/config');
const errorHandler = require('./utils/errorHandler');
const UserDataManager = require('./modules/userDataManager');
const SolanaManager = require('./modules/solanaManager');
const NotificationManager = require('./modules/notificationManager');
const WalletMonitor = require('./modules/walletMonitor');
const HealthCheckService = require('./modules/healthCheckService');
const SetupHandler = require('./handlers/setupHandler');
const SniperHandler = require('./handlers/sniperHandler');

class BirdEyeSniperBot {
    constructor() {
        // Initialize bot
        this.bot = new Telegraf(config.BOT_TOKEN);
        
        // Initialize managers
        this.userDataManager = new UserDataManager();
        this.solanaManager = new SolanaManager();
        this.notificationManager = new NotificationManager(this.bot);
        this.walletMonitor = new WalletMonitor(
            this.solanaManager, 
            this.notificationManager, 
            this.userDataManager
        );
        
        // Initialize health check service
        this.healthCheckService = new HealthCheckService(
            this.walletMonitor,
            this.notificationManager,
            this.userDataManager,
            this.solanaManager
        );
        
        // Initialize handlers
        this.setupHandler = new SetupHandler(
            this.userDataManager,
            this.solanaManager,
            this.notificationManager
        );
        
        this.sniperHandler = new SniperHandler(
            this.userDataManager,
            this.solanaManager,
            this.notificationManager,
            this.walletMonitor
        );
        
        this.initializeBot();
    }

    async initializeBot() {
        try {
            // Set up error handling
            this.bot.catch((err, ctx) => {
                errorHandler.handleBotError(err, ctx);
            });

            // Register command handlers
            this.registerCommands();
            
            // Register callback handlers from modules
            this.setupHandler.registerHandlers(this.bot);
            this.sniperHandler.registerHandlers(this.bot);
            
            // Text message handler
            this.bot.on('text', async (ctx) => {
                await this.handleTextMessage(ctx);
            });

            console.log('🤖 Bot initialization complete');
            
        } catch (error) {
            await errorHandler.logError('Bot Initialization Error', error);
            throw error;
        }
    }

    registerCommands() {
        // Start command
        this.bot.start(async (ctx) => {
            await errorHandler.safeAsync(async () => {
                await this.setupHandler.handleStart(ctx);
            })();
        });

        // Sniper command
        this.bot.command('sniper', async (ctx) => {
            await errorHandler.safeAsync(async () => {
                const userId = ctx.from.id;
                
                // Check authorization
                if (!await this.notificationManager.isAuthorized(userId)) {
                    return await ctx.reply('❌ Access denied. Admin privileges required.');
                }
                
                await this.sniperHandler.showSniperMenu(ctx);
            })();
        });

        // Wallet command (admin only)
        this.bot.command('wallet', async (ctx) => {
            await errorHandler.safeAsync(async () => {
                const userId = ctx.from.id;
                
                if (!this.notificationManager.isAdmin(userId)) {
                    return await ctx.reply('❌ Access denied. Super admin privileges required.');
                }
                
                await this.handleWalletCommand(ctx);
            })();
        });

        // Status command
        this.bot.command('status', async (ctx) => {
            await errorHandler.safeAsync(async () => {
                const userId = ctx.from.id;
                
                if (!await this.notificationManager.isAuthorized(userId)) {
                    return await ctx.reply('❌ Access denied.');
                }
                
                await this.handleStatusCommand(ctx);
            })();
        });

        // Health command (admin only)
        this.bot.command('health', async (ctx) => {
            await errorHandler.safeAsync(async () => {
                const userId = ctx.from.id;
                
                if (!this.notificationManager.isAdmin(userId)) {
                    return await ctx.reply('❌ Access denied. Admin privileges required.');
                }
                
                await this.handleHealthCommand(ctx);
            })();
        });

        // Help command
        this.bot.command('help', async (ctx) => {
            await this.handleHelpCommand(ctx);
        });
    }

    async handleTextMessage(ctx) {
        await errorHandler.safeAsync(async () => {
            const userId = ctx.from.id;
            const user = this.userDataManager.getUser(userId);
            const text = ctx.message.text;

            if (!user) {
                return await ctx.reply('Please start with /start to set up your account.');
            }

            // Handle setup steps
            switch (user.setup_step) {
                case 'email':
                    await this.setupHandler.handleEmailInput(ctx, text);
                    break;
                    
                case 'ip':
                    await this.setupHandler.handleIPInput(ctx, text);
                    break;
                    
                case 'payout_address':
                    await this.setupHandler.handlePayoutAddressInput(ctx, text);
                    break;
                    
                case 'completed':
                    // Handle other text inputs for completed users
                    await this.handleCompletedUserText(ctx, text);
                    break;
                    
                default:
                    await ctx.reply('Please use the menu buttons or type /help for available commands.');
            }
        })();
    }

    async handleCompletedUserText(ctx, text) {
        // Handle any text inputs from users who have completed setup
        // This could include wallet addresses, amounts, etc.
        
        const userId = ctx.from.id;
        
        // Check if it's a Solana address
        if (this.solanaManager.isValidSolanaAddress(text)) {
            const balance = await this.solanaManager.getWalletBalance(text);
            
            const infoText = 
                `💳 **Wallet Information** 💳\n\n` +
                `📮 **Address**: \`${text}\`\n` +
                `💰 **Balance**: ${this.notificationManager.formatCurrency(balance)}\n` +
                `💵 **USD Value**: $${(balance * this.notificationManager.solPriceUsd).toFixed(2)}\n` +
                `📡 **Network**: Solana Mainnet\n\n` +
                `Use /sniper to access tactical operations.`;
            
            await ctx.reply(infoText, { parse_mode: 'Markdown' });
            return;
        }
        
        // Default response for other text
        await ctx.reply(
            '🎯 Use /sniper to access the command center or /help for available commands.',
            { parse_mode: 'Markdown' }
        );
    }

    async handleWalletCommand(ctx) {
        const walletAddress = this.solanaManager.getBotAddress();
        const balance = await this.solanaManager.getBotBalance();
        
        const walletText = 
            `💳 **ADMIN WALLET OVERVIEW** 💳\n\n` +
            `🏦 **Bot Wallet**: \`${walletAddress}\`\n` +
            `💰 **Balance**: ${this.notificationManager.formatCurrency(balance)}\n` +
            `💵 **USD Value**: $${(balance * this.notificationManager.solPriceUsd).toFixed(2)}\n` +
            `📡 **Network**: Solana Mainnet\n` +
            `🔐 **Status**: Secure & Operational\n\n` +
            `👥 **Active Users**: ${this.userDataManager.getActiveUsers().length}\n` +
            `👁️ **Monitoring**: ${this.walletMonitor.getMonitoringStatus().isRunning ? 'Active' : 'Inactive'}\n\n` +
            `**Administrative access confirmed.**`;

        await ctx.reply(walletText, { parse_mode: 'Markdown' });
    }

    async handleStatusCommand(ctx) {
        const monitoringStatus = this.walletMonitor.getMonitoringStatus();
        const botBalance = await this.solanaManager.getBotBalance();
        const allUsers = this.userDataManager.getAllUsers();
        const activeUsers = this.userDataManager.getActiveUsers();
        
        const statusText = 
            `📊 **SYSTEM STATUS REPORT** 📊\n\n` +
            `⚡ **Bot Status**: ${monitoringStatus.isRunning ? '🟢 OPERATIONAL' : '🔴 STANDBY'}\n` +
            `👥 **Total Users**: ${Object.keys(allUsers).length}\n` +
            `⚡ **Active Users**: ${activeUsers.length}\n` +
            `👁️ **Monitored Wallets**: ${monitoringStatus.monitoredWallets}\n` +
            `💰 **Bot Balance**: ${this.notificationManager.formatCurrency(botBalance)}\n` +
            `💵 **SOL Price**: $${this.notificationManager.solPriceUsd}\n` +
            `📡 **Network**: Solana Mainnet\n\n` +
            `🔍 **Scan Frequency**: Every 30 seconds\n` +
            `🏥 **Last Health Check**: ${new Date(monitoringStatus.lastHealthCheck).toLocaleString()}\n\n` +
            `**All systems operational!**`;

        await ctx.reply(statusText, { parse_mode: 'Markdown' });
    }

    async handleHealthCommand(ctx) {
        try {
            await ctx.reply('🏥 Performing health check...');
            
            const healthReport = await this.healthCheckService.generateHealthReport();
            
            const healthText = 
                `🏥 **SYSTEM HEALTH REPORT** 🏥\n\n` +
                `📊 **Overall Status**: ${healthReport.summary.status.toUpperCase()}\n` +
                `⏱️ **Uptime**: ${healthReport.summary.uptime_hours} hours\n` +
                `📅 **Last Check**: ${new Date(healthReport.summary.timestamp).toLocaleString()}\n\n` +
                `**System Components:**\n` +
                `• Bot: ${healthReport.details.bot_status?.status || 'unknown'}\n` +
                `• Wallet Monitor: ${healthReport.details.wallet_monitoring?.status || 'unknown'}\n` +
                `• Solana RPC: ${healthReport.details.solana_connection?.status || 'unknown'}\n` +
                `• Notifications: ${healthReport.details.notification_system?.status || 'unknown'}\n` +
                `• User Data: ${healthReport.details.user_data?.status || 'unknown'}\n\n` +
                `**Key Metrics:**\n` +
                `• Memory: ${Math.round(healthReport.metrics.memory_usage?.heapUsed / 1024 / 1024 || 0)}MB\n` +
                `• Users: ${healthReport.metrics.user_stats?.total || 0} (${healthReport.metrics.user_stats?.active || 0} active)\n` +
                `• SOL Price: $${healthReport.metrics.sol_price || 'N/A'}\n` +
                `• Bot Balance: ${this.notificationManager.formatCurrency(healthReport.metrics.bot_balance || 0)}\n\n` +
                (healthReport.recommendations.length > 0 ? 
                    `**Recommendations:**\n${healthReport.recommendations.map(r => `• ${r}`).join('\n')}\n\n` : '') +
                `*Health monitoring active 24/7*`;

            await ctx.reply(healthText, { parse_mode: 'Markdown' });
            
        } catch (error) {
            await errorHandler.logError('Health Command Error', error);
            await ctx.reply('❌ Error generating health report. Check logs for details.');
        }
    }

    async handleHelpCommand(ctx) {
        const helpText = 
            `🦅 **BirdEye Sniper Bot - Help Center** 🦅\n\n` +
            `**Available Commands:**\n` +
            `• /start - Initialize or restart bot setup\n` +
            `• /sniper - Access sniper command center\n` +
            `• /status - View system status\n` +
            `• /help - Show this help message\n\n` +
            `**Admin Commands:**\n` +
            `• /wallet - View wallet information\n` +
            `• /health - System health check\n\n` +
            `**Features:**\n` +
            `🎯 Real-time wallet monitoring\n` +
            `⚡ Instant transaction notifications\n` +
            `📊 Advanced analytics dashboard\n` +
            `🛡️ Military-grade security\n` +
            `💰 Balance change detection\n\n` +
            `**Support:**\n` +
            `Contact your squadron leader for technical support.\n\n` +
            `**Ready to dominate the memecoin battlefield!** 🚀`;

        await ctx.reply(helpText, { parse_mode: 'Markdown' });
    }

    async start() {
        try {
            console.log('🦅 BirdEye Sniper Bot starting...');
            
            // Update group admins
            await this.notificationManager.updateGroupAdmins();
            
            // Start wallet monitoring
            this.walletMonitor.start();
            
            // Start health check service with 6-hour interval
            cron.schedule('0 */6 * * *', async () => {
                await this.healthCheckService.performHealthCheck();
            });
            
            // Perform initial health check after 1 minute
            setTimeout(async () => {
                await this.healthCheckService.performHealthCheck();
            }, 60000);
            
            // Launch bot
            await this.bot.launch();
            
            // Enable graceful stop
            process.once('SIGINT', () => this.stop('SIGINT'));
            process.once('SIGTERM', () => this.stop('SIGTERM'));
            
            console.log('✅ BirdEye Sniper Bot is running!');
            console.log('🎯 Ready for memecoin sniping operations...');
            
            // Send startup notification to group
            if (this.notificationManager.groupId) {
                const startupMessage = 
                    `🚀 **SNIPER BOT ACTIVATED** 🚀\n\n` +
                    `⚡ **Status**: OPERATIONAL\n` +
                    `🎯 **Mission**: Memecoin surveillance\n` +
                    `👁️ **Monitoring**: ACTIVE\n` +
                    `📡 **Network**: Solana Mainnet\n` +
                    `⏰ **Boot Time**: ${new Date().toLocaleString()}\n\n` +
                    `**All systems online - Ready for tactical operations!**`;
                
                await this.notificationManager.sendGroupNotification(startupMessage);
            }
            
        } catch (error) {
            await errorHandler.logError('Bot Start Error', error);
            throw error;
        }
    }

    async stop(signal) {
        try {
            console.log(`🛑 Received ${signal}, stopping bot gracefully...`);
            
            // Stop wallet monitoring
            this.walletMonitor.stop();
            
            // Stop bot
            this.bot.stop(signal);
            
            // Send shutdown notification
            if (this.notificationManager.groupId) {
                const shutdownMessage = 
                    `⏹️ **SNIPER BOT SHUTTING DOWN** ⏹️\n\n` +
                    `🔴 **Status**: OFFLINE\n` +
                    `⏰ **Shutdown Time**: ${new Date().toLocaleString()}\n` +
                    `📊 **Reason**: ${signal} signal received\n\n` +
                    `**Bot will be back online shortly...**`;
                
                await this.notificationManager.sendGroupNotification(shutdownMessage);
            }
            
            console.log('✅ Bot stopped gracefully');
            
        } catch (error) {
            await errorHandler.logError('Bot Stop Error', error);
        }
    }
}

module.exports = BirdEyeSniperBot;
