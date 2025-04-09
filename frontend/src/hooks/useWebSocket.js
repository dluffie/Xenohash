import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for WebSocket connection and communication
 * @param {string} url - WebSocket server URL
 * @param {Object} options - Configuration options
 * @param {Function} options.onOpen - Callback when connection opens
 * @param {Function} options.onMessage - Callback when message is received
 * @param {Function} options.onClose - Callback when connection closes
 * @param {Function} options.onError - Callback when error occurs
 * @param {boolean} options.reconnect - Whether to reconnect on disconnect
 * @param {number} options.reconnectInterval - Reconnection attempt interval in ms
 * @param {number} options.maxReconnectAttempts - Max number of reconnection attempts
 * @returns {Object} WebSocket utilities and state
 */
const useWebSocket = (
  url,
  {
    onOpen = () => {},
    onMessage = () => {},
    onClose = () => {},
    onError = () => {},
    reconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    initialPayload = null
  } = {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // Close WebSocket connection
  const closeConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  // Connect or reconnect to WebSocket
  const connect = useCallback(() => {
    // Clean up existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        setIsConnected(true);
        setReconnectAttempt(0);
        onOpen(event);
        
        // Send initial payload if provided
        if (initialPayload) {
          sendMessage(initialPayload);
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setLastMessage(parsedData);
          onMessage(parsedData);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          onMessage(event.data); // Fallback to raw data
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        onClose(event);
        
        // Attempt reconnection if enabled
        if (reconnect && reconnectAttempt < maxReconnectAttempts) {
          const nextAttempt = reconnectAttempt + 1;
          setReconnectAttempt(nextAttempt);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError(error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      onError(error);
    }
  }, [
    url, onOpen, onMessage, onClose, onError, 
    reconnect, reconnectInterval, maxReconnectAttempts, 
    reconnectAttempt, initialPayload, sendMessage
  ]);

  // Initialize connection on mount and clean up on unmount
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    closeConnection,
    reconnect: connect,
    reconnectAttempt
  };
};

export default useWebSocket;