// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  tokens: {
    type: Number,
    default: 0
  },
  blocksCreated: {
    type: Number,
    default: 0
  },
  energy: {
    current: {
      type: Number,
      default: 5000
    },
    max: {
      type: Number,
      default: 5000
    },
    bonus: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  miningLevel: {
    type: String,
    enum: ['Basic', 'Turbo', 'Super', 'Nitro'],
    default: 'Basic'
  },
  passiveMining: {
    active: {
      type: Boolean,
      default: false
    },
    expiresAt: Date
  },
  tasks: {
    completed: [String],
    referrals: {
      count: {
        type: Number,
        default: 0
      },
      users: [String]
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);

// models/Block.js


const BlockSchema = new mongoose.Schema({
  blockNumber: {
    type: Number,
    required: true,
    unique: true
  },
  hash: {
    type: String,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reward: {
    type: Number,
    required: true
  },
  difficulty: {
    type: Number,
    required: true
  },
  minersOnline: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Block', BlockSchema);

// models/Task.js


const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['daily', 'weekly', 'referral', 'one-time'],
    required: true
  },
  reward: {
    type: {
      type: String,
      enum: ['energy', 'energy_max', 'tokens'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  },
  requirements: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', TaskSchema);