// websocket/wsServer.js
const WebSocket = require('ws');
const crypto = require('crypto');
const User = require('../models/User');
const miningService = require('../services/miningService');
const telegramAuth = require('../utils/telegramAuth');

let wss;
let clients = new Map(); // Map of client connections with user data
let blockCheckInterval = null;

// Initialize WebSocket server
function initialize(server) {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', onConnect);
  
  // Set up interval to check if a new block should be created
  blockCheckInterval = setInterval(checkForNewBlock, 1000);
  
  console.log('WebSocket server initialized');
  return wss;
}

// Handle new WebSocket connections
async function onConnect(ws) {
  console.log('New client connected');
  
  ws.isAlive = true;
  
  // Set up ping-pong to detect disconnected clients
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'auth':
          handleAuth(ws, data);
          break;
        
        case 'startMining':
          handleStartMining(ws, data);
          break;
        
        case 'stopMining':
          handleStopMining(ws, data);
          break;
        
        case 'share':
          handleShareSubmission(ws, data);
          break;
        
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      send(ws, { type: 'error', message: 'Error processing message' });
    }
  });
  
  // Handle disconnections
  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  // Send initial welcome message
  send(ws, { type: 'connect', message: 'Connected to Xenohash mining server' });
}

// Handle client authentication
async function handleAuth(ws, data) {
  try {
    // Validate Telegram initData
    const authResult = telegramAuth.validateAuthData(data.initData);
    
    if (!authResult.valid) {
      return send(ws, { type: 'auth', success: false, error: 'Invalid authentication' });
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
    
    // Store user information with the connection
    clients.set(ws, {
      userId: user._id,
      telegramId,
      username: user.username,
      mining: false,
      miningLevel: user.miningLevel
    });
    
    // Get updated energy status
    const energyStatus = await miningService.updateUserEnergy(user._id);
    
    // Send success response with user data
    send(ws, {
      type: 'auth',
      success: true,
      user: {
        id: user._id,
        username: user.username,
        tokens: user.tokens,
        blocksCreated: user.blocksCreated,
        energy: energyStatus,
        miningLevel: user.miningLevel,
        passiveMining: user.passiveMining
      },
      miningStats: miningService.getMiningStats()
    });
    
    console.log(`User authenticated: ${user.username} (${telegramId})`);
  } catch (error) {
    console.error('Authentication error:', error);
    send(ws, { type: 'auth', success: false, error: 'Authentication error' });
  }
}

// Handle start mining request
async function handleStartMining(ws, data) {
  const client = clients.get(ws);
  
  if (!client) {
    return send(ws, { type: 'error', message: 'Not authenticated' });
  }
  
  try {
    // Update user's energy before checking if they have enough
    const user = await User.findById(client.userId);
    await miningService.updateUserEnergy(client.userId);
    
    // Check if user has enough energy
    if (user.energy.current <= 0) {
      return send(ws, { 
        type: 'miningStatus', 
        mining: false, 
        error: 'Not enough energy' 
      });
    }
    
    // Update client state
    client.mining = true;
    client.miningMode = data.mode || 'Basic';
    clients.set(ws, client);
    
    // Update miners count
    updateMinersCount();
    
    // Send mining info to client
    send(ws, {
      type: 'miningStatus',
      mining: true,
      mode: client.miningMode,
      miningStats: miningService.getMiningStats()
    });
    
    console.log(`User started mining: ${client.username}, Mode: ${client.miningMode}`);
  } catch (error) {
    console.error('Error starting mining:', error);
    send(ws, { type: 'error', message: 'Error starting mining' });
  }
}

// Handle stop mining request
function handleStopMining(ws) {
  const client = clients.get(ws);
  
  if (!client) {
    return send(ws, { type: 'error', message: 'Not authenticated' });
  }
  
  // Update client state
  client.mining = false;
  clients.set(ws, client);
  
  // Update miners count
  updateMinersCount();
  
  // Send confirmation to client
  send(ws, {
    type: 'miningStatus',
    mining: false,
    miningStats: miningService.getMiningStats()
  });
  
  console.log(`User stopped mining: ${client.username}`);
}

// Handle share submission
async function handleShareSubmission(ws, data) {
  const client = clients.get(ws);
  
  if (!client || !client.mining) {
    return send(ws, { 
      type: 'shareResult', 
      success: false, 
      message: client ? 'Not mining' : 'Not authenticated' 
    });
  }
  
  try {
    // Consume energy for share submission (this is where energy is spent)
    // The amount could vary based on mining mode
    const energyConsumption = getEnergyConsumptionRate(client.miningMode);
    const energyStatus = await miningService.consumeEnergy(client.userId, energyConsumption);
    
    // If user ran out of energy, stop mining
    if (energyStatus.current <= 0) {
      client.mining = false;
      clients.set(ws, client);
      updateMinersCount();
      
      return send(ws, {
        type: 'shareResult',
        success: false,
        message: 'Out of energy',
        energy: energyStatus,
        miningStatus: { mining: false }
      });
    }
    
    // Process the share
    const result = await miningService.submitShare(client.userId, data);
    
    // Send result to client
    send(ws, {
      type: 'shareResult',
      success: result.success,
      message: result.message,
      energy: energyStatus,
      isBestShare: result.isBestShare
    });
  } catch (error) {
    console.error('Error processing share:', error);
    send(ws, { type: 'shareResult', success: false, message: 'Server error' });
  }
}

// Handle client disconnection
function handleDisconnect(ws) {
  const client = clients.get(ws);
  
  if (client) {
    console.log(`User disconnected: ${client.username}`);
    clients.delete(ws);
    updateMinersCount();
  } else {
    console.log('Unknown client disconnected');
  }
}

// Check if conditions are met to create a new block
async function checkForNewBlock() {
  const newBlock = await miningService.createNewBlock();
  
  if (newBlock) {
    // Broadcast new block to all clients
    broadcast({
      type: 'newBlock',
      block: {
        blockNumber: newBlock.blockNumber,
        hash: newBlock.hash,
        creator: newBlock.creator,
        reward: newBlock.reward,
        timestamp: newBlock.timestamp
      },
      miningStats: miningService.getMiningStats()
    });
    
    console.log(`New block created: #${newBlock.blockNumber}, Reward: ${newBlock.reward}`);
  }
}

// Update count of online miners
function updateMinersCount() {
  let miningCount = 0;
  
  for (const [_, client] of clients) {
    if (client.mining) {
      miningCount++;
    }
  }
  
  miningService.updateMinersCount(miningCount);
  
  return miningCount;
}

// Get energy consumption rate based on mining mode
function getEnergyConsumptionRate(mode) {
  const rates = {
    'Basic': 1,
    'Turbo': 2,
    'Super': 3,
    'Nitro': 5
  };
  
  return rates[mode] || 1;
}

// Send message to a client
function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Broadcast message to all connected clients
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Set up heartbeat to detect disconnected clients
function setupHeartbeat() {
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        handleDisconnect(ws);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
}

module.exports = {
  initialize,
  broadcast
};