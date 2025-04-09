const mongoose = require('mongoose');

/**
 * Task Schema
 * Represents tasks that users can complete to earn energy bonuses
 */
const taskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'onetime', 'referral', 'social'],
    required: true
  },
  reward: {
    // Energy amount rewarded for completion
    energy: {
      type: Number,
      default: 0
    },
    // Maximum energy capacity increase
    maxEnergyBonus: {
      type: Number,
      default: 0
    },
    // Any tokens rewarded (if applicable)
    tokens: {
      type: Number,
      default: 0
    }
  },
  requirements: {
    // For counted tasks (e.g., "Invite 10 friends")
    count: {
      type: Number,
      default: 0
    },
    // For tasks with specific actions or validations
    action: {
      type: String,
      trim: true
    },
    // Additional validation data
    validationData: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  // Task availability (e.g., during promotions)
  availability: {
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date, 
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  // Task ordering in the UI
  displayOrder: {
    type: Number,
    default: 0
  },
  // For frontend display
  icon: {
    type: String,
    default: '✅'
  }
}, {
  timestamps: true
});

// Method to check if a task is currently available
taskSchema.methods.isAvailable = function() {
  const now = new Date();
  
  // Check if task is marked as active
  if (!this.availability.isActive) return false;
  
  // Check start date if specified
  if (this.availability.startDate && now < this.availability.startDate) return false;
  
  // Check end date if specified
  if (this.availability.endDate && now > this.availability.endDate) return false;
  
  return true;
};

// Static method to get all active tasks
taskSchema.statics.getActiveTasks = function() {
  const now = new Date();
  
  return this.find({
    'availability.isActive': true,
    $or: [
      { 'availability.startDate': null },
      { 'availability.startDate': { $lte: now } }
    ],
    $or: [
      { 'availability.endDate': null },
      { 'availability.endDate': { $gte: now } }
    ]
  }).sort('displayOrder');
};

// Using the singleton pattern to prevent model overwrite errors
module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);