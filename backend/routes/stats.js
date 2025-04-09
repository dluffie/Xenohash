// routes/stats.js
const express = require('express');
const User = require('../models/User');
const Block = require('../models/Block');
const miningService = require('../services/miningService');

const router = express.Router();

// Get global stats
router.get('/', async (req, res) => {
  try {
    // Get total blocks mined
    const totalBlocksMined = await Block.countDocuments();
    
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get total tokens issued
    const tokenStats = await Block.aggregate([
      { $group: { _id: null, totalTokens: { $sum: '$reward' } } }
    ]);
    const totalTokensIssued = tokenStats.length > 0 ? tokenStats[0].totalTokens : 0;
    
    // Get mining stats
    const miningStats = miningService.getMiningStats();
    
    // Get project start date (first block timestamp)
    const firstBlock = await Block.findOne().sort({ blockNumber: 1 });
    const projectStartDate = firstBlock ? firstBlock.timestamp : new Date();
    
    // Calculate mining progress percentage
    const totalMaxBlocks = parseInt(process.env.TOTAL_BLOCKS) || 1000000;
    const miningProgress = (totalBlocksMined / totalMaxBlocks) * 100;
    
    res.json({
      success: true,
      stats: {
        totalBlocksMined,
        totalUsers,
        totalTokensIssued,
        totalMaxBlocks,
        miningProgress: parseFloat(miningProgress.toFixed(4)),
        projectStartDate,
        currentBlockNumber: miningStats.currentBlockNumber,
        currentDifficulty: miningStats.currentDifficulty,
        nextBlockReward: miningStats.nextBlockReward,
        minersOnline: miningStats.minersOnline
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get leaderboard 
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const leaderboard = await User.find()
      .sort({ tokens: -1 })
      .limit(limit)
      .select('username tokens blocksCreated');
    
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get recent blocks
router.get('/blocks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const blocks = await Block.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username')
      .select('blockNumber hash reward difficulty timestamp creator');
    
    const total = await Block.countDocuments();
    
    res.json({
      success: true,
      blocks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Blocks fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get block details
router.get('/blocks/:blockNumber', async (req, res) => {
  try {
    const block = await Block.findOne({ blockNumber: req.params.blockNumber })
      .populate('creator', 'username');
    
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block not found' });
    }
    
    res.json({
      success: true,
      block
    });
  } catch (error) {
    console.error('Block fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;