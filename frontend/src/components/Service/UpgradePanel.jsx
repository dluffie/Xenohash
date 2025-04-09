import React, { useState, useEffect } from 'react';
import useWebSocket from '../../hooks/useWebSocket';

/**
 * Component to display and purchase mining upgrades
 */
const UpgradePanel = () => {
  const [userTokens, setUserTokens] = useState(0);
  const [premiumBalance, setPremiumBalance] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState({
    turbo: false,
    super: false,
    nitro: false
  });
  const [passiveMining, setPassiveMining] = useState({
    active: false,
    expiresAt: null
  });
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // WebSocket connection for upgrades/purchases
  const { 
    isConnected,
    sendMessage,
  } = useWebSocket('wss://api.xenohash.com/service', {
    onOpen: () => {
      console.log('Connected to service server');
      // Send auth data
      if (window.Telegram && window.Telegram.WebApp) {
        sendMessage({
          type: 'auth',
          telegramData: window.Telegram.WebApp.initData
        });
      }
    },
    onMessage: (data) => {
      if (!data) return;

      switch (data.type) {
        case 'user.balance':
          setUserTokens(data.tokens || 0);
          setPremiumBalance(data.premium || 0);
          break;

        case 'user.upgrades':
          setOwnedUpgrades({
            turbo: !!data.turbo,
            super: !!data.super,
            nitro: !!data.nitro
          });
          setPassiveMining({
            active: !!data.passiveActive,
            expiresAt: data.passiveExpiresAt
          });
          break;

        case 'purchase.success':
          setPurchaseLoading(false);
          // Refresh balances and owned upgrades
          sendMessage({ type: 'user.get_balance' });
          sendMessage({ type: 'user.get_upgrades' });
          break;

        case 'purchase.failed':
          console.error('Purchase failed:', data.message);
          setPurchaseLoading(false);
          // Display error message to user (could use a toast notification system)
          break;

        default:
          console.log('Unhandled service message:', data);
      }
    }
  });

  // Fetch initial data when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'user.get_balance' });
      sendMessage({ type: 'user.get_upgrades' });
    }
  }, [isConnected, sendMessage]);

  // Handle upgrade purchase
  const handlePurchase = (upgradeType) => {
    if (!isConnected || purchaseLoading) return;

    setPurchaseLoading(true);
    sendMessage({
      type: 'purchase.upgrade',
      upgradeType
    });
  };

  // Handle passive mining purchase
  const handlePassivePurchase = (durationHours) => {
    if (!isConnected || purchaseLoading) return;

    setPurchaseLoading(true);
    sendMessage({
      type: 'purchase.passive',
      duration: durationHours
    });
  };

  // Format time remaining for passive mining
  const formatTimeRemaining = () => {
    if (!passiveMining.active || !passiveMining.expiresAt) return 'Not active';

    const now = new Date();
    const expires = new Date(passiveMining.expiresAt);
    const diffMs = expires - now;
    
    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  // Upgrade definitions with info
  const upgrades = [
    {
      id: 'turbo',
      name: 'Turbo',
      description: 'Unlock WASM Level 1 mining (2x faster than basic)',
      price: 1000, // Price in tokens
      premiumPrice: 5,  // Price in premium currency
      performance: '2x',
      owned: ownedUpgrades.turbo
    },
    {
      id: 'super',
      name: 'Super',
      description: 'Unlock WASM Level 2 mining (4x faster than basic)',
      price: 5000,
      premiumPrice: 20,
      performance: '4x',
      owned: ownedUpgrades.super
    },
    {
      id: 'nitro',
      name: 'Nitro',
      description: 'Unlock WASM Level 3 mining (8x faster than basic)',
      price: 20000,
      premiumPrice: 50,
      performance: '8x',
      owned: ownedUpgrades.nitro
    }
  ];

  // Passive mining options
  const passiveOptions = [
    { duration: 24, name: '1 Day', price: 2000, premiumPrice: 10 },
    { duration: 72, name: '3 Days', price: 5000, premiumPrice: 25 },
    { duration: 168, name: '7 Days', price: 10000, premiumPrice: 50 }
  ];

  return (
    <div className="upgrade-panel">
      <div className="upgrade-header">
        <h2>Mining Upgrades</h2>
        <div className="balance-display">
          <div className="token-balance">
            <span className="balance-icon">💰</span>
            <span className="balance-amount">{userTokens.toLocaleString()}</span>
          </div>
          <div className="premium-balance">
            <span className="balance-icon">⭐</span>
            <span className="balance-amount">{premiumBalance}</span>
          </div>
        </div>
      </div>

      {/* Performance Upgrades Section */}
      <section className="upgrade-section">
        <h3>Performance Upgrades</h3>
        <p className="upgrade-description">
          Unlock more powerful mining algorithms to increase your mining speed.
          Your device may heat up when using more powerful modes.
        </p>

        <div className="upgrades-grid">
          {upgrades.map(upgrade => (
            <div 
              key={upgrade.id} 
              className={`upgrade-card ${upgrade.owned ? 'owned' : ''}`}
            >
              <div className="upgrade-info">
                <h4>{upgrade.name}</h4>
                <p>{upgrade.description}</p>
                <div className="upgrade-performance">
                  <span className="performance-label">Performance:</span>
                  <span className="performance-value">{upgrade.performance}</span>
                </div>
              </div>

              <div className="upgrade-actions">
                {upgrade.owned ? (
                  <div className="upgrade-owned">
                    <span className="owned-icon">✓</span>
                    <span>Owned</span>
                  </div>
                ) : (
                  <>
                    <button 
                      className="btn-purchase token"
                      onClick={() => handlePurchase(upgrade.id)}
                      disabled={userTokens < upgrade.price || purchaseLoading}
                    >
                      {upgrade.price.toLocaleString()} 💰
                    </button>
                    <button 
                      className="btn-purchase premium"
                      onClick={() => handlePurchase(`${upgrade.id}_premium`)}
                      disabled={premiumBalance < upgrade.premiumPrice || purchaseLoading}
                    >
                      {upgrade.premiumPrice} ⭐
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Passive Mining Section */}
      <section className="upgrade-section">
        <h3>Passive Mining</h3>
        <p className="upgrade-description">
          Rent server-side mining power to mine for you even when you're offline.
        </p>

        {passiveMining.active && (
          <div className="passive-status">
            <div className="status-badge active">ACTIVE</div>
            <div className="remaining-time">{formatTimeRemaining()}</div>
          </div>
        )}

        <div className="passive-options">
          {passiveOptions.map(option => (
            <div key={option.duration} className="passive-option">
              <h4>{option.name}</h4>
              <div className="purchase-buttons">
                <button 
                  className="btn-purchase token"
                  onClick={() => handlePassivePurchase(option.duration)}
                  disabled={userTokens < option.price || purchaseLoading}
                >
                  {option.price.toLocaleString()} 💰
                </button>
                <button 
                  className="btn-purchase premium"
                  onClick={() => handlePassivePurchase(`${option.duration}_premium`)}
                  disabled={premiumBalance < option.premiumPrice || purchaseLoading}
                >
                  {option.premiumPrice} ⭐
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOS Notice */}
      <div className="terms-notice">
        <p>All purchases are final. By purchasing upgrades, you agree to our Terms of Service.</p>
      </div>
    </div>
  );
};

export default UpgradePanel;