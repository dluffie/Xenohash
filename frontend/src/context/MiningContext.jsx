import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import { startMiningProcess, stopMiningProcess } from '../services/miningService';

const MiningContext = createContext();

export const useMining = () => useContext(MiningContext);

export const MiningProvider = ({ children }) => {
  const { user } = useAuth();
  const { connected, lastMessage, sendMessage } = useWebSocket();
  
  // Mining state
  const [isMining, setIsMining] = useState(false);
  const [miningMode, setMiningMode] = useState('basic'); // 'basic', 'turbo', 'super', 'nitro'
  const [hashrate, setHashrate] = useState(0);
  const [sharesSubmitted, setSharesSubmitted] = useState(0);
  const [tokens, setTokens] = useState(0);
  
  // Block info
  const [currentBlock, setCurrentBlock] = useState({
    number: 0,
    hash: '0000000000000000000000000000000000000000000000000000000000000000',
    difficulty: 1,
    reward: 1500
  });
  const [minersOnline, setMinersOnline] = useState(0);
  
  // Energy system
  const [energy, setEnergy] = useState({
    current: 5000,
    max: 5000,
    bonus: 0,
    rechargeRate: 1 // energy per second
  });
  
  // Recent blocks
  const [recentBlocks, setRecentBlocks] = useState([]);

  // Handle websocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const message = typeof lastMessage === 'string' 
        ? JSON.parse(lastMessage) 
        : lastMessage;

      switch (message.type) {
        case 'stats_update':
          setMinersOnline(message.data.minersOnline);
          break;
        case 'new_block':
          // Add new block to recent blocks
          setRecentBlocks(prev => [message.data.block, ...prev].slice(0, 20));
          
          // Update current block info
          setCurrentBlock({
            number: message.data.nextBlock.number,
            hash: message.data.nextBlock.prevHash,
            difficulty: message.data.nextBlock.difficulty,
            reward: message.data.nextBlock.reward
          });
          
          // Update tokens if user found the block
          if (message.data.block.finder === user?.id) {
            setTokens(prev => prev + message.data.block.reward);
          }
          break;
        case 'balance_update':
          setTokens(message.data.balance);
          break;
        case 'energy_update':
          setEnergy(prev => ({
            ...prev,
            current: message.data.current,
            max: message.data.max,
            bonus: message.data.bonus
          }));
          break;
        case 'mining_stats':
          setHashrate(message.data.hashrate);
          setSharesSubmitted(message.data.shares);
          break;
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [lastMessage, user?.id]);

  // Energy recharge timer
  useEffect(() => {
    if (!connected) return;
    
    const rechargeInterval = setInterval(() => {
      setEnergy(prev => {
        const totalMax = prev.max + prev.bonus;
        if (prev.current < totalMax) {
          return {
            ...prev,
            current: Math.min(prev.current + prev.rechargeRate, totalMax)
          };
        }
        return prev;
      });
    }, 1000);
    
    return () => clearInterval(rechargeInterval);
  }, [connected]);

  // Mining control functions
  const startMining = useCallback(async () => {
    if (energy.current <= 0) {
      console.warn('Not enough energy to mine');
      return;
    }
    
    try {
      await startMiningProcess(miningMode);
      setIsMining(true);
      sendMessage('start_mining', { mode: miningMode });
    } catch (error) {
      console.error('Failed to start mining:', error);
    }
  }, [miningMode, energy.current, sendMessage]);

  const stopMining = useCallback(async () => {
    try {
      await stopMiningProcess();
      setIsMining(false);
      sendMessage('stop_mining', {});
    } catch (error) {
      console.error('Failed to stop mining:', error);
    }
  }, [sendMessage]);

  const setMiningModeAndRestart = useCallback((mode) => {
    const previouslyMining = isMining;
    
    // Stop mining if active
    if (isMining) {
      stopMining();
    }
    
    // Set new mode
    setMiningMode(mode);
    
    // Restart mining if it was active
    if (previouslyMining) {
      startMining();
    }
  }, [isMining, startMining, stopMining]);

  return (
    <MiningContext.Provider value={{
      isMining,
      miningMode,
      hashrate,
      sharesSubmitted,
      tokens,
      currentBlock,
      minersOnline,
      energy,
      recentBlocks,
      startMining,
      stopMining,
      setMiningMode: setMiningModeAndRestart
    }}>
      {children}
    </MiningContext.Provider>
  );
};