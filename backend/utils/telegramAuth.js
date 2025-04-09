// // utils/telegramAuth.js
// const crypto = require('crypto');

// /**
//  * Validates the Telegram WebApp authentication data
//  * @param {string} initDataString - The initData string from Telegram WebApp
//  * @returns {Object} - Authentication result with user data if valid
//  */
// function validateAuthData(initDataString) {
//   try {
//     // Parse the incoming initData string
//     const params = new URLSearchParams(initDataString);
//     const hash = params.get('hash');
    
//     if (!hash) {
//       return { valid: false, error: 'No hash provided' };
//     }
    
//     // Delete the hash from the data before checking the signature
//     params.delete('hash');
    
//     // Sort params alphabetically for validation
//     const paramsList = Array.from(params.entries())
//       .sort(([a], [b]) => a.localeCompare(b));
    
//     // Create data-check-string
//     const dataCheckString = paramsList
//       .map(([key, value]) => `${key}=${value}`)
//       .join('\n');
    
//     // Get the token from environment variables
//     const botToken = process.env.TELEGRAM_BOT_TOKEN;
//     if (!botToken) {
//       console.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
//       return { valid: false, error: 'Bot token not configured' };
//     }
    
//     // Create the secret key using HMAC-SHA256
//     const secretKey = crypto
//       .createHmac('sha256', 'WebAppData')
//       .update(botToken)
//       .digest();
    
//     // Calculate the HMAC for the data-check-string
//     const calculatedHash = crypto
//       .createHmac('sha256', secretKey)
//       .update(dataCheckString)
//       .digest('hex');
    
//     // Compare the calculated hash with the provided hash
//     if (calculatedHash !== hash) {
//       return { valid: false, error: 'Invalid hash' };
//     }
    
//     // Extract user data
//     const userJson = params.get('user');
//     if (!userJson) {
//       return { valid: false, error: 'No user data provided' };
//     }
    
//     // Parse user data
//     const user = JSON.parse(userJson);
    
//     return {
//       valid: true,
//       user
//     };
//   } catch (error) {
//     console.error('Auth validation error:', error);
//     return { valid: false, error: error.message };
//   }
// }

// module.exports = {
//   validateAuthData
// };
// utils/telegramAuth.js

const crypto = require('crypto');

/**
 * Validates Telegram WebApp authentication data
 * Includes a bypass option for development environments
 */
function validateTelegramWebAppData(initData) {
  // For development/testing environment - bypass authentication check
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_TELEGRAM_AUTH === 'true') {
    console.log('Development mode: Bypassing Telegram authentication');
    
    // Extract mock user data
    const params = new URLSearchParams(initData);
    const userDataStr = params.get('user');
    
    if (userDataStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataStr));
        return {
          isValid: true,
          user: userData
        };
      } catch (error) {
        console.error('Error parsing mock user data:', error);
      }
    }
    
    // Return default test user if parsing fails
    return {
      isValid: true,
      user: {
        id: 123456789,
        first_name: "TestUser",
        username: "test_user"
      }
    };
  }

  // For production - perform actual validation
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) return { isValid: false, error: 'Hash not found' };
    
    // Delete the hash from the check
    params.delete('hash');
    
    // Sort params alphabetically for consistent check string
    const paramsList = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Create HMAC-SHA-256 hash using bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(paramsList)
      .digest('hex');
    
    const isValid = computedHash === hash;
    
    // If valid, extract and return the user data
    if (isValid) {
      const userDataStr = params.get('user');
      if (userDataStr) {
        const userData = JSON.parse(decodeURIComponent(userDataStr));
        return { isValid, user: userData };
      }
    }
    
    return { isValid, error: isValid ? 'User data not found' : 'Invalid hash' };
  } catch (error) {
    console.error('Telegram auth validation error:', error);
    return { isValid: false, error: error.message };
  }
}

module.exports = { validateTelegramWebAppData };