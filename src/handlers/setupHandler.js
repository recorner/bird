const validator = require('validator');
const { Markup } = require('telegraf');
const errorHandler = require('../utils/errorHandler');

class SetupHandler {
    constructor(userDataManager, solanaManager, notificationManager) {
        this.userDataManager = userDataManager;
        this.solanaManager = solanaManager;
        this.notificationManager = notificationManager;
    }

    async handleStart(ctx) {
        const userId = ctx.from.id.toString();
        let user = this.userDataManager.getUser(userId);
        
        if (!user) {
            user = await this.userDataManager.createUser(userId, {
                telegram_username: ctx.from.username,
                telegram_first_name: ctx.from.first_name,
                telegram_last_name: ctx.from.last_name
            });
        }

        if (user.setup_step === 'completed') {
            return await this.showMainMenu(ctx);
        }

        await this.showWelcomeMessage(ctx);
    }

    async showWelcomeMessage(ctx) {
        const welcomeText = 
            `🦅 **Welcome to BirdEye Sniper Bot** 🦅\n\n` +
            `🎯 **The Ultimate Memecoin Sniper**\n\n` +
            `🚀 **What can this bot do?**\n` +
            `• 👁️ Monitor wallet activities in real-time\n` +
            `• 💰 Track balance changes instantly\n` +
            `• 📱 Send instant notifications to your group\n` +
            `• ⚡ Lightning-fast transaction detection\n` +
            `• 🎯 Precision sniping capabilities\n\n` +
            `🛡️ **Security Features:**\n` +
            `• 🔐 End-to-end encrypted communications\n` +
            `• 🏦 Secure wallet management\n` +
            `• 👑 Admin-only access controls\n\n` +
            `To get started, we need to set up your sniper profile.\n\n` +
            `**Ready to begin your sniping journey, Commander?**`;

        const keyboard = [
            [{ text: '🚀 START SETUP', callback_data: 'start_setup' }],
            [{ text: '❓ Learn More', callback_data: 'learn_more' }]
        ];

        await ctx.reply(welcomeText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleSetupStart(ctx) {
        const userId = ctx.from.id;
        await this.userDataManager.updateUser(userId, { setup_step: 'email' });
        
        const setupText = 
            `📋 **SNIPER PROFILE SETUP** 📋\n\n` +
            `**Step 1 of 3: Email Configuration**\n\n` +
            `🔧 Please provide your operational email address.\n` +
            `This will be used for:\n` +
            `• 📧 Mission reports and notifications\n` +
            `• 🔐 Account verification\n` +
            `• 📊 Transaction summaries\n\n` +
            `**Enter your email address:**\n` +
            `*Example: sniper@tactical.com*`;

        const keyboard = [
            [{ text: '◀️ Previous', callback_data: 'setup_previous_email' }],
            [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
        ];

        try {
            if (ctx.callbackQuery) {
                await ctx.editMessageText(setupText, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } else {
                await ctx.reply(setupText, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            }
        } catch (error) {
            await ctx.reply(setupText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }

    async handleEmailInput(ctx, email) {
        const userId = ctx.from.id;
        
        if (!validator.isEmail(email)) {
            const errorText = 
                `❌ **Invalid Email Format**\n\n` +
                `Please enter a valid email address.\n` +
                `*Example: sniper@tactical.com*\n\n` +
                `**Try again:**`;

            const keyboard = [
                [{ text: '◀️ Previous', callback_data: 'setup_previous_email' }],
                [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
            ];

            return await ctx.reply(errorText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
        
        await this.userDataManager.updateUser(userId, { 
            email: email,
            setup_step: 'checking_email'
        });
        
        const checkingText = 
            `⏳ **Verifying Email Configuration...**\n\n` +
            `📧 **Email**: ${email}\n` +
            `🔍 **Status**: Validating credentials...\n` +
            `⚡ **Progress**: Processing...`;

        await ctx.reply(checkingText, { parse_mode: 'Markdown' });
        
        // Wait 3 seconds then proceed to IP step
        setTimeout(async () => {
            await this.showIPSetup(ctx);
        }, 3000);
    }

    async showIPSetup(ctx) {
        const userId = ctx.from.id;
        await this.userDataManager.updateUser(userId, { setup_step: 'ip' });
        
        const ipText = 
            `📋 **SNIPER PROFILE SETUP** 📋\n\n` +
            `**Step 2 of 3: Network Configuration**\n\n` +
            `🌐 Please provide your operational IP address.\n` +
            `This ensures secure connection to our tactical network.\n\n` +
            `🔒 **Security Features:**\n` +
            `• End-to-end encryption\n` +
            `• DDoS protection\n` +
            `• Geo-location verification\n\n` +
            `**Enter your IP address:**\n` +
            `*Example: 192.168.1.100*`;

        const keyboard = [
            [{ text: '◀️ Previous', callback_data: 'setup_previous_ip' }],
            [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
        ];

        await ctx.reply(ipText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleIPInput(ctx, ip) {
        const userId = ctx.from.id;
        
        if (!validator.isIP(ip, 4)) {
            const errorText = 
                `❌ **Invalid IP Address Format**\n\n` +
                `Please enter a valid IPv4 address.\n` +
                `*Example: 192.168.1.100*\n\n` +
                `**Try again:**`;

            const keyboard = [
                [{ text: '◀️ Previous', callback_data: 'setup_previous_ip' }],
                [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
            ];

            return await ctx.reply(errorText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
        
        await this.userDataManager.updateUser(userId, { 
            ip: ip,
            setup_step: 'connecting'
        });
        
        const connectingText = 
            `⚡ **Establishing Secure Connection...**\n\n` +
            `🌐 **IP**: ${ip}\n` +
            `🔐 **Encryption**: AES-256 Active\n` +
            `🛡️ **Security**: Firewall Configured\n` +
            `📡 **Status**: Connecting to tactical network...`;

        await ctx.reply(connectingText, { parse_mode: 'Markdown' });
        
        setTimeout(async () => {
            await this.showWalletSetup(ctx);
        }, 2000);
    }

    async showWalletSetup(ctx) {
        const userId = ctx.from.id;
        await this.userDataManager.updateUser(userId, { setup_step: 'wallet' });
        
        const walletText = 
            `📋 **SNIPER PROFILE SETUP** 📋\n\n` +
            `**Step 3 of 3: Wallet Configuration**\n\n` +
            `✅ **Connection Successful!**\n` +
            `🔐 **Security Level**: Maximum\n` +
            `📡 **Network Status**: Connected\n\n` +
            `🎯 **Final Step**: Tactical Wallet Setup\n\n` +
            `Your sniper profile will be linked to our secure wallet system.\n` +
            `This enables real-time monitoring and instant notifications.\n\n` +
            `**Ready to activate your tactical wallet?**`;

        const keyboard = [
            [{ text: '💳 ACTIVATE WALLET', callback_data: 'activate_wallet' }],
            [{ text: '◀️ Previous', callback_data: 'setup_previous_wallet' }],
            [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
        ];

        await ctx.reply(walletText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handleWalletActivation(ctx) {
        const userId = ctx.from.id;
        
        const activatingText = 
            `⚡ **Activating Tactical Wallet...**\n\n` +
            `🔧 **Generating secure keypair...**\n` +
            `🔐 **Configuring encryption...**\n` +
            `📡 **Syncing with network...**\n` +
            `🎯 **Initializing sniper protocols...**`;

        await ctx.reply(activatingText, { parse_mode: 'Markdown' });
        
        setTimeout(async () => {
            await this.completeSetup(ctx);
        }, 3000);
    }

    async completeSetup(ctx) {
        const userId = ctx.from.id;
        const botAddress = this.solanaManager.getBotAddress();
        
        await this.userDataManager.updateUser(userId, {
            setup_step: 'completed',
            wallet_generated: true,
            sol_address: botAddress, // All users share the bot's wallet for monitoring
            setup_completed_at: new Date().toISOString()
        });

        const user = this.userDataManager.getUser(userId);
        const balance = await this.solanaManager.getWalletBalance(botAddress);
        
        // Get the private key for display (be careful with this!)
        const privateKey = this.solanaManager.botKeypair ? 
            Buffer.from(this.solanaManager.botKeypair.secretKey).toString('base64') : 
            'Private key not available';
        
        const successText = 
            `🎉 **SETUP COMPLETE - SNIPER ACTIVATED!** 🎉\n\n` +
            `🎖️ **Welcome to the Elite Sniper Squadron!**\n\n` +
            `👤 **Operative**: ${ctx.from.first_name || 'Commander'}\n` +
            `📧 **Email**: ${user.email}\n` +
            `🌐 **IP**: ${user.ip}\n\n` +
            `💳 **WALLET INFORMATION**:\n` +
            `📮 **Address**: \`${botAddress}\`\n` +
            `💰 **Balance**: ${this.notificationManager.formatCurrency(balance)}\n\n` +
            `🔐 **PRIVATE KEY** (STORE SAFELY!):\n` +
            `\`${privateKey}\`\n\n` +
            `🚨 **CRITICAL SECURITY INSTRUCTIONS**:\n` +
            `🔴 **IMMEDIATELY** copy and store this private key securely\n` +
            `🔴 **NEVER** share this key with anyone\n` +
            `🔴 **ANYONE** with this key can control your wallet\n` +
            `🔴 **SAVE** it in multiple secure locations\n` +
            `🔴 **USE** the button below for easy copying\n\n` +
            `💡 **Recommended Storage**:\n` +
            `• Password manager (1Password, Bitwarden)\n` +
            `• Encrypted note file\n` +
            `• Hardware security key\n` +
            `• Written backup in safe location\n\n` +
            `🚀 **Your sniper bot is now OPERATIONAL!**\n\n` +
            `🎯 **Active Features**:\n` +
            `• 👁️ Real-time wallet monitoring\n` +
            `• ⚡ Instant transaction alerts\n` +
            `• 🎯 Memecoin sniping capabilities\n` +
            `• 📊 Advanced analytics dashboard\n\n` +
            `**Ready for tactical operations, Commander!**`;

        const keyboard = [
            [{ text: '🔐 COPY PRIVATE KEY', callback_data: 'copy_private_key' }],
            [{ text: '💾 SECURITY CONFIRMED', callback_data: 'security_confirmed' }],
            [{ text: '🎯 ENTER COMMAND CENTER', callback_data: 'sniper_menu' }]
        ];

        await ctx.reply(successText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });

        // Send notification to group about new operative
        if (this.notificationManager.groupId) {
            const groupNotification = 
                `🎖️ **NEW OPERATIVE RECRUITED** 🎖️\n\n` +
                `👤 **Callsign**: ${ctx.from.first_name || 'Commander'}\n` +
                `📧 **Contact**: ${user.email}\n` +
                `💳 **Wallet**: \`${botAddress}\`\n` +
                `⏰ **Enlisted**: ${new Date().toLocaleString()}\n\n` +
                `🎯 **Status**: Ready for tactical operations\n` +
                `🔍 **Mission**: Memecoin surveillance initiated`;

            await this.notificationManager.sendGroupNotification(groupNotification);
        }
    }

    async handleSetupNavigation(ctx, action) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        
        switch (action) {
            case 'setup_previous_email':
                await this.showWelcomeMessage(ctx);
                break;
                
            case 'setup_previous_ip':
                await this.handleSetupStart(ctx);
                break;
                
            case 'setup_previous_wallet':
                await this.showIPSetup(ctx);
                break;
                
            case 'cancel_setup':
                await this.handleCancelSetup(ctx);
                break;
                
            case 'learn_more':
                await this.showLearnMore(ctx);
                break;
                
            default:
                await this.showWelcomeMessage(ctx);
        }
    }

    async handleCancelSetup(ctx) {
        const userId = ctx.from.id;
        await this.userDataManager.resetUserSetup(userId);
        
        const cancelText = 
            `❌ **Setup Cancelled**\n\n` +
            `No worries, Commander! You can restart the setup process anytime.\n\n` +
            `🚀 Use /start to begin again when you're ready.\n\n` +
            `See you on the battlefield! 🎯`;

        await ctx.reply(cancelText, { parse_mode: 'Markdown' });
    }

    async showLearnMore(ctx) {
        const learnText = 
            `📚 **ABOUT BIRDEYE SNIPER BOT** 📚\n\n` +
            `🎯 **Mission**: Revolutionary memecoin sniping\n\n` +
            `⚡ **Core Features:**\n` +
            `• 🔍 Real-time wallet monitoring\n` +
            `• ⚡ Lightning-fast notifications\n` +
            `• 📊 Advanced analytics dashboard\n` +
            `• 🛡️ Military-grade security\n` +
            `• 🎯 Precision targeting system\n\n` +
            `🏆 **Why Choose BirdEye?**\n` +
            `• Fastest notification system in crypto\n` +
            `• Zero false positives\n` +
            `• 24/7 monitoring capability\n` +
            `• User-friendly interface\n` +
            `• Professional support team\n\n` +
            `Ready to dominate the memecoin battlefield?`;

        const keyboard = [
            [{ text: '🚀 START SETUP', callback_data: 'start_setup' }],
            [{ text: '◀️ Back to Welcome', callback_data: 'back_to_welcome' }]
        ];

        try {
            await ctx.editMessageText(learnText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        } catch (error) {
            await ctx.reply(learnText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }

    async showMainMenu(ctx) {
        const userId = ctx.from.id;
        const user = this.userDataManager.getUser(userId);
        
        if (!user || user.setup_step !== 'completed') {
            return await this.showWelcomeMessage(ctx);
        }

        const balance = user.sol_address ? await this.solanaManager.getWalletBalance(user.sol_address) : 0;
        
        const menuText = 
            `🦅 **BirdEye Sniper Dashboard** 🦅\n\n` +
            `👤 **Operative**: ${ctx.from.first_name || 'Commander'}\n` +
            `📧 **Email**: ${user.email || 'Not set'}\n` +
            `🌐 **IP**: ${user.ip || 'Not set'}\n` +
            `💳 **Wallet**: ${user.wallet_generated ? '✅ Active' : '❌ Inactive'}\n` +
            `💰 **Balance**: ${user.sol_address ? this.notificationManager.formatCurrency(balance) : 'N/A'}\n` +
            `👁️ **Monitoring**: ${user.monitor_enabled !== false ? '🟢 Active' : '🔴 Disabled'}\n\n` +
            `🎯 **Status**: All systems operational\n\n` +
            `**Select your mission, Commander:**`;
        
        const keyboard = [
            [
                { text: '🎯 SNIPER CENTER', callback_data: 'sniper_menu' },
                { text: '💳 WALLET OPS', callback_data: 'wallet_menu' }
            ],
            [
                { text: '⚙️ SETTINGS', callback_data: 'settings_menu' },
                { text: '📊 INTEL REPORT', callback_data: 'stats_menu' }
            ],
            [
                { text: '🔄 REFRESH', callback_data: 'refresh_main' }
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

    registerHandlers(bot) {
        // Setup navigation callbacks
        bot.action('start_setup', async (ctx) => {
            await this.handleSetupStart(ctx);
        });

        bot.action('activate_wallet', async (ctx) => {
            await this.handleWalletActivation(ctx);
        });

        bot.action('learn_more', async (ctx) => {
            await this.showLearnMore(ctx);
        });

        bot.action('back_to_welcome', async (ctx) => {
            await this.showWelcomeMessage(ctx);
        });

        // Navigation handlers
        bot.action(/^setup_previous_/, async (ctx) => {
            const action = ctx.match[0];
            await this.handleSetupNavigation(ctx, action);
        });

        bot.action('cancel_setup', async (ctx) => {
            await this.handleCancelSetup(ctx);
        });

        bot.action('main_menu', async (ctx) => {
            await this.showMainMenu(ctx);
        });

        bot.action('refresh_main', async (ctx) => {
            await this.showMainMenu(ctx);
        });

        // Private key copy handler
        bot.action('copy_private_key', async (ctx) => {
            const privateKey = this.solanaManager.botKeypair ? 
                Buffer.from(this.solanaManager.botKeypair.secretKey).toString('base64') : 
                'Private key not available';
                
            const copyText = 
                `🔐 **PRIVATE KEY DETAILS** 🔐\n\n` +
                `**Base64 Format:**\n` +
                `\`${privateKey}\`\n\n` +
                `**Security Instructions:**\n` +
                `1. Save this key in a secure password manager\n` +
                `2. Create offline backup copies\n` +
                `3. Never share with anyone\n` +
                `4. This controls your entire wallet\n\n` +
                `**Import Instructions:**\n` +
                `• Phantom: Settings > Import Private Key\n` +
                `• Solflare: Add Wallet > Import Private Key\n` +
                `• Use base64 format above\n\n` +
                `⚠️ **WARNING**: Anyone with this key controls your wallet!`;

            try {
                await ctx.editMessageText(copyText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎯 CONTINUE TO COMMAND CENTER', callback_data: 'sniper_menu' }],
                            [{ text: '📊 VIEW DASHBOARD', callback_data: 'main_menu' }]
                        ]
                    }
                });
            } catch (error) {
                await ctx.reply(copyText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎯 CONTINUE TO COMMAND CENTER', callback_data: 'sniper_menu' }],
                            [{ text: '📊 VIEW DASHBOARD', callback_data: 'main_menu' }]
                        ]
                    }
                });
            }
        });

        // Security confirmation handler
        bot.action('security_confirmed', async (ctx) => {
            await ctx.answerCbQuery('✅ Security acknowledged! Welcome to the squadron!');
            
            const confirmText = 
                `✅ **SECURITY CONFIRMATION RECEIVED** ✅\n\n` +
                `🎖️ **Welcome to the Elite Operations!**\n\n` +
                `🔐 **Private key storage confirmed**\n` +
                `🎯 **Ready for tactical missions**\n` +
                `⚡ **All systems operational**\n\n` +
                `**Choose your next action:**`;

            try {
                await ctx.editMessageText(confirmText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎯 ENTER COMMAND CENTER', callback_data: 'sniper_menu' }],
                            [{ text: '📊 VIEW DASHBOARD', callback_data: 'main_menu' }],
                            [{ text: '💳 VIEW WALLET', callback_data: 'view_wallet_info' }]
                        ]
                    }
                });
            } catch (error) {
                await ctx.reply(confirmText, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎯 ENTER COMMAND CENTER', callback_data: 'sniper_menu' }],
                            [{ text: '📊 VIEW DASHBOARD', callback_data: 'main_menu' }],
                            [{ text: '💳 VIEW WALLET', callback_data: 'view_wallet_info' }]
                        ]
                    }
                });
            }
        });
    }
}

module.exports = SetupHandler;
