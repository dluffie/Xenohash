// services/miningService.js
const crypto = require('crypto');
const User = require('../models/User');
const Block = require('../models/Block');
const difficultyService = require('./difficultyService');

let currentBlockNumber = 1;
let currentDifficulty = process.env.INITIAL_DIFFICULTY || 1;
let minersOnline = 0;
let currentBlockStartTime = Date.now();
let bestShareForCurrentBlock = null;
let bestShareUser = null;

// Initialize mining state from database
async function initializeMiningState() {
  try {
    const lastBlock = await Block.findOne().sort({ blockNumber: -1 });
    if (lastBlock) {
      currentBlockNumber = lastBlock.blockNumber + 1;
      currentDifficulty = lastBlock.difficulty;
    }
    console.log(`Mining initialized: Block #${currentBlockNumber}, Difficulty: ${currentDifficulty}`);
  } catch (error) {
    console.error('Error initializing mining state:', error);
  }
}

// Calculate block reward using linear decrease formula
function calculateBlockReward(blockNumber) {
  const initialReward = parseFloat(process.env.INITIAL_REWARD) || 1500;
  const decreaseRate = parseFloat(process.env.REWARD_DECREASE_RATE) || 0.001;
  const reward = initialReward - decreaseRate * (blockNumber - 1);
  return Math.max(reward, 0); // Ensure reward doesn't go negative
}

// Validate a share submitted by a client
function validateShare(data, difficulty) {
  try {
    const { nonce, blockNumber } = data;
    
    // Ensure the share is for the current block
    if (blockNumber !== currentBlockNumber) {
      return { valid: false, reason: 'Wrong block number' };
    }
    
    // Create the input string to hash (using the blockNumber and nonce)
    const input = `${blockNumber}:${nonce}`;
    
    // Compute SHA-256 hash
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    
    // Convert difficulty to a target value
    // Lower difficulty value means more leading zeros required
    const target = 2 ** (256 - 256 * difficulty);
    
    // Convert hash to a numeric value for comparison
    const hashValue = BigInt(`0x${hash}`);
    
    // Check if hash meets difficulty requirement
    const valid = hashValue < BigInt(Math.floor(target));
    
    return { 
      valid, 
      hash, 
      hashValue: hashValue.toString(),
      reason: valid ? 'Share accepted' : 'Share rejected: difficulty not met'
    };
  } catch (error) {
    console.error('Share validation error:', error);
    return { valid: false, reason: 'Validation error' };
  }
}

// Process a share submission from a client
async function submitShare(userId, shareData) {
  try {
    const validation = validateShare(shareData, currentDifficulty);
    
    if (!validation.valid) {
      return { 
        success: false, 
        message: validation.reason 
      };
    }
    
    // Check if this is the best share for the current block
    const hashValue = BigInt(validation.hashValue);
    
    if (!bestShareForCurrentBlock || hashValue < bestShareForCurrentBlock.hashValue) {
      bestShareForCurrentBlock = {
        hash: validation.hash,
        hashValue,
        userId
      };
      bestShareUser = userId;
    }
    
    // Return success to the client
    return {
      success: true,
      message: 'Share accepted',
      isBestShare: bestShareUser === userId
    };
  } catch (error) {
    console.error('Error processing share:', error);
    return { success: false, message: 'Server error processing share' };
  }
}

// Finalize a block and award the reward to the winner
async function createNewBlock() {
  if (!bestShareForCurrentBlock) {
    return null; // No valid shares for this block
  }
  
  try {
    // Calculate block time
    const blockTime = Date.now() - currentBlockStartTime;
    
    // Calculate block reward
    const reward = calculateBlockReward(currentBlockNumber);
    
    // Create new block in database
    const block = new Block({
      blockNumber: currentBlockNumber,
      hash: bestShareForCurrentBlock.hash,
      creator: bestShareForCurrentBlock.userId,
      reward,
      difficulty: currentDifficulty,
      minersOnline
    });
    
    await block.save();
    
    // Update user's balance and stats
    await User.findByIdAndUpdate(
      bestShareForCurrentBlock.userId,
      {
        $inc: {
          tokens: reward,
          blocksCreated: 1
        }
      }
    );
    
    // Adjust difficulty for next block
    const newDifficulty = difficultyService.adjustDifficulty(
      currentDifficulty,
      blockTime
    );
    
    // Prepare for next block
    currentBlockNumber++;
    currentDifficulty = newDifficulty;
    currentBlockStartTime = Date.now();
    
    // Reset best share tracker
    const completedBlock = {
      ...block.toObject(),
      blockTime
    };
    
    bestShareForCurrentBlock = null;
    bestShareUser = null;
    
    return completedBlock;
  } catch (error) {
    console.error('Error creating new block:', error);
    return null;
  }
}

// Update online miners count
function updateMinersCount(count) {
  minersOnline = count;
}

// Get current mining stats
function getMiningStats() {
  return {
    currentBlockNumber,
    currentDifficulty,
    nextBlockReward: calculateBlockReward(currentBlockNumber),
    minersOnline,
    totalBlocks: process.env.TOTAL_BLOCKS || 1000000
  };
}

// Manage user energy
async function updateUserEnergy(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    
    const now = Date.now();
    const secondsElapsed = Math.floor((now - user.energy.lastUpdated) / 1000);
    const rechargeRate = parseInt(process.env.ENERGY_RECHARGE_RATE) || 1;
    
    // Calculate new energy based on recharge time
    let newEnergy = user.energy.current + (secondsElapsed * rechargeRate);
    const maxEnergy = user.energy.max + user.energy.bonus;
    
    // Cap energy at max
    newEnergy = Math.min(newEnergy, maxEnergy);
    
    // Update user energy
    user.energy.current = newEnergy;
    user.energy.lastUpdated = now;
    await user.save();
    
    return user.energy;
  } catch (error) {
    console.error('Error updating user energy:', error);
    return null;
  }
}

// Consume energy when mining
async function consumeEnergy(userId, amount) {
  try {
    // First update energy to account for recharging
    await updateUserEnergy(userId);
    
    // Then consume the energy
    const result = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { 'energy.current': -amount }
      },
      { new: true }
    );
    
    return result.energy;
  } catch (error) {
    console.error('Error consuming energy:', error);
    return null;
  }
}

module.exports = {
  initializeMiningState,
  validateShare,
  submitShare,
  createNewBlock,
  updateMinersCount,
  getMiningStats,
  updateUserEnergy,
  consumeEnergy,
  calculateBlockReward
};