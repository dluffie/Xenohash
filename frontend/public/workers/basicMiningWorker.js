// Basic Mining Worker using JavaScript SHA-256
// This is the entry-level mining implementation

// Import SHA-256 implementation (using pure JS for compatibility)
self.importScripts('/lib/sha256.min.js');

// Variables for mining
let mining = false;
let blockHeight = 0;
let prevHash = '';
let difficulty = 0;
let target = '';
let startNonce = Math.floor(Math.random() * 100000);
let currentNonce = startNonce;
let hashCount = 0;
let lastReportTime = 0;

// Start mining process
function startMining(data) {
  // Update mining parameters
  blockHeight = data.blockHeight || blockHeight;
  prevHash = data.prevHash || prevHash;
  difficulty = data.difficulty || difficulty;
  target = data.target || target;
  
  // Reset counters
  startNonce = Math.floor(Math.random() * 100000);
  currentNonce = startNonce;
  hashCount = 0;
  lastReportTime = Date.now();
  
  // Set mining flag
  mining = true;
  
  // Start the mining loop
  miningLoop();
}

// Stop mining process
function stopMining() {
  mining = false;
}

// Main mining loop
function miningLoop() {
  // Check if mining is active
  if (!mining) return;
  
  // Create data to hash (previous block hash + nonce)
  const timestamp = Date.now();
  const dataToHash = prevHash + currentNonce.toString() + timestamp.toString();
  
  // Calculate SHA-256 hash
  const hash = sha256(dataToHash);
  
  // Check if hash meets difficulty target
  if (hash <= target) {
    // Found valid hash, notify main thread
    self.postMessage({
      type: 'hash_found',
      hash: hash,
      nonce: currentNonce,
      timestamp: timestamp,
      blockHeight: blockHeight,
      dataToHash: dataToHash
    });
  }
  
  // Increment counters
  currentNonce++;
  hashCount++;
  
  // Report hash rate periodically (every second)
  const now = Date.now();
  if (now - lastReportTime >= 1000) {
    self.postMessage({
      type: 'hash_count',
      count: hashCount
    });
    hashCount = 0;
    lastReportTime = now;
  }
  
  // Continue mining loop
  // Use setTimeout for better responsiveness and to allow UI updates
  setTimeout(miningLoop, 0);
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { action, ...data } = e.data;
  
  switch (action) {
    case 'start':
      startMining(data);
      break;
      
    case 'stop':
      stopMining();
      break;
      
    case 'update_job':
      // Update mining parameters without restarting
      blockHeight = data.blockHeight || blockHeight;
      prevHash = data.prevHash || prevHash;
      difficulty = data.difficulty || difficulty;
      target = data.target || target;
      break;
      
    default:
      console.error('Unknown action:', action);
  }
};

// Simple SHA-256 implementation if external script fails to load
if (typeof sha256 !== 'function') {
  // Very simplified SHA-256 (not for production, just a fallback)
  function sha256(message) {
    // In a real implementation, use the imported library
    // This is just a placeholder for the structure
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

// Notify main thread that worker is ready
self.postMessage({ type: 'worker_ready' });