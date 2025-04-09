// src/utils/telegramWebAppMock.js

/**
 * This file creates a mock of the Telegram WebApp object
 * for development/testing purposes outside of Telegram
 */

export const initTelegramWebAppMock = () => {
    // Only add the mock if we're in development and not in Telegram
    if (process.env.NODE_ENV === 'development' && !window.Telegram) {
      const mockUser = {
        id: 123456789,
        first_name: "TestUser",
        username: "test_user",
        language_code: "en"
      };
  
      const mockInitData = `user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=${Math.floor(Date.now() / 1000)}&hash=mock_hash_for_development`;
  
      // Create mock Telegram WebApp object
      window.Telegram = {
        WebApp: {
          initData: mockInitData,
          initDataUnsafe: {
            user: mockUser,
            auth_date: Math.floor(Date.now() / 1000),
            hash: "mock_hash_for_development"
          },
          ready: () => console.log("Mock Telegram WebApp Ready"),
          close: () => console.log("Mock close called"),
          expand: () => console.log("Mock expand called"),
          MainButton: {
            show: () => console.log("MainButton show"),
            hide: () => console.log("MainButton hide"),
            setText: (text) => console.log("MainButton text:", text),
            onClick: (fn) => console.log("MainButton click handler added")
          },
          isExpanded: true,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          colorScheme: 'light',
          themeParams: {
            bg_color: "#ffffff",
            text_color: "#000000",
            hint_color: "#888888",
            link_color: "#0078ff",
            button_color: "#0078ff",
            button_text_color: "#ffffff"
          },
          onEvent: (eventType, callback) => {
            console.log(`Registered event listener for: ${eventType}`);
          },
          offEvent: (eventType, callback) => {
            console.log(`Removed event listener for: ${eventType}`);
          },
          sendData: (data) => {
            console.log("Mock sendData:", data);
          },
          version: "6.0"
        }
      };
  
      console.log("Telegram WebApp mock initialized for development");
    }
  };