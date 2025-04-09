/**
 * Utilities for hashing and mining operations
 */

// SHA-256 hash function
export const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };
  
  // Convert hex string to BigInt for numeric comparison
  export const hexToBigInt = (hex) => {
    return BigInt(`0x${hex}`);
  };
  
  // Calculate difficulty target (max hash value to be considered valid)
  export const calculateTarget = (difficulty) => {
    // Calculate target as maximum hash value divided by difficulty
    // For SHA-256, max value is 2^256 - 1
    const maxHash = 2n ** 256n - 1n;
    return maxHash / BigInt(Math.max(1, difficulty));
  };
  
  // Check if a hash meets the difficulty requirement
  export const checkDifficulty = (hash, difficulty) => {
    const hashValue = hexToBigInt(hash);
    const target = calculateTarget(difficulty);
    return hashValue <= target;
  };
  
  // Find number of leading zeros in a hex hash
  export const countLeadingZeros = (hash) => {
    for (let i = 0; i < hash.length; i++) {
      if (hash[i] !== '0') {
        return i;
      }
    }
    return hash.length;
  };
  
  // Generate a random nonce for mining
  export const generateNonce = () => {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
  };