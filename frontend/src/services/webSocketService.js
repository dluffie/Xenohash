/**
 * WebSocket service for real-time communication with the backend
 */

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000';

let socket = null;
let reconnectTimer = null;
let eventHandlers = {};

// Set up a WebSocket connection
export const setupWebSocket = (user, handlers = {}) => {
  // Get Telegram initData for authentication
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || '';
  
  // Close existing connection if any
  if (socket) {
    socket.close();
  }
  
  // Create new WebSocket connection
  const url = `${WS_BASE_URL}?auth=${encodeURIComponent(initData)}`;
  socket = new WebSocket(url);
  
  // Store event handlers
  eventHandlers = handlers;
  
  // WebSocket event handlers
  socket.addEventListener('open', () => {
    clearReconnectTimer();
    console.log('WebSocket connected');
    
    // Send authentication message
    send('auth', { userId: user.id });
    
    // Call onConnect handler if provided
    if (handlers.onConnect) {
      handlers.onConnect();
    }
  });
  
  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      
      // Call onMessage handler if provided
      if (handlers.onMessage) {
        handlers.onMessage(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    
    // Call onDisconnect handler if provided
    if (handlers.onDisconnect) {
      handlers.onDisconnect(event);
    }
    
    // Attempt to reconnect unless it was closed intentionally
    if (event.code !== 1000) {
      scheduleReconnect();
    }
  });
  
  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    
    // Call onError handler if provided
    if (handlers.onError) {
      handlers.onError(error);
    }
  });
  
  // Return connection object and disconnect function
  return {
    connection: socket,
    disconnect: () => {
      if (socket) {
        socket.close(1000, 'User disconnected');
        socket = null;
        clearReconnectTimer();
      }
    }
  };
};

// Send a message through the WebSocket
export const send = (type, data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
    return true;
  }
  return false;
};

// Disconnect WebSocket
export const disconnectWebSocket = () => {
  if (socket) {
    socket.close(1000, 'User disconnected');
    socket = null;
    clearReconnectTimer();
  }
};

// Schedule reconnection
const scheduleReconnect = () => {
  clearReconnectTimer();
  
  // Reconnect after 3 seconds
  reconnectTimer = setTimeout(() => {
    console.log('Attempting to reconnect WebSocket...');
    
    // Get Telegram WebApp instance
    const tg = window.Telegram?.WebApp;
    
    // If we have user data, reconnect
    if (tg && tg.initDataUnsafe?.user) {
      const user = {
        id: tg.initDataUnsafe.user.id,
        username: tg.initDataUnsafe.user.username
      };
      setupWebSocket(user, eventHandlers);
    }
  }, 3000);
};

// Clear reconnection timer
const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};