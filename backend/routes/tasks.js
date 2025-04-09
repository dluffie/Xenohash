// routes/tasks.js
const express = require('express');
const User = require('../models/User');
const Task = require('../models/Task');

const router = express.Router();

// Get all available tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get user's task progress
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get all tasks
    const tasks = await Task.find();
    
    // Map tasks with user completion status
    const userTasks = tasks.map(task => {
      const isCompleted = user.tasks.completed.includes(task._id.toString());
      return {
        ...task.toObject(),
        completed: isCompleted
      };
    });
    
    res.json({
      success: true,
      tasks: userTasks,
      referrals: user.tasks.referrals
    });
  } catch (error) {
    console.error('User tasks fetch error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Complete a task
router.post('/complete', async (req, res) => {
  try {
    const { userId, taskId } = req.body;
    
    if (!userId || !taskId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const user = await User.findById(userId);
    const task = await Task.findById(taskId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    // Check if task is already completed (for non-repeatable tasks)
    if (task.type !== 'daily' && user.tasks.completed.includes(taskId)) {
      return res.status(400).json({ success: false, error: 'Task already completed' });
    }
    
    // Process task completion
    let updateData = {};
    
    // Apply reward based on type
    if (task.reward.type === 'energy') {
      updateData = { $inc: { 'energy.current': task.reward.amount } };
    } else if (task.reward.type === 'energy_max') {
      updateData = { $inc: { 'energy.bonus': task.reward.amount } };
    } else if (task.reward.type === 'tokens') {
      updateData = { $inc: { tokens: task.reward.amount } };
    }
    
    // Add task to completed list
    updateData.$addToSet = { 'tasks.completed': taskId };
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Task completed',
      reward: task.reward,
      user: {
        energy: updatedUser.energy,
        tokens: updatedUser.tokens
      }
    });
  } catch (error) {
    console.error('Task completion error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Add referral 
router.post('/referral', async (req, res) => {
  try {
    const { userId, referredUserId } = req.body;
    
    if (!userId || !referredUserId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const user = await User.findById(userId);
    const referredUser = await User.findById(referredUserId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (!referredUser) {
      return res.status(404).json({ success: false, error: 'Referred user not found' });
    }
    
    // Check if this referral already exists
    if (user.tasks.referrals.users.includes(referredUserId)) {
      return res.status(400).json({ success: false, error: 'User already referred' });
    }
    
    // Update user with new referral
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { 'tasks.referrals.count': 1 },
        $push: { 'tasks.referrals.users': referredUserId }
      },
      { new: true }
    );
    
    // Bonus energy for referral
    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'energy.bonus': 200 } }
    );
    
    res.json({
      success: true,
      message: 'Referral added',
      referrals: updatedUser.tasks.referrals
    });
  } catch (error) {
    console.error('Referral error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;