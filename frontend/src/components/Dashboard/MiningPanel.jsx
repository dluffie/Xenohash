import { useState, useEffect } from 'react';
import { useMining } from '../../context/MiningContext';
//import './MiningPanel.css';

const MiningPanel = () => {
  const { 
    isMining, 
    miningMode, 
    hashrate, 
    sharesSubmitted, 
    tokens, 
    currentBlock, 
    minersOnline, 
    energy,
    startMining, 
    stopMining, 
    setMiningMode 
  } = useMining();

  const [showWarning, setShowWarning] = useState(false);

  // Show warning when switching to high-performance modes
  useEffect(() => {
    if (miningMode === 'super' || miningMode === 'nitro') {
      setShowWarning(true);
      
      // Hide warning after 5 seconds
      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [miningMode]);

  const handleStartStop = () => {
    if (isMining) {
      stopMining();
    } else {
      startMining();
    }
  };

  const formatHashrate = (rate) => {
    if (rate < 1000) return `${rate} H/s`;
    if (rate < 1000000) return `${(rate / 1000).toFixed(1)} KH/s`;
    return `${(rate / 1000000).toFixed(1)} MH/s`;
  };

  return (
    <div className="mining-panel">
      <div className="block-info">
        <div className="block-header">
          <span className="label">Current Block:</span>
          <span className="value">#{currentBlock.number}</span>
        </div>
        <div className="block-hash">
          <span className="hash-value">{currentBlock.hash.substring(0, 16)}...</span>
        </div>
      </div>
      
      <div className="mining-stats">
        <div className="stat">
          <span className="label">My Tokens:</span>
          <span className="value">{tokens.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="label">Difficulty:</span>
          <span className="value">{currentBlock.difficulty.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="label">Miners Online:</span>
          <span className="value">{minersOnline}</span>
        </div>
        <div className="stat">
          <span className="label">Block Reward:</span>
          <span className="value">{currentBlock.reward.toLocaleString()}</span>
        </div>
        {isMining && (
          <>
            <div className="stat">
              <span className="label">Hashrate:</span>
              <span className="value">{formatHashrate(hashrate)}</span>
            </div>
            <div className="stat">
              <span className="label">Shares:</span>
              <span className="value">{sharesSubmitted}</span>
            </div>
          </>
        )}
      </div>
      
      <div className="mining-modes">
        <button 
          className={`mode-button ${miningMode === 'basic' ? 'active' : ''}`} 
          onClick={() => setMiningMode('basic')}
        >
          Basic
        </button>
        <button 
          className={`mode-button ${miningMode === 'turbo' ? 'active' : ''}`} 
          onClick={() => setMiningMode('turbo')}
        >
          Turbo
        </button>
        <button 
          className={`mode-button ${miningMode === 'super' ? 'active' : ''}`} 
          onClick={() => setMiningMode('super')}
        >
          Super
        </button>
        <button 
          className={`mode-button nitro ${miningMode === 'nitro' ? 'active' : ''}`} 
          onClick={() => setMiningMode('nitro')}
        >
          Nitro 🟢
        </button>
      </div>
      
      {showWarning && (
        <div className="device-warning">
          ⚠️ High-performance mode active. Device may heat up.
        </div>
      )}
      
      <button 
        className={`mining-button ${isMining ? 'stop' : 'start'}`}
        onClick={handleStartStop}
        disabled={energy.current <= 0 && !isMining}
      >
        {isMining ? '■ Stop Mining' : '▶ Start Mining'}
      </button>
      
      {!isMining && energy.current <= 0 && (
        <div className="energy-warning">
          ⚠️ Not enough energy to start mining
        </div>
      )}
    </div>
  );
};

export default MiningPanel;