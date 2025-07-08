const fs = require('fs').promises;
const path = require('path');

class HealthCheckService {
    constructor(walletMonitor, notificationManager, userDataManager, solanaManager) {
        this.walletMonitor = walletMonitor;
        this.notificationManager = notificationManager;
        this.userDataManager = userDataManager;
        this.solanaManager = solanaManager;
        this.logFile = path.join(process.cwd(), 'logs', 'health_check.log');
        this.lastCheckTime = Date.now();
    }

    async performHealthCheck() {
        const checkTime = new Date().toISOString();
        console.log(`🏥 Starting health check at ${checkTime}`);
        
        const healthData = {
            timestamp: checkTime,
            status: 'healthy',
            checks: {},
            metrics: {},
            warnings: [],
            errors: []
        };

        try {
            // Check bot status
            healthData.checks.bot_status = await this.checkBotStatus();
            
            // Check wallet monitoring
            healthData.checks.wallet_monitoring = await this.checkWalletMonitoring();
            
            // Check Solana connection
            healthData.checks.solana_connection = await this.checkSolanaConnection();
            
            // Check notification system
            healthData.checks.notification_system = await this.checkNotificationSystem();
            
            // Check user data integrity
            healthData.checks.user_data = await this.checkUserData();
            
            // Collect metrics
            healthData.metrics = await this.collectMetrics();
            
            // Determine overall health
            healthData.status = this.determineOverallHealth(healthData.checks);
            
            // Log health check
            await this.logHealthCheck(healthData);
            
            // Send notification if needed
            await this.sendHealthNotification(healthData);
            
            this.lastCheckTime = Date.now();
            console.log(`✅ Health check completed: ${healthData.status}`);
            
            return healthData;
            
        } catch (error) {
            healthData.status = 'critical';
            healthData.errors.push(`Health check failed: ${error.message}`);
            await this.logHealthCheck(healthData);
            console.error('❌ Health check failed:', error);
            return healthData;
        }
    }

    async checkBotStatus() {
        try {
            const uptime = Math.floor(process.uptime());
            const memoryUsage = process.memoryUsage();
            
            return {
                status: 'healthy',
                uptime_seconds: uptime,
                memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                memory_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async checkWalletMonitoring() {
        try {
            const monitoringStatus = this.walletMonitor.getMonitoringStatus();
            
            return {
                status: monitoringStatus.isRunning ? 'healthy' : 'warning',
                is_running: monitoringStatus.isRunning,
                monitored_wallets: monitoringStatus.monitoredWallets,
                last_health_check: new Date(monitoringStatus.lastHealthCheck).toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async checkSolanaConnection() {
        try {
            const startTime = Date.now();
            const slot = await this.solanaManager.connection.getSlot();
            const responseTime = Date.now() - startTime;
            
            const botBalance = await this.solanaManager.getBotBalance();
            
            return {
                status: responseTime < 5000 ? 'healthy' : 'warning',
                current_slot: slot,
                response_time_ms: responseTime,
                bot_balance_sol: botBalance,
                network: 'mainnet-beta'
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async checkNotificationSystem() {
        try {
            const solPrice = this.notificationManager.solPriceUsd;
            const hasGroupId = !!this.notificationManager.groupId;
            
            return {
                status: hasGroupId ? 'healthy' : 'warning',
                sol_price_usd: solPrice,
                group_configured: hasGroupId,
                price_last_updated: solPrice > 0 ? 'recent' : 'stale'
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async checkUserData() {
        try {
            const allUsers = this.userDataManager.getAllUsers();
            const activeUsers = this.userDataManager.getActiveUsers();
            const completedUsers = Object.values(allUsers).filter(user => user.setup_step === 'completed');
            
            return {
                status: 'healthy',
                total_users: Object.keys(allUsers).length,
                active_users: activeUsers.length,
                completed_setup: completedUsers.length,
                data_file_accessible: true
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async collectMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                uptime_hours: Math.floor(process.uptime() / 3600),
                memory_usage: process.memoryUsage(),
                sol_price: this.notificationManager.solPriceUsd,
                bot_balance: await this.solanaManager.getBotBalance(),
                monitoring_status: this.walletMonitor.getMonitoringStatus(),
                user_stats: {
                    total: this.userDataManager.getUsersCount(),
                    active: this.userDataManager.getActiveUsers().length
                }
            };
            
            return metrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    determineOverallHealth(checks) {
        const statuses = Object.values(checks).map(check => check.status);
        
        if (statuses.includes('error')) {
            return 'critical';
        } else if (statuses.includes('warning')) {
            return 'warning';
        } else {
            return 'healthy';
        }
    }

    async logHealthCheck(healthData) {
        try {
            const logEntry = `${healthData.timestamp} - ${healthData.status.toUpperCase()}\n`;
            const detailedLog = JSON.stringify(healthData, null, 2) + '\n\n';
            
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
            await fs.appendFile(this.logFile, logEntry);
            
            // Also save detailed log
            const detailedLogFile = this.logFile.replace('.log', '_detailed.log');
            await fs.appendFile(detailedLogFile, detailedLog);
            
        } catch (error) {
            console.error('Failed to log health check:', error);
        }
    }

    async sendHealthNotification(healthData) {
        try {
            if (!this.notificationManager.groupId) {
                console.log('⚠️ No group configured for health notifications');
                return;
            }

            let message = '';
            let shouldSend = false;

            switch (healthData.status) {
                case 'healthy':
                    // Send routine health report every 6 hours
                    const timeSinceLastCheck = Date.now() - this.lastCheckTime;
                    if (timeSinceLastCheck >= 6 * 60 * 60 * 1000) { // 6 hours
                        message = this.formatHealthyNotification(healthData);
                        shouldSend = true;
                    }
                    break;
                    
                case 'warning':
                    message = this.formatWarningNotification(healthData);
                    shouldSend = true;
                    break;
                    
                case 'critical':
                    message = this.formatCriticalNotification(healthData);
                    shouldSend = true;
                    break;
            }

            if (shouldSend && message) {
                await this.notificationManager.sendGroupNotification(message);
                console.log(`📱 Health notification sent: ${healthData.status}`);
            }

        } catch (error) {
            console.error('Failed to send health notification:', error);
        }
    }

    formatHealthyNotification(healthData) {
        const metrics = healthData.metrics;
        
        return `🏥 **SYSTEM HEALTH REPORT** 🏥\n\n` +
            `✅ **STATUS**: ALL SYSTEMS OPERATIONAL\n` +
            `⏱️ **UPTIME**: ${metrics.uptime_hours} hours\n` +
            `👥 **ACTIVE USERS**: ${metrics.user_stats.active}/${metrics.user_stats.total}\n` +
            `👁️ **MONITORING**: ${metrics.monitoring_status.isRunning ? '🟢 Active' : '🔴 Inactive'}\n` +
            `💰 **BOT BALANCE**: ${this.notificationManager.formatCurrency(metrics.bot_balance)}\n` +
            `💵 **SOL PRICE**: $${metrics.sol_price}\n` +
            `📊 **MEMORY**: ${Math.round(metrics.memory_usage.heapUsed / 1024 / 1024)}MB\n\n` +
            `🎯 **All surveillance systems operational**\n` +
            `*Next health check in 6 hours*`;
    }

    formatWarningNotification(healthData) {
        const warnings = [];
        
        Object.entries(healthData.checks).forEach(([key, check]) => {
            if (check.status === 'warning') {
                warnings.push(`• ${key.replace('_', ' ').toUpperCase()}`);
            }
        });

        return `⚠️ **SYSTEM WARNING DETECTED** ⚠️\n\n` +
            `🔶 **STATUS**: WARNING LEVEL\n` +
            `📋 **ISSUES DETECTED**:\n${warnings.join('\n')}\n\n` +
            `🔧 **ACTION REQUIRED**: System monitoring detected potential issues\n` +
            `👨‍💻 **RECOMMENDATION**: Check system logs and investigate warnings\n\n` +
            `📊 **CURRENT METRICS**:\n` +
            `• Uptime: ${Math.floor(process.uptime() / 3600)} hours\n` +
            `• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
            `• Monitoring: ${this.walletMonitor.getMonitoringStatus().isRunning ? 'Active' : 'Inactive'}\n\n` +
            `*Continuous monitoring active*`;
    }

    formatCriticalNotification(healthData) {
        const errors = healthData.errors.length > 0 ? healthData.errors : ['System health check failed'];
        
        return `🚨 **CRITICAL SYSTEM ALERT** 🚨\n\n` +
            `🔴 **STATUS**: CRITICAL ERROR DETECTED\n` +
            `⚠️ **IMMEDIATE ATTENTION REQUIRED**\n\n` +
            `❌ **ERRORS**:\n${errors.map(err => `• ${err}`).join('\n')}\n\n` +
            `🚨 **IMPACT**: System functionality may be compromised\n` +
            `👨‍💻 **ACTION**: Immediate investigation and resolution required\n\n` +
            `📞 **ESCALATION**: Contact system administrator immediately\n` +
            `⏰ **TIME**: ${new Date().toLocaleString()}\n\n` +
            `*This is an automated critical alert*`;
    }

    async generateHealthReport() {
        const healthData = await this.performHealthCheck();
        
        const report = {
            summary: {
                status: healthData.status,
                timestamp: healthData.timestamp,
                uptime_hours: Math.floor(process.uptime() / 3600)
            },
            details: healthData.checks,
            metrics: healthData.metrics,
            recommendations: this.generateRecommendations(healthData)
        };

        return report;
    }

    generateRecommendations(healthData) {
        const recommendations = [];
        
        // Check memory usage
        if (healthData.metrics.memory_usage && healthData.metrics.memory_usage.heapUsed > 500 * 1024 * 1024) {
            recommendations.push('Consider restarting the bot to free up memory');
        }
        
        // Check monitoring status
        if (!healthData.checks.wallet_monitoring?.is_running) {
            recommendations.push('Restart wallet monitoring service');
        }
        
        // Check Solana connection
        if (healthData.checks.solana_connection?.response_time_ms > 3000) {
            recommendations.push('Solana RPC response time is slow - consider switching RPC endpoint');
        }
        
        // Check bot balance
        if (healthData.metrics.bot_balance < 0.1) {
            recommendations.push('Bot wallet balance is low - consider funding the wallet');
        }
        
        return recommendations;
    }
}

module.exports = HealthCheckService;
