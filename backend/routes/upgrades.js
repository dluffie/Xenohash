// routes/upgrades.js
const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Get available upgrades
router.get('/', (req, res) => {
  try {
    // Define available upgrades
    const upgrades = [
      {
        id: 'turbo',
        name: 'Turbo',
        description: 'Unlock WASM Tier 1 mining (2x faster)',
        price: 1000,
        miningLevel: 'Turbo',
        multiplier: 2
      },
      {
        id: 'super',
        name: 'Super',
        description: 'Unlock WASM Tier 2 mining (4x faster)',
        price: 3000,
        miningLevel: 'Super',
        multiplier: 4
      },
      {
        id: 'nitro',
        name: 'Nitro',
        description: 'Unlock WASM Tier 3 mining (8x faster, device may heat)',
        price: 10000,
        miningLevel: 'Nitro',
        multiplier: 8
      }
    ];
    
    // Define passive mining options
    const passiveOptions = [
      {
        id: 'passive_1day',
        name: '1 Day Passive Mining',
        description: 'Rent server hash power for 1 day',
        price: 500,
        duration: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      },
      {
        id: 'passive_7day',
        name: '7 Day Passive Mining',
        description: 'Rent server hash power for 7 days',
        price: 3000,
        duration: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      },
      {
        id: 'passive_30day',
        name: '30 Day Passive Mining',
        description: 'Rent server hash power for 30 days',
        price: 10000,
        duration: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
      }
    ];
    
    res.json({
      success: true,
      upgrades,
      passiveOptions
    });
  } catch (error) {
    console.error('Upgrades fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Purchase an upgrade
router.post('/purchase', async (req, res) => {
  try {
    const { userId, upgradeId } = req.body;
    
    if (!userId || !upgradeId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Define upgrades with prices and properties
    const upgrades = {
      'turbo': {
        price: 1000,
        miningLevel: 'Turbo'
      },
      'super': {
        price: 3000,
        miningLevel: 'Super'
      },
      'nitro': {
        price: 10000,
        miningLevel: 'Nitro'
      }
    };
    
    // Get the selected upgrade
    const upgrade = upgrades[upgradeId];
    
    if (!upgrade) {
      return res.status(404).json({ success: false, error: 'Upgrade not found' });
    }
    
    // Check if user can afford the upgrade
    if (user.tokens < upgrade.price) {
      return res.status(400).json({ success: false, error: 'Not enough tokens' });
    }
    
    // Check if user already has this upgrade or better
    const miningLevels = ['Basic', 'Turbo', 'Super', 'Nitro'];
    const currentLevelIndex = miningLevels.indexOf(user.miningLevel);
    const newLevelIndex = miningLevels.indexOf(upgrade.miningLevel);
    
    if (currentLevelIndex >= newLevelIndex) {
      return res.status(400).json({ success: false, error: 'You already have this level or better' });
    }
    
    // Update user with new mining level and deduct tokens
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: { miningLevel: upgrade.miningLevel },
        $inc: { tokens: -upgrade.price }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: `Upgraded to ${upgrade.miningLevel} mining`,
      user: {
        tokens: updatedUser.tokens,
        miningLevel: updatedUser.miningLevel
      }
    });
  } catch (error) {
    console.error('Upgrade purchase error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Purchase passive mining
router.post('/passive', async (req, res) => {
  try {
    const { userId, optionId } = req.body;
    
    if (!userId || !optionId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Define passive mining options
    const passiveOptions = {
      'passive_1day': {
        price: 500,
        duration: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      },
      'passive_7day': {
        price: 3000,
        duration: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      },
      'passive_30day': {
        price: 10000,
        duration: 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
      }
    };
    
    // Get the selected option
    const option = passiveOptions[optionId];
    
    if (!option) {
      return res.status(404).json({ success: false, error: 'Option not found' });
    }
    
    // Check if user can afford the option
    if (user.tokens < option.price) {
      return res.status(400).json({ success: false, error: 'Not enough tokens' });
    }
    
    // Calculate expiration date
    let expiresAt = new Date();
    
    // If user already has passive mining, extend from the current expiration date
    if (user.passiveMining.active && user.passiveMining.expiresAt > new Date()) {
      expiresAt = new Date(user.passiveMining.expiresAt.getTime() + option.duration);
    } else {
      expiresAt = new Date(Date.now() + option.duration);
    }
    
    // Update user with passive mining and deduct tokens
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'passiveMining.active': true,
          'passiveMining.expiresAt': expiresAt
        },
        $inc: { tokens: -option.price }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Passive mining purchased',
      user: {
        tokens: updatedUser.tokens,
        passiveMining: updatedUser.passiveMining
      }
    });
  } catch (error) {
    console.error('Passive mining purchase error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;