import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import TelegramAuth from './components/Auth/TelegramAuth'
import MiningPanel from './components/Dashboard/MiningPanel'
import BlockFeed from './components/Dashboard/BlockFeed'
import EnergyStatus from './components/Dashboard/EnergyStatus'
import BlockchainStats from './components/Stats/BlockchainStats'
import Leaderboard from './components/Stats/Leaderboard'
import UpgradePanel from './components/Service/UpgradePanel'
import TaskList from './components/Tasks/TaskList'
import './App.css'

function App() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('mining');

  useEffect(() => {
    // Initialize Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <TelegramAuth />;
  }

  return (
    <div className="app">
      <div className="content">
        {activeTab === 'mining' && (
          <div className="mining-dashboard">
            <EnergyStatus />
            <MiningPanel />
            <BlockFeed />
          </div>
        )}
        {activeTab === 'service' && <UpgradePanel />}
        {activeTab === 'tasks' && <TaskList />}
        {activeTab === 'stats' && (
          <div className="stats-container">
            <BlockchainStats />
            <Leaderboard />
          </div>
        )}
        {activeTab === 'wallet' && (
          <div className="wallet-container">
            <h2>Wallet</h2>
            <p>Your token management and transactions will appear here.</p>
          </div>
        )}
      </div>
      <nav className="bottom-nav">
        <button
          className={activeTab === 'mining' ? 'active' : ''}
          onClick={() => setActiveTab('mining')}
        >
          Mining
        </button>
        <button
          className={activeTab === 'service' ? 'active' : ''}
          onClick={() => setActiveTab('service')}
        >
          Service
        </button>
        <button
          className={activeTab === 'tasks' ? 'active' : ''}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={activeTab === 'wallet' ? 'active' : ''}
          onClick={() => setActiveTab('wallet')}
        >
          🔗Wallet
        </button>
      </nav>
    </div>
  );
}

export default App;