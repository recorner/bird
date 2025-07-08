require('dotenv').config();

class Config {
    constructor() {
        this.BOT_TOKEN = process.env.BOT_TOKEN;
        this.GROUP_ID = process.env.GROUP_ID;
        this.ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').filter(id => id);
        this.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.SOLANA_WSS_URL = process.env.SOLANA_WSS_URL;
        this.SOLANA_ADDRESS = process.env.SOLANA_ADDRESS;
        this.SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
        this.HELIUS_API_KEY = process.env.HELIUS_API_KEY;
        this.HELIUS_URL = process.env.HELIUS_URL || 'https://api.helius.xyz/v0';
        this.DATA_FILE = process.env.DATA_FILE || 'users.json';
        this.NODE_ENV = process.env.NODE_ENV || 'development';
        
        this.validateConfig();
    }

    validateConfig() {
        if (!this.BOT_TOKEN) {
            throw new Error('BOT_TOKEN is required in .env file');
        }
        if (!this.GROUP_ID) {
            console.warn('⚠️ GROUP_ID not set - group notifications will be disabled');
        }
        if (!this.SOLANA_ADDRESS) {
            throw new Error('SOLANA_ADDRESS is required in .env file');
        }
    }

    isDevelopment() {
        return this.NODE_ENV === 'development';
    }

    isProduction() {
        return this.NODE_ENV === 'production';
    }
}

module.exports = new Config();
