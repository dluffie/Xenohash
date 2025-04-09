const mongoose = require('mongoose');

/**
 * Block Schema
 * Represents a mining block in the Xenohash system
 */
const blockSchema = new mongoose.Schema({
  blockNumber: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  hash: {
    type: String,
    required: true,
    unique: true
  },
  previousHash: {
    type: String,
    required: true
  },
  difficulty: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorTelegramId: {
    type: Number,
    required: true
  },
  creatorUsername: {
    type: String
  },
  reward: {
    type: Number,
    required: true
  },
  // Optional nonce that created the successful hash
  nonce: {
    type: String
  },
  // Data used to create the hash (if any)
  data: {
    type: String,
    default: ''
  },
  // Additional metadata about the block
  meta: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Calculate block reward based on block number
blockSchema.statics.calculateReward = function(blockNumber) {
  // Linear decrease formula: Reward_n = 1500 - 0.001 * (BlockNumber_n - 1)
  return 1500 - 0.001 * (blockNumber - 1);
};

// Index for fast lookups by block number and timestamp
blockSchema.index({ blockNumber: -1 }); // Latest blocks first
blockSchema.index({ timestamp: -1 });

// Virtual for getting the age of the block
blockSchema.virtual('age').get(function() {
  return Date.now() - this.timestamp.getTime();
});

// Using the singleton pattern to prevent model overwrite errors
module.exports = mongoose.models.Block || mongoose.model('Block', blockSchema);