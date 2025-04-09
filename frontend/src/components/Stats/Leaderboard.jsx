import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
//import './Leaderboard.css';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await api.blocks.getLeaderboard(100); // Get top 100
        setLeaderboard(data.leaders);
        
        // Find user's rank if available
        if (data.userRank) {
          setUserRank(data.userRank);
        } else if (user) {
          // Find user in the leaderboard
          const userPosition = data.leaders.findIndex(leader => leader.id === user.id);
          if (userPosition !== -1) {
            setUserRank({ rank: userPosition + 1, ...data.leaders[userPosition] });
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    
    // Refresh leaderboard every 2 minutes
    const interval = setInterval(fetchLeaderboard, 120000);
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="leaderboard">
      <h2>Top Miners Leaderboard</h2>
      
      {loading && leaderboard.length === 0 ? (
        <div className="leaderboard-loading">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="leaderboard-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <>
          {/* User's rank if not in top 100 */}
          {userRank && userRank.rank > 100 && (
            <div className="user-rank">
              <div className="rank-header">Your Position</div>
              <div className="rank-item">
                <div className="rank-position">{userRank.rank}</div>
                <div className="rank-user you">
                  <div className="rank-name">You</div>
                  <div className="rank-tokens">{userRank.tokens.toLocaleString()} tokens</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Top 100 list */}
          <div className="leaders-list">
            {leaderboard.map((leader, index) => (
              <div 
                key={leader.id}
                className={`leader-item ${leader.id === user?.id ? 'you' : ''}`}
              >
                <div className="leader-rank">{index + 1}</div>
                <div className="leader-info">
                  <div className="leader-name">
                    {leader.id === user?.id ? 'You' : leader.name}
                  </div>
                  <div className="leader-tokens">{leader.tokens.toLocaleString()}</div>
                </div>
              </div>
            ))}
            
            {leaderboard.length === 0 && (
              <div className="no-leaders">
                <p>No miners yet. Be the first to mine blocks!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;