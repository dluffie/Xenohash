/**
 * API service for communicating with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper function for making API requests
const fetchWithAuth = async (endpoint, options = {}) => {
  // Get Telegram initData for authentication
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || '';
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData,
    ...options.headers
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in API request to ${endpoint}:`, error);
    throw error;
  }
};

// API endpoints
export const api = {
  // User endpoints
  user: {
    getProfile: () => fetchWithAuth('/user/profile'),
    updateSettings: (settings) => fetchWithAuth('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  },
  
  // Mining endpoints
  mining: {
    submitShare: (shareData) => fetchWithAuth('/mining/share', {
      method: 'POST',
      body: JSON.stringify(shareData)
    }),
    getStats: () => fetchWithAuth('/mining/stats')
  },
  
  // Blocks endpoints
  blocks: {
    getRecent: (limit = 10) => fetchWithAuth(`/blocks/recent?limit=${limit}`),
    getBlock: (blockId) => fetchWithAuth(`/blocks/${blockId}`),
    getLeaderboard: (limit = 100) => fetchWithAuth(`/blocks/leaderboard?limit=${limit}`)
  },
  
  // Upgrade endpoints
  upgrades: {
    getAvailable: () => fetchWithAuth('/upgrades/available'),
    purchase: (upgradeId) => fetchWithAuth('/upgrades/purchase', {
      method: 'POST',
      body: JSON.stringify({ upgradeId })
    })
  },
  
  // Tasks endpoints
  tasks: {
    getAvailable: () => fetchWithAuth('/tasks/available'),
    complete: (taskId) => fetchWithAuth('/tasks/complete', {
      method: 'POST',
      body: JSON.stringify({ taskId })
    })
  }
};