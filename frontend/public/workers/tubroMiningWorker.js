// Turbo Mining Worker using WebAssembly (WASM Level 1)
// This is the first tier of upgraded mining performance

// Load WASM module
let wasmModule;
let wasmInstance;
let wasmMemory;

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

// Initialize WASM
async function initWasm() {
  try {
    // Import WASM module
    const response = await fetch('/lib/mining-turbo.wasm');
    const wasmBytes = await response.arrayBuffer();
    
    // Create memory for WASM (increased for better performance)
    wasmMemory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
    
    // Instantiate WASM module
    wasmModule = await WebAssembly.instantiate(wasmBytes, {
      env: {
        memory: wasmMemory,
        // Expose JavaScript functions to WASM if needed
        reportHash: (hashPtr, nonceVal, timestampVal) => {
          // Convert WASM memory pointer to JS string
          const hashValue = readStringFromMemory(hashPtr);
          
          // Report found hash to main thread
          self.postMessage({
            type: 'hash_found',
            hash: hashValue,
            nonce: nonceVal,
            timestamp: timestampVal,
            blockHeight: blockHeight
          });
        },
        // Add any other functions WASM might call
      }
    });
    
    // Get WASM instance
    wasmInstance = wasmModule.instance;
    
    // Notify that WASM is ready
    self.postMessage({ type: 'wasm_ready', success: true });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize WASM:', error);
    self.postMessage({ type: 'wasm_ready', success: false, error: error.message });
    return false;
  }
}

// Helper function to read string from WASM memory
function readStringFromMemory(ptr) {
  const memory = new Uint8Array(wasmMemory.buffer);
  let str = '';
  let i = ptr;
  
  while (memory[i] !== 0) {
    str += String.fromCharCode(memory[i]);
    i++;
  }
  
  return str;
}

// Write string to WASM memory and return pointer
function writeStringToMemory(str) {
  const bytes = new TextEncoder().encode(str + '\0'); // null-terminated
  const ptr = wasmInstance.exports.allocate(bytes.length);
  
  const memory = new Uint8Array(wasmMemory.buffer);
  for (let i = 0; i < bytes.length; i++) {
    memory[ptr + i] = bytes[i];
  }
  
  return ptr;
}

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
  
  // Start the mining loop using WASM
  if (wasmInstance) {
    // Write data to WASM memory
    const prevHashPtr = writeStringToMemory(prevHash);
    const targetPtr = writeStringToMemory(target);
    
    // Start WASM mining (non-blocking variant)
    wasmInstance.exports.startMining(
      prevHashPtr, 
      targetPtr, 
      startNonce, 
      difficulty
    );
    
    // Start monitoring loop
    monitorWasmMining();
  } else {
    // Fallback to JS if WASM failed to load
    fallbackMiningLoop();
  }
}

// Monitor WASM mining progress
function monitorWasmMining() {
  if (!mining) return;
  
  // Get hash count from WASM
  const hashesSinceLastCheck = wasmInstance.exports.getHashCount();
  hashCount += hashesSinceLastCheck;
  
  // Reset counter in WASM
  wasmInstance.exports.resetHashCount();
  
  // Report hash rate periodically
  const now = Date.now();
  if (now - lastReportTime >= 1000) {
    self.postMessage({
      type: 'hash_count',
      count: hashCount
    });
    hashCount = 0;
    lastReportTime = now;
  }
  
  // Continue monitoring
  setTimeout(monitorWasmMining, 100);
}

// Stop mining process
function stopMining() {
  mining = false;
  
  // Stop WASM mining if active
  if (wasmInstance && wasmInstance.exports.stopMining) {
    wasmInstance.exports.stopMining();
  }
}

// Fallback mining loop (in case WASM fails)
function fallbackMiningLoop() {
  // Similar to basicMiningWorker.js but with slight optimizations
  // This is just a safety fallback if WASM fails
  // Implementation similar to basicMiningWorker.js
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { action, ...data } = e.data;
  
  switch (action) {
    case 'start':
      // Ensure WASM is initialized before starting
      if (!wasmInstance) {
        const success = await initWasm();
        if (!success) {
          self.postMessage({ 
            type: 'error', 
            message: 'Failed to initialize WASM mining. Falling back to JS.' 
          });
        }
      }
      startMining(data);
      break;
      
    case 'stop':
      stopMining();
      break;
      
    case 'update_job':
      // Update mining parameters
      blockHeight = data.blockHeight || blockHeight;
      prevHash = data.prevHash || prevHash;
      difficulty = data.difficulty || difficulty;
      target = data.target || target;
      
      // Update WASM mining job if running
      if (mining && wasmInstance) {
        const prevHashPtr = writeStringToMemory(prevHash);
        const targetPtr = writeStringToMemory(target);
        wasmInstance.exports.updateMiningJob(
          prevHashPtr, 
          targetPtr, 
          difficulty
        );
      }
      break;
      
    default:
      console.error('Unknown action:', action);
  }
};

// Initialize WASM on load
initWasm().catch(error => {
  console.error('Failed to initialize WASM:', error);
  self.postMessage({ 
    type: 'wasm_ready', 
    success: false, 
    error: error.message 
  });
});