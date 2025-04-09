import { useState, useEffect } from 'react';
import { api } from '../../services/api';
//import './BlockchainStats.css';

const BlockchainStats = () => {
  const [stats, setStats] = useState({
    totalBlocks: 0,
    blocksCreated: 0,
    totalHolders: 0,
    totalIssued: 0,
    totalSupply: 1000000000, // 1 billion max supply
    startDate: '2025-01-01',
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.blocks.getStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch blockchain stats:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate mining progress percentage
  const miningProgressPercentage = (stats.blocksCreated / 1000000) * 100;

  return (
    <div className="blockchain-stats">
      <h2>Blockchain Statistics</h2>
      
      {loading && !stats.blocksCreated ? (
        <div className="stats-loading">
          <div className="spinner"></div>
          <p>Loading statistics...</p>
        </div>
      ) : error ? (
        <div className="stats-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <>
          <div className="progress-container">
            <div className="progress-label">
              <span>Total Mined:</span>
              <span>{miningProgressPercentage.toFixed(2)}%</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${miningProgressPercentage}%` }}
              ></div>
            </div>
            <div className="progress-details">
              <span>{stats.blocksCreated.toLocaleString()}/{(1000000).toLocaleString()} Blocks</span>
            </div>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Holders</div>
              <div className="stat-value">{stats.totalHolders.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Tokens Issued</div>
              <div className="stat-value">{stats.totalIssued.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Supply Limit</div>
              <div className="stat-value">{stats.totalSupply.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Project Started</div>
              <div className="stat-value">{new Date(stats.startDate).toLocaleDateString()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BlockchainStats;