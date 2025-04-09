import { useState } from 'react';
import { useMining } from '../../context/MiningContext';
import { useAuth } from '../../context/AuthContext';
//import './BlockFeed.css';

const BlockFeed = () => {
  const { recentBlocks } = useMining();
  const { user } = useAuth();
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Calculate time ago
  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Handle block selection for detail view
  const handleBlockClick = (block) => {
    setSelectedBlock(block);
  };

  // Close block detail view
  const closeBlockDetail = () => {
    setSelectedBlock(null);
  };

  return (
    <div className="block-feed">
      <h2>Recent Blocks</h2>
      
      {recentBlocks.length === 0 ? (
        <div className="no-blocks">
          <p>No blocks mined yet. Start mining to find blocks!</p>
        </div>
      ) : (
        <div className="blocks-list">
          {recentBlocks.map((block) => (
            <div 
              key={block.number} 
              className={`block-item ${block.finder === user?.id ? 'my-block' : ''}`}
              onClick={() => handleBlockClick(block)}
            >
              <div className="block-main">
                <div className="block-number">#{block.number}</div>
                <div className="block-time">{timeAgo(block.timestamp)}</div>
              </div>
              <div className="block-finder">
                Found by: {block.finder === user?.id ? 'You' : block.finderName}
              </div>
              <div className="block-reward">
                {block.finder === user?.id && (
                  <span className="my-reward">+{block.reward.toLocaleString()} tokens</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedBlock && (
        <div className="block-detail-overlay">
          <div className="block-detail">
            <button className="close-button" onClick={closeBlockDetail}>×</button>
            <h3>Block #{selectedBlock.number}</h3>
            <div className="detail-item">
              <span className="label">Hash:</span>
              <span className="value hash">{selectedBlock.hash}</span>
            </div>
            <div className="detail-item">
              <span className="label">Time:</span>
              <span className="value">{formatTime(selectedBlock.timestamp)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Finder:</span>
              <span className="value">
                {selectedBlock.finder === user?.id ? 'You' : selectedBlock.finderName}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Reward:</span>
              <span className="value">{selectedBlock.reward.toLocaleString()} tokens</span>
            </div>
            <div className="detail-item">
              <span className="label">Difficulty:</span>
              <span className="value">{selectedBlock.difficulty.toLocaleString()}</span>
            </div>
            
            {selectedBlock.finder === user?.id && (
              <div className="my-block-reward">
                <span className="label">Your Reward:</span>
                <span className="value">{selectedBlock.reward.toLocaleString()} tokens</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockFeed;