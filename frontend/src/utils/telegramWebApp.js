/**
 * Telegram WebApp utilities for authentication and interaction
 */

// Validate the initData from Telegram WebApp
export const validateTelegramWebAppData = async (initData) => {
    try {
      // In a real implementation, this should be validated on the server
      // Here we're just extracting user info for demonstration
      
      // Parse the initData string
      const params = new URLSearchParams(initData);
      const user = params.get('user') ? JSON.parse(decodeURIComponent(params.get('user'))) : null;
      
      if (!user) {
        console.warn('No user data found in initData');
        return null;
      }
      
      // In a real app, you would send the initData to your backend for validation
      // const response = await fetch('/api/auth/telegram-validate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ initData })
      // });
      // const validationResult = await response.json();
      // if (!validationResult.valid) throw new Error('Invalid Telegram data');
      
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url,
      };
    } catch (error) {
      console.error('Error validating Telegram WebApp data:', error);
      return null;
    }
  };
  
  // Get Telegram WebApp instance
  export const getTelegramWebApp = () => {
    return window.Telegram?.WebApp;
  };
  
  // Show popup in Telegram WebApp
  export const showPopup = (title, message, buttons = []) => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.showPopup({
        title,
        message,
        buttons
      });
    } else {
      alert(`${title}\n\n${message}`);
    }
  };
  
  // Show alert in Telegram WebApp
  export const showAlert = (message) => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  };
  
  // Close the WebApp
  export const closeWebApp = () => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.close();
    }
  };