const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

console.log("🔑 Solana Private Key Helper");
console.log("============================");

// Option 1: Generate a new wallet
console.log("\n1️⃣ GENERATE NEW WALLET:");
const newKeypair = Keypair.generate();
console.log("   Address:", newKeypair.publicKey.toString());
console.log("   Private Key (base64):", Buffer.from(newKeypair.secretKey).toString('base64'));
console.log("   Private Key (base58):", bs58.default ? bs58.default.encode(newKeypair.secretKey) : bs58.encode(newKeypair.secretKey));

// Option 2: Convert existing key if provided
const existingKey = "2hHRdXuPvR7uYGpYi7wyauSMXzrDrtr5Q31DUpSa1ccaNotU33SYjVgouQp3SvgKAY5hbwnW6ia9XEzkYerN7xo1";

console.log("\n2️⃣ ANALYZING YOUR EXISTING KEY:");
console.log("   Your key:", existingKey.substring(0, 20) + "...");
console.log("   Length:", existingKey.length, "characters");
console.log("   Bytes when converted:", Buffer.from(existingKey).length);

try {
    // Try base58 decode
    const decodeFunc = bs58.default ? bs58.default.decode : bs58.decode;
    const decoded = decodeFunc(existingKey);
    console.log("   ✅ Valid base58 key, length:", decoded.length, "bytes");
    if (decoded.length === 64) {
        console.log("   ✅ Correct length for Solana private key!");
        console.log("   Base64 format:", Buffer.from(decoded).toString('base64'));
        
        // Verify it works
        const keypair = Keypair.fromSecretKey(decoded);
        console.log("   ✅ Valid keypair, address:", keypair.publicKey.toString());
    } else {
        console.log("   ❌ Wrong length for Solana private key (expected 64 bytes)");
    }
} catch (e) {
    console.log("   ❌ Not a valid base58 private key");
    
    // Check if it might be from Phantom wallet export format
    if (existingKey.startsWith('[') && existingKey.endsWith(']')) {
        console.log("   🔍 Looks like an array format from wallet export");
        try {
            const keyArray = JSON.parse(existingKey);
            if (Array.isArray(keyArray) && keyArray.length === 64) {
                const keyBytes = new Uint8Array(keyArray);
                const keypair = Keypair.fromSecretKey(keyBytes);
                console.log("   ✅ Valid array format!");
                console.log("   Address:", keypair.publicKey.toString());
                console.log("   Base64 format:", Buffer.from(keyBytes).toString('base64'));
            }
        } catch (e2) {
            console.log("   ❌ Invalid array format");
        }
    }
}

console.log("\n3️⃣ INSTRUCTIONS:");
console.log("   If you want to use a NEW wallet:");
console.log("   - Copy the base64 private key from option 1 above");
console.log("   - Replace REPLACE_WITH_ACTUAL_BASE64_PRIVATE_KEY in your .env file");
console.log("   - Send SOL to the new address");
console.log("");
console.log("   If you want to use your EXISTING wallet:");
console.log("   - Export private key from Phantom/Solflare (should be base58 or array format)");
console.log("   - Run this script again with the correct format");
console.log("   - Or manually convert using the Solana CLI");

console.log("\n⚠️  SECURITY WARNING:");
console.log("   - Never share your private key");
console.log("   - Store it securely");
console.log("   - Test with small amounts first");
