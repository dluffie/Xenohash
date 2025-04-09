import { useState, useEffect, useCallback, useRef } from 'react';
import useWebSocket from './useWebSocket';

/**
 * Custom hook for managing mining operations
 * @param {Object} options - Mining configuration options
 * @param {string} options.wsUrl - WebSocket server URL
 * @param {Function} options.onHashFound - Callback when valid hash is found
 * @param {Function} options.onReward - Callback when reward is received
 * @param {Function} options.onError - Callback when error occurs
 * @returns {Object} Mining utilities and state
 */
const useMining = ({
  wsUrl = 'wss://api.xenohash.com/mining',
  onHashFound = () => {},
  onReward = () => {},
  onError = () => {},
} = {}) => {
  // Mining state
  const [isMining, setIsMining] = useState(false);
  const [miningMode, setMiningMode] = useState('basic'); // 'basic', 'turbo', 'super', 'nitro'
  const [hashRate, setHashRate] = useState(0);
  const [sharesSubmitted, setSharesSubmitted] = useState(0);
  const [difficulty, setDifficulty] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [currentBlockHash, setCurrentBlockHash] = useState('');
  const [minersOnline, setMinersOnline] = useState(0);
  const [nextBlockReward, setNextBlockReward] = useState(0);

  // Energy system state
  const [energy, setEnergy] = useState({ current: 0, max: 0, bonusMax: 0 });
  
  // Refs for mining worker and performance measurement
  const workerRef = useRef(null);
  const hashCountRef = useRef(0);
  const hashStartTimeRef = useRef(null);
  
  // User stats
  const [userTokens, setUserTokens] = useState(0);
  const [recentBlocks, setRecentBlocks] = useState([]);
  
  // Performance measurement interval
  const performanceIntervalRef = useRef(null);
  
  // Telegram user authentication data
  const [telegramAuthData, setTelegramAuthData] = useState(null);

  // Handle WebSocket messages
  const handleMessage = useCallback((data) => {
    if (!data) return;

    switch (data.type) {
      case 'mining.job':
        // Received new mining job from server
        setDifficulty(data.difficulty);
        setBlockTarget(data.target);
        setCurrentBlock(data.blockHeight);
        setCurrentBlockHash(data.prevBlockHash || '');
        setMinersOnline(data.minersOnline || 0);
        setNextBlockReward(data.nextReward || 0);
        
        // Update worker with new job data if mining
        if (isMining && workerRef.current) {
          workerRef.current.postMessage({
            action: 'update_job',
            blockHeight: data.blockHeight,
            difficulty: data.difficulty,
            target: data.target,
            prevHash: data.prevBlockHash,
          });
        }
        break;
        
      case 'mining.reward':
        // Received reward notification
        setUserTokens(prev => prev + (data.amount || 0));
        onReward(data);
        break;
        
      case 'mining.block_found':
        // New block was found by someone
        setRecentBlocks(prev => [data.block, ...prev].slice(0, 10));
        // Request new job implicitly - server should send one
        break;
        
      case 'mining.stats':
        // Global statistics update
        setMinersOnline(data.minersOnline || minersOnline);
        break;
        
      case 'mining.energy':
        // Energy update from server
        setEnergy({
          current: data.current || 0,
          max: data.max || 0,
          bonusMax: data.bonusMax || 0
        });
        break;
        
      case 'user.balance':
        // User balance update
        setUserTokens(data.tokens || 0);
        break;
        
      case 'error':
        console.error('Mining error:', data.message);
        onError(data);
        break;
        
      default:
        console.log('Unhandled WebSocket message type:', data.type);
    }
  }, [isMining, minersOnline, onError, onReward]);

  // WebSocket connection
  const { 
    isConnected, 
    sendMessage,
    reconnect: reconnectWebSocket
  } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log('Connected to mining server');
      
      // Send auth data to server on connection
      if (telegramAuthData) {
        sendMessage({
          type: 'auth',
          telegramData: telegramAuthData
        });
      }
    },
    onMessage: handleMessage,
    onClose: () => {
      console.log('Disconnected from mining server');
      // Stop mining if connection closed
      if (isMining) {
        stopMining();
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      onError({ message: 'Connection error', error });
    }
  });

  // Initialize Telegram auth data
  useEffect(() => {
    try {
      // Access Telegram Web App data if available
      if (window.Telegram && window.Telegram.WebApp) {
        const initData = window.Telegram.WebApp.initData;
        if (initData) {
          setTelegramAuthData(initData);
          
          // Send auth if already connected
          if (isConnected) {
            sendMessage({
              type: 'auth',
              telegramData: initData
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to get Telegram auth data:', error);
    }
  }, [isConnected, sendMessage]);

  // Setup mining worker
  useEffect(() => {
    // Create worker for mining operations
    const setupWorker = () => {
      // Clean up existing worker if any
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      
      // Create new worker based on mining mode
      let workerScript = 'basicMiningWorker.js';
      
      // Use appropriate worker script based on mining mode
      switch (miningMode) {
        case 'turbo':
          workerScript = 'turboMiningWorker.js'; // WASM L1
          break;
        case 'super':
          workerScript = 'superMiningWorker.js'; // WASM L2
          break;
        case 'nitro':
          workerScript = 'nitroMiningWorker.js'; // WASM L3
          break;
        default:
          workerScript = 'basicMiningWorker.js'; // JS Default
      }
      
      const worker = new Worker(`/workers/${workerScript}`);
      
      worker.onmessage = (e) => {
        const { type, data } = e.data;
        
        if (type === 'hash_found') {
          // Valid hash found, submit to server
          console.log('Hash found:', data.hash);
          sendMessage({
            type: 'mining.submit',
            hash: data.hash,
            nonce: data.nonce,
            blockHeight: data.blockHeight
          });
          
          setSharesSubmitted(prev => prev + 1);
          onHashFound(data);
        } else if (type === 'hash_count') {
          // Update hash count for hashrate calculation
          hashCountRef.current += data.count;
        }
      };
      
      worker.onerror = (error) => {
        console.error('Mining worker error:', error);
        onError({ message: 'Mining worker error', error });
      };
      
      workerRef.current = worker;
    };
    
    setupWorker();
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [miningMode, onError, onHashFound, sendMessage]);

  // Start measuring hash rate when mining
  useEffect(() => {
    if (isMining) {
      // Reset counters
      hashCountRef.current = 0;
      hashStartTimeRef.current = Date.now();
      
      // Set up interval to calculate hash rate
      performanceIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = (now - hashStartTimeRef.current) / 1000;
        
        if (elapsedSeconds > 0) {
          const rate = Math.round(hashCountRef.current / elapsedSeconds);
          setHashRate(rate);
        }
        
        // Reset for next interval
        hashCountRef.current = 0;
        hashStartTimeRef.current = now;
      }, 1000);
    } else {
      // Stop measuring when not mining
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
        performanceIntervalRef.current = null;
      }
      setHashRate(0);
    }
    
    return () => {
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }
    };
  }, [isMining]);

  // Start mining
  const startMining = useCallback(() => {
    if (!isConnected) {
      console.error('Cannot start mining: not connected to server');
      return false;
    }
    
    if (energy.current <= 0) {
      console.error('Cannot start mining: no energy');
      return false;
    }
    
    if (!workerRef.current) {
      console.error('Cannot start mining: worker not initialized');
      return false;
    }
    
    // Request latest job from server
    sendMessage({ type: 'mining.get_job' });
    
    // Start mining in worker
    workerRef.current.postMessage({
      action: 'start',
      blockHeight: currentBlock,
      difficulty: difficulty,
      target: blockTarget,
      prevHash: currentBlockHash,
      miningMode
    });
    
    setIsMining(true);
    return true;
  }, [
    isConnected, energy.current, sendMessage, 
    currentBlock, difficulty, blockTarget, 
    currentBlockHash, miningMode
  ]);

  // Stop mining
  const stopMining = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'stop' });
    }
    
    setIsMining(false);
    return true;
  }, []);

  // Change mining mode
  const changeMiningMode = useCallback((mode) => {
    // Verify mode is valid
    if (!['basic', 'turbo', 'super', 'nitro'].includes(mode)) {
      console.error('Invalid mining mode:', mode);
      return false;
    }
    
    // Stop mining if active
    const wasMining = isMining;
    if (wasMining) {
      stopMining();
    }
    
    // Set new mode
    setMiningMode(mode);
    
    // Restart mining if it was active
    if (wasMining) {
      // Short delay to allow worker to initialize
      setTimeout(() => {
        startMining();
      }, 100);
    }
    
    return true;
  }, [isMining, stopMining, startMining]);

  // Request passive mining from server
  const togglePassiveMining = useCallback((enable) => {
    sendMessage({
      type: enable ? 'mining.passive_start' : 'mining.passive_stop'
    });
    return true;
  }, [sendMessage]);
  
  // Request initial data from server
  useEffect(() => {
    if (isConnected && telegramAuthData) {
      // Request initial data after successful connection and auth
      sendMessage({ type: 'mining.get_job' });
      sendMessage({ type: 'user.get_balance' });
      sendMessage({ type: 'mining.get_recent_blocks' });
      sendMessage({ type: 'user.get_energy' });
    }
  }, [isConnected, telegramAuthData, sendMessage]);

  return {
    // Mining state
    isMining,
    miningMode,
    hashRate,
    sharesSubmitted,
    difficulty,
    currentBlock,
    currentBlockHash,
    minersOnline,
    nextBlockReward,
    
    // Energy state
    energy,
    
    // User stats
    userTokens,
    recentBlocks,
    
    // Connection state
    isConnected,
    
    // Mining actions
    startMining,
    stopMining,
    changeMiningMode,
    togglePassiveMining,
    
    // Connection actions
    reconnect: reconnectWebSocket
  };
};

export default useMining;