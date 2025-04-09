import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTelegramWebApp, validateTelegramWebAppData } from '../../utils/telegramWebApp';
//import './TelegramAuth.css';

const TelegramAuth = () => {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initTelegramAuth = async () => {
      try {
        setIsLoading(true);
        const tg = getTelegramWebApp();
        
        if (!tg) {
          setError('Telegram WebApp is not available. Please open this app through Telegram.');
          setIsLoading(false);
          return;
        }
        
        if (tg.initData) {
          // Validate and process Telegram auth data
          const userData = await validateTelegramWebAppData(tg.initData);
          
          if (userData) {
            await login(userData);
          } else {
            setError('Failed to authenticate with Telegram. Please try again.');
          }
        } else {
          setError('No authentication data found. Please restart the app in Telegram.');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setError('Authentication failed. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    initTelegramAuth();
  }, [login]);

  return (
    <div className="telegram-auth">
      <div className="auth-container">
        <div className="auth-logo">
          <img src="/xenohash-logo.png" alt="Xenohash Logo" />
        </div>
        <h1>Xenohash Mining</h1>
        
        {isLoading ? (
          <div className="auth-loading">
            <div className="spinner"></div>
            <p>Authenticating with Telegram...</p>
          </div>
        ) : error ? (
          <div className="auth-error">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="auth-button"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="auth-loading">
            <div className="spinner"></div>
            <p>Logging in...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramAuth;