const { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const axios = require('axios');
const config = require('../config/config');
const errorHandler = require('../utils/errorHandler');

class SolanaManager {
    constructor() {
        this.connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');
        this.helius_api_key = config.HELIUS_API_KEY;
        this.helius_url = config.HELIUS_URL;
        this.botAddress = config.SOLANA_ADDRESS;
        this.botKeypair = this.loadBotKeypair();
        this.solPriceCache = null; // Initialize SOL price cache
    }

    loadBotKeypair() {
        try {
            if (!config.SOLANA_PRIVATE_KEY) {
                console.warn('⚠️ SOLANA_PRIVATE_KEY not configured');
                return null;
            }
            
            // Try to decode as base64 first
            let secretKey;
            try {
                secretKey = Buffer.from(config.SOLANA_PRIVATE_KEY, 'base64');
            } catch (error) {
                // If base64 fails, try base58
                try {
                    secretKey = bs58.decode(config.SOLANA_PRIVATE_KEY);
                } catch (error2) {
                    throw new Error('Invalid private key format. Must be base64 or base58.');
                }
            }
            
            return Keypair.fromSecretKey(secretKey);
        } catch (error) {
            console.error('❌ Error loading bot keypair:', error);
            return null;
        }
    }

    async getWalletBalance(address) {
        try {
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            await errorHandler.logError(`Get Balance Error for ${address}`, error);
            return 0;
        }
    }

    async getTransactionDetails(signature) {
        try {
            if (this.helius_api_key) {
                const response = await axios.post(
                    `${this.helius_url}/transactions`,
                    { transactions: [signature] },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        params: {
                            'api-key': this.helius_api_key
                        }
                    }
                );
                
                if (response.data && response.data.length > 0) {
                    return response.data[0];
                }
            } else {
                // Fallback to basic RPC
                const transaction = await this.connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                return transaction;
            }
        } catch (error) {
            await errorHandler.logError('Get Transaction Details Error', error);
            return null;
        }
    }

    async sendTransaction(fromKeypair, toAddress, amount) {
        try {
            if (!fromKeypair) {
                throw new Error('Bot keypair not available');
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: new PublicKey(toAddress),
                    lamports: Math.floor(amount * LAMPORTS_PER_SOL),
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
            await errorHandler.logError('Send Transaction Error', error);
            throw error;
        }
    }

    async getRecentTransactions(address, limit = 5) {
        try {
            const publicKey = new PublicKey(address);
            const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
            return signatures;
        } catch (error) {
            await errorHandler.logError(`Get Recent Transactions Error for ${address}`, error);
            return [];
        }
    }

    isValidSolanaAddress(address) {
        try {
            new PublicKey(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    getBotAddress() {
        return this.botAddress;
    }

    async getBotBalance() {
        if (!this.botAddress) return 0;
        return await this.getWalletBalance(this.botAddress);
    }

    async getSolPrice() {
        try {
            // Cache price for 5 minutes to avoid excessive API calls
            const now = Date.now();
            if (this.solPriceCache && (now - this.solPriceCache.timestamp) < 300000) {
                return this.solPriceCache.price;
            }

            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const price = response.data.solana.usd;
            
            // Cache the price
            this.solPriceCache = {
                price: price,
                timestamp: now
            };
            
            return price;
        } catch (error) {
            console.warn('Failed to fetch SOL price:', error.message);
            // Return cached price if available, otherwise default
            return this.solPriceCache ? this.solPriceCache.price : 100; // Default fallback price
        }
    }
}

module.exports = SolanaManager;
