const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
    constructor() {
        this.setupGlobalHandlers();
        this.logFile = path.join(process.cwd(), 'logs', 'error.log');
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    setupGlobalHandlers() {
        process.on('unhandledRejection', (reason, promise) => {
            this.logError('Unhandled Promise Rejection', reason);
        });

        process.on('uncaughtException', (error) => {
            this.logError('Uncaught Exception', error);
            
            // Don't exit for Telegram 403 errors (user blocked bot)
            if (error.message && error.message.includes('403')) {
                console.log('🚫 Bot blocked by user - continuing operation...');
                return;
            }
            
            // Log critical error but don't exit in production
            console.error('💥 Critical error detected');
        });
    }

    async logError(type, error) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type}: ${error.stack || error.message || error}\n`;
        
        console.error(`❌ ${type}:`, error);
        
        try {
            await fs.appendFile(this.logFile, logEntry);
        } catch (writeError) {
            console.error('Failed to write to error log:', writeError);
        }
    }

    handleBotError(err, ctx) {
        this.logError('Bot Error', err);
        
        // Don't crash on Telegram API errors
        if (err.response && err.response.error_code) {
            const errorCode = err.response.error_code;
            const description = err.response.description;
            
            console.log(`🔧 Telegram API Error ${errorCode}: ${description}`);
            
            // Handle specific error codes
            switch (errorCode) {
                case 403:
                    console.log('🚫 Bot was blocked by user');
                    break;
                case 429:
                    console.log('⏳ Rate limited by Telegram');
                    break;
                case 400:
                    console.log('📝 Bad request to Telegram API');
                    break;
                default:
                    console.log('🔧 Other Telegram API error');
            }
            return;
        }
        
        // Handle other errors gracefully
        console.error('❌ Unexpected bot error:', err);
    }

    safeAsync(fn) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.logError('Async Function Error', error);
                throw error;
            }
        };
    }

    safeSync(fn) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.logError('Sync Function Error', error);
                throw error;
            }
        };
    }
}

module.exports = new ErrorHandler();
