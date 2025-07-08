const axios = require('axios');
const config = require('../config/config');
const errorHandler = require('../utils/errorHandler');

class NotificationManager {
    constructor(bot) {
        this.bot = bot;
        this.groupId = config.GROUP_ID;
        this.adminIds = config.ADMIN_IDS;
        this.solPriceUsd = 0;
        this.groupAdmins = new Map();
        this.pendingTransactions = new Map();
        
        this.startPriceUpdater();
    }

    async updateSolPrice() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            this.solPriceUsd = response.data.solana.usd;
            console.log(`💰 SOL Price updated: $${this.solPriceUsd}`);
            return this.solPriceUsd;
        } catch (error) {
            await errorHandler.logError('SOL Price Update Error', error);
            return this.solPriceUsd;
        }
    }

    startPriceUpdater() {
        // Update SOL price every 5 minutes
        setInterval(() => {
            this.updateSolPrice();
        }, 5 * 60 * 1000);
        
        // Initial price fetch
        this.updateSolPrice();
    }

    formatCurrency(solAmount) {
        const usdValue = solAmount * this.solPriceUsd;
        return `${solAmount.toFixed(4)} SOL ($${usdValue.toFixed(2)})`;
    }

    async updateGroupAdmins() {
        if (!this.groupId) return;
        
        try {
            const admins = await this.bot.telegram.getChatAdministrators(this.groupId);
            const adminIds = new Set(admins.map(admin => admin.user.id.toString()));
            this.groupAdmins.set(this.groupId, adminIds);
            console.log(`👑 Updated group admins: ${adminIds.size} admins found`);
            return adminIds;
        } catch (error) {
            await errorHandler.logError('Update Group Admins Error', error);
            return new Set();
        }
    }

    async isGroupAdmin(userId, groupId = null) {
        const targetGroupId = groupId || this.groupId;
        if (!targetGroupId) return false;
        
        try {
            const cachedAdmins = this.groupAdmins.get(targetGroupId);
            if (cachedAdmins) {
                return cachedAdmins.has(userId.toString());
            }
            
            const adminIds = await this.updateGroupAdmins();
            return adminIds.has(userId.toString());
        } catch (error) {
            await errorHandler.logError('Check Group Admin Error', error);
            return false;
        }
    }

    isAdmin(userId) {
        return this.adminIds.includes(userId.toString());
    }

    async isAuthorized(userId, groupId = null) {
        return this.isAdmin(userId) || await this.isGroupAdmin(userId, groupId);
    }

    async sendGroupNotification(message, options = {}) {
        if (!this.groupId) {
            console.warn('⚠️ Group ID not configured - skipping group notification');
            return null;
        }

        try {
            return await this.bot.telegram.sendMessage(this.groupId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...options
            });
        } catch (error) {
            await errorHandler.logError('Group Notification Error', error);
            return null;
        }
    }

    async sendAdminNotification(message, options = {}) {
        const results = [];
        
        for (const adminId of this.adminIds) {
            try {
                const result = await this.bot.telegram.sendMessage(adminId, message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    ...options
                });
                results.push({ adminId, success: true, result });
            } catch (error) {
                await errorHandler.logError(`Admin Notification Error for ${adminId}`, error);
                results.push({ adminId, success: false, error });
            }
        }
        
        return results;
    }

    async notifyBalanceChange(address, newBalance, oldBalance, userId, userEmail) {
        const difference = newBalance - oldBalance;
        const isDeposit = difference > 0;

        if (isDeposit && difference > 0.001) {
            const message = 
                `🚨 **TARGET ACQUIRED** 🚨\n\n` +
                `💳 **WALLET**: \`${address}\`\n` +
                `📧 **OPERATIVE**: ${userEmail || 'Unknown'}\n` +
                `📈 **INCOMING ASSETS**: ${this.formatCurrency(difference)}\n` +
                `💰 **NEW BALANCE**: ${this.formatCurrency(newBalance)}\n` +
                `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
                `🔍 **ANALYZING TRANSACTION DATA...**`;

            const sentMessage = await this.sendGroupNotification(message);
            
            if (sentMessage) {
                this.pendingTransactions.set(sentMessage.message_id, {
                    type: 'balance_change',
                    address,
                    newBalance,
                    difference,
                    userId,
                    timestamp: Date.now()
                });
            }

            return sentMessage;
        }
        
        return null;
    }

    async sendHealthStatus(monitoredWallets, uptime, botBalance) {
        const statusMessage = 
            `🎯 **SNIPER STATUS REPORT** 🎯\n\n` +
            `⚡ **OPERATIONAL STATUS**: ACTIVE\n` +
            `👁️ **WALLETS MONITORED**: ${monitoredWallets}\n` +
            `⏱️ **UPTIME**: ${Math.floor(uptime / 3600)} hours\n` +
            `💰 **SOL PRICE**: $${this.solPriceUsd}\n` +
            `💳 **BOT BALANCE**: ${this.formatCurrency(botBalance)}\n` +
            `🔍 **SCANNING FREQUENCY**: Every 30 seconds\n\n` +
            `📊 **SYSTEM STATUS**: All systems operational, Commander!\n` +
            `🎯 **MISSION**: Continuous wallet surveillance active\n\n` +
            `*Next status report in 6 hours...*`;

        return await this.sendGroupNotification(statusMessage);
    }

    async sendTransactionAlert(fromAddress, toAddress, amount, signature, success = true) {
        const status = success ? '✅ SUCCESSFUL' : '❌ FAILED';
        const emoji = success ? '🚀' : '💥';
        
        const message = 
            `${emoji} **TRANSACTION ${status}** ${emoji}\n\n` +
            `💳 **SOURCE**: \`${fromAddress}\`\n` +
            `📮 **TARGET**: \`${toAddress}\`\n` +
            `💰 **AMOUNT**: ${this.formatCurrency(amount)}\n` +
            `💵 **USD VALUE**: $${(amount * this.solPriceUsd).toFixed(2)}\n` +
            `📋 **SIGNATURE**: \`${signature}\`\n` +
            `⏰ **TIMESTAMP**: ${new Date().toLocaleString()}\n\n` +
            `Mission ${success ? 'accomplished' : 'failed'}, Commander!`;

        return await this.sendGroupNotification(message);
    }

    getPendingTransaction(messageId) {
        return this.pendingTransactions.get(messageId);
    }

    setPendingTransaction(messageId, data) {
        this.pendingTransactions.set(messageId, data);
    }

    deletePendingTransaction(messageId) {
        this.pendingTransactions.delete(messageId);
    }

    clearOldPendingTransactions(maxAge = 30 * 60 * 1000) { // 30 minutes
        const now = Date.now();
        for (const [messageId, data] of this.pendingTransactions.entries()) {
            if (data.timestamp && (now - data.timestamp) > maxAge) {
                this.pendingTransactions.delete(messageId);
            }
        }
    }
}

module.exports = NotificationManager;
