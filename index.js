#!/usr/bin/env node

const BirdEyeSniperBot = require('./src/bot');

// Start the bot
async function main() {
    try {
        const bot = new BirdEyeSniperBot();
        await bot.start();
    } catch (error) {
        console.error('❌ Failed to start BirdEye Sniper Bot:', error);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main();
}

module.exports = main;
