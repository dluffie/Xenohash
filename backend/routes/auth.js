// routes/auth.js
const express = require('express');
const User = require('../models/User');
const telegramAuth = require('../utils/telegramAuth');

const router = express.Router();

// Verify Telegram authentication
router.post('/verify', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ success: false, error: 'No authentication data provided' });
    }
    
    const authResult = telegramAuth.validateAuthData(initData);
    
    if (!authResult.valid) {
      return res.status(401).json({ success: false, error: authResult.error });
    }
    
    const { id: telegramId, username, first_name, last_name } = authResult.user;
    
    // Find or create user
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      user = new User({
        telegramId,
        username: username || `user_${telegramId}`,
        firstName: first_name,
        lastName: last_name
      });
      await user.save();
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        tokens: user.tokens,
        blocksCreated: user.blocksCreated,
        energy: user.energy,
        miningLevel: user.miningLevel
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        tokens: user.tokens,
        blocksCreated: user.blocksCreated,
        energy: user.energy,
        miningLevel: user.miningLevel,
        passiveMining: user.passiveMining,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;