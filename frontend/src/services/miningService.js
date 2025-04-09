/**
 * Mining service for client-side hashing operations
 */

import { sha256, generateNonce, checkDifficulty } from '../utils/hashUtils';
import { api } from './api';

// Worker instance for mining
let miningWorker = null;
let isActive = false;
let miningMode = 'basic';
let hashCounter = 0;
let startTime = null;
let statsInterval = null;

// Performance configurations for different mining modes
const miningConfigs = {
  basic: {
    batchSize: 10,  // Hashes per iteration
    yieldInterval: 0 // ms between iterations
  },
  turbo: {
    batchSize: 50,
    yieldInterval: 0
  },
  super: {
    batchSize: 100,
    yieldInterval: 0
  },
  nitro: {
    batchSize: 200,
    yieldInterval: 0
  }
};

// Initialize WASM if available (placeholder for actual implementation)
const initWasm = async (mode) => {
  console.log(`WASM initialization for ${mode} mode would happen here`);
  // In real implementation, this would import and initialize appropriate WASM module
  return true;
};

// Start mining process
export const startMiningProcess = async (mode = 'basic') => {
  if (isActive) {
    console.warn('Mining is already active');
    return;
  }
  
  miningMode = mode;
  isActive = true;
  hashCounter = 0;
  startTime = Date.now();
  
  // For WASM modes, initialize the appropriate module
  if (mode !== 'basic') {
    await initWasm(mode);
  }
  
  // Get current mining data from backend
  try {
    const miningData = await api.mining.getStats();
    const { blockNumber, prevHash, difficulty } = miningData;
    
    // Start the mining worker
    if (window.Worker) {
      // Create a new worker
      miningWorker = new Worker(new URL('./miningWorker.js', import.meta.url), { type: 'module' });
      
      // Send initial data to worker
      miningWorker.postMessage({
        action: 'start',
        blockNumber,
        prevHash,
        difficulty,
        mode,
        config: miningConfigs[mode]
      });
      
      // Handle messages from worker
      miningWorker.onmessage = (e) => {
        switch (e.data.type) {
          case 'share':
            // Submit share to the backend
            api.mining.submitShare(e.data.share);
            break;
          case 'stats':
            // Update hash counter for statistics
            hashCounter = e.data.hashCount;
            break;
          case 'error':
            console.error('Mining worker error:', e.data.error);
            break;
        }
      };
    } else {
      // Fallback for browsers without Web Worker support
      console.warn('Web Workers not supported, falling back to main thread mining');
      startMainThreadMining(blockNumber, prevHash, difficulty);
    }
    
    // Start tracking statistics
    statsInterval = setInterval(updateMiningStats, 2000);
    
  } catch (error) {
    console.error('Failed to start mining:', error);
    isActive = false;
    throw error;
  }
};

// Stop mining process
export const stopMiningProcess = async () => {
  isActive = false;
  
  // Stop the worker if exists
  if (miningWorker) {
    miningWorker.terminate();
    miningWorker = null;
  }
  
  // Clear stats interval
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  
  return { success: true };
};

// Update mining statistics
const updateMiningStats = () => {
  if (!startTime) return;
  
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const hashrate = hashCounter / elapsedSeconds;
  
  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('mining-stats', {
    detail: {
      hashrate: Math.round(hashrate),
      totalHashes: hashCounter,
      mode: miningMode,
      elapsedTime: elapsedSeconds
    }
  }));
};

// Fallback mining on main thread
const startMainThreadMining = async (blockNumber, prevHash, difficulty) => {
  const config = miningConfigs[miningMode];
  
  const mineIteration = async () => {
    if (!isActive) return;
    
    try {
      // Mine a batch of hashes
      for (let i = 0; i < config.batchSize; i++) {
        if (!isActive) break;
        
        const nonce = generateNonce();
        const data = `${blockNumber}:${prevHash}:${nonce}`;
        const hash = await sha256(data);
        
        hashCounter++;
        
        // Check if hash meets difficulty
        if (checkDifficulty(hash, difficulty)) {
          // Valid share found, submit it
          const share = { blockNumber, prevHash, nonce, hash };
          api.mining.submitShare(share);
        }
      }
      
      // Yield to prevent UI freezing
      if (config.yieldInterval > 0) {
        setTimeout(mineIteration, config.yieldInterval);
      } else {
        setTimeout(mineIteration, 0);
      }
    } catch (error) {
      console.error('Mining error:', error);
      isActive = false;
    }
  };
  
  // Start the mining loop
  mineIteration();
};