// services/blockService.js
const Block = require('../models/Block');
const User = require('../models/User');

/**
 * Get blocks with pagination
 */
async function getBlocks(page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const blocks = await Block.find()
      .sort({ blockNumber: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username');
    
    const total = await Block.countDocuments();
    
    return {
      blocks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
}

/**
 * Get block by number
 */
async function getBlockByNumber(blockNumber) {
  try {
    return await Block.findOne({ blockNumber })
      .populate('creator', 'username');
  } catch (error) {
    console.error(`Error fetching block #${blockNumber}:`, error);
    throw error;
  }
}

/**
 * Get blocks found by a specific user
 */
async function getUserBlocks(userId, page = 1, limit = 20) {
  try {
    const skip = (page - 1) * limit;
    
    const blocks = await Block.find({ creator: userId })
      .sort({ blockNumber: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Block.countDocuments({ creator: userId });
    
    return {
      blocks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error(`Error fetching user blocks for ${userId}:`, error);
    throw error;
  }
}

/**
 * Get mining statistics
 */
async function getStatistics() {
  try {
    // Get total blocks mined
    const totalBlocksMined = await Block.countDocuments();
    
    // Get total tokens issued
    const tokenStats = await Block.aggregate([
      { $group: { _id: null, totalTokens: { $sum: '$reward' } } }
    ]);
    const totalTokensIssued = tokenStats.length > 0 ? tokenStats[0].totalTokens : 0;
    
    // Get user count
    const totalUsers = await User.countDocuments();
    
    // Get project start date (first block)
    const firstBlock = await Block.findOne().sort({ blockNumber: 1 });
    const startDate = firstBlock ? firstBlock.timestamp : new Date();
    
    // Get recent mining rate (blocks per hour in the last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBlocksCount = await Block.countDocuments({ timestamp: { $gte: oneDayAgo } });
    const blocksPerHour = recentBlocksCount / 24;
    
    return {
      totalBlocksMined,
      totalTokensIssued,
      totalUsers,
      startDate,
      blocksPerHour,
      totalMaxBlocks: parseInt(process.env.TOTAL_BLOCKS) || 1000000,
      miningProgress: (totalBlocksMined / (parseInt(process.env.TOTAL_BLOCKS) || 1000000)) * 100
    };
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

module.exports = {
  getBlocks,
  getBlockByNumber,
  getUserBlocks,
  getStatistics
};