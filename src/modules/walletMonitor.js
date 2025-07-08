const cron = require('node-cron');
const config = require('../config/config');
const errorHandler = require('../utils/errorHandler');

class WalletMonitor {
    constructor(solanaManager, notificationManager, userDataManager) {
        this.solanaManager = solanaManager;
        this.notificationManager = notificationManager;
        this.userDataManager = userDataManager;
        this.monitoredWallets = new Map(); // wallet -> {userId, lastBalance, lastCheck, timeout}
        this.isRunning = false;
        this.scanInterval = null;
        this.lastHealthCheck = Date.now();
    }

    start() {
        if (this.isRunning) {
            console.log('👁️ Wallet monitoring is already running');
            return;
        }

        // Initialize monitoring for existing users
        this.initializeExistingWallets();
        
        // Start monitoring every 30 seconds
        this.scanInterval = setInterval(async () => {
            await this.scanWallets();
        }, 30 * 1000);

        // Health check every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            await this.sendHealthCheck();
        });

        // Clean up old pending transactions every hour
        cron.schedule('0 * * * *', () => {
            this.notificationManager.clearOldPendingTransactions();
        });

        this.isRunning = true;
        console.log('👁️ Wallet monitoring started - scanning every 30 seconds');
        console.log('🏥 Health checks scheduled every 6 hours');
    }

    stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        this.isRunning = false;
        console.log('⏹️ Wallet monitoring stopped');
    }

    initializeExistingWallets() {
        const users = this.userDataManager.getAllUsers();
        let initialized = 0;

        for (const [userId, userData] of Object.entries(users)) {
            if (userData.monitor_enabled !== false && userData.setup_step === 'completed') {
                // In this bot, all users monitor the same address (bot's address)
                const walletAddress = this.solanaManager.getBotAddress();
                if (walletAddress) {
                    this.addWalletToMonitor(walletAddress, userId);
                    initialized++;
                }
            }
        }

        console.log(`📊 Initialized monitoring for ${initialized} users on bot wallet`);
    }

    addWalletToMonitor(address, userId) {
        if (!this.solanaManager.isValidSolanaAddress(address)) {
            console.error(`❌ Invalid wallet address: ${address}`);
            return false;
        }

        this.monitoredWallets.set(address, {
            userId: userId,
            lastBalance: 0,
            lastCheck: 0,
            timeout: null
        });

        console.log(`👁️ Added wallet ${address} to monitoring for user ${userId}`);
        return true;
    }

    removeWalletFromMonitor(address) {
        const walletData = this.monitoredWallets.get(address);
        if (walletData && walletData.timeout) {
            clearTimeout(walletData.timeout);
        }
        this.monitoredWallets.delete(address);
        console.log(`🗑️ Removed wallet ${address} from monitoring`);
    }

    async scanWallets() {
        if (this.monitoredWallets.size === 0) {
            return;
        }

        console.log(`🔍 Scanning ${this.monitoredWallets.size} wallet(s)...`);

        for (const [address, walletData] of this.monitoredWallets.entries()) {
            try {
                await this.checkWalletBalance(address, walletData);
            } catch (error) {
                await errorHandler.logError(`Wallet Scan Error for ${address}`, error);
            }
        }
    }

    async checkWalletBalance(address, walletData) {
        try {
            const currentBalance = await this.solanaManager.getWalletBalance(address);
            const lastBalance = walletData.lastBalance;
            
            // Update check time
            walletData.lastCheck = Date.now();

            // If balance changed significantly
            if (Math.abs(currentBalance - lastBalance) > 0.001) {
                console.log(`💰 Balance change detected for ${address}: ${lastBalance} → ${currentBalance} SOL`);
                
                const user = this.userDataManager.getUser(walletData.userId);
                if (user) {
                    await this.notificationManager.notifyBalanceChange(
                        address,
                        currentBalance,
                        lastBalance,
                        walletData.userId,
                        user.email
                    );
                }

                // Update stored balance
                walletData.lastBalance = currentBalance;
            }
        } catch (error) {
            await errorHandler.logError(`Check Wallet Balance Error for ${address}`, error);
        }
    }

    async sendHealthCheck() {
        try {
            const uptime = Date.now() - this.lastHealthCheck;
            const botBalance = await this.solanaManager.getBotBalance();
            const monitoredWallets = this.monitoredWallets.size;
            
            await this.notificationManager.sendHealthStatus(
                monitoredWallets,
                uptime / 1000, // Convert to seconds
                botBalance
            );

            this.lastHealthCheck = Date.now();
            console.log('🏥 Health check notification sent');
        } catch (error) {
            await errorHandler.logError('Health Check Error', error);
        }
    }

    async enableMonitoringForUser(userId) {
        await this.userDataManager.updateUser(userId, { monitor_enabled: true });
        
        // Add bot wallet to monitoring for this user
        const walletAddress = this.solanaManager.getBotAddress();
        if (walletAddress) {
            this.addWalletToMonitor(walletAddress, userId);
            return true;
        }
        
        return false;
    }

    async disableMonitoringForUser(userId) {
        await this.userDataManager.updateUser(userId, { monitor_enabled: false });
        
        // Note: We don't remove the wallet from monitoring as other users might be monitoring it
        console.log(`🔇 Disabled monitoring for user ${userId}`);
        return true;
    }

    getMonitoringStatus() {
        return {
            isRunning: this.isRunning,
            monitoredWallets: this.monitoredWallets.size,
            lastHealthCheck: this.lastHealthCheck
        };
    }

    getMonitoredWallets() {
        return Array.from(this.monitoredWallets.keys());
    }
}

module.exports = WalletMonitor;
