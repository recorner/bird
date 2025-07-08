const fs = require('fs').promises;
const config = require('../config/config');
const errorHandler = require('../utils/errorHandler');

class UserDataManager {
    constructor() {
        this.dataFile = config.DATA_FILE;
        this.users = {};
        this.loadUserData();
    }

    async loadUserData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            this.users = JSON.parse(data);
            console.log('📊 User data loaded successfully');
            return this.users;
        } catch (error) {
            console.log('📁 Creating new user data file...');
            this.users = {};
            await this.saveUserData();
            return this.users;
        }
    }

    async saveUserData() {
        try {
            await fs.writeFile(this.dataFile, JSON.stringify(this.users, null, 2));
        } catch (error) {
            await errorHandler.logError('Save User Data Error', error);
            throw error;
        }
    }

    getUser(userId) {
        return this.users[userId.toString()] || null;
    }

    async createUser(userId, userData = {}) {
        const userIdStr = userId.toString();
        this.users[userIdStr] = {
            id: userIdStr,
            created_at: new Date().toISOString(),
            setup_step: 'start',
            monitor_enabled: true,
            ...userData
        };
        await this.saveUserData();
        return this.users[userIdStr];
    }

    async updateUser(userId, updates) {
        const userIdStr = userId.toString();
        if (!this.users[userIdStr]) {
            await this.createUser(userId, updates);
        } else {
            this.users[userIdStr] = { ...this.users[userIdStr], ...updates };
            await this.saveUserData();
        }
        return this.users[userIdStr];
    }

    async deleteUser(userId) {
        const userIdStr = userId.toString();
        delete this.users[userIdStr];
        await this.saveUserData();
    }

    getAllUsers() {
        return this.users;
    }

    getUsersCount() {
        return Object.keys(this.users).length;
    }

    getActiveUsers() {
        return Object.values(this.users).filter(user => user.monitor_enabled !== false);
    }

    getUsersBySetupStep(step) {
        return Object.values(this.users).filter(user => user.setup_step === step);
    }

    async resetUserSetup(userId) {
        await this.updateUser(userId, {
            setup_step: 'start',
            email: null,
            ip: null,
            wallet_generated: false
        });
    }

    async completeUserSetup(userId) {
        await this.updateUser(userId, {
            setup_step: 'completed',
            setup_completed_at: new Date().toISOString()
        });
    }
}

module.exports = UserDataManager;
