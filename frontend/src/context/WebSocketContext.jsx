import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { setupWebSocket, disconnectWebSocket } from '../services/webSocketService';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Set up WebSocket connection when authenticated
      const { connection, disconnect } = setupWebSocket(user, {
        onConnect: () => setConnected(true),
        onDisconnect: () => setConnected(false),
        onMessage: (msg) => setLastMessage(msg)
      });
      
      setSocket(connection);
      
      return () => {
        disconnect();
        setConnected(false);
      };
    }
  }, [isAuthenticated, user]);

  const sendMessage = (type, data) => {
    if (socket && connected) {
      socket.send(JSON.stringify({ type, data }));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ 
      connected, 
      lastMessage, 
      sendMessage
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};