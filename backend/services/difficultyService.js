// services/difficultyService.js

// Constants from environment variables or defaults
const TARGET_BLOCK_TIME = parseInt(process.env.TARGET_BLOCK_TIME) || 7500; // 7.5 seconds in ms
const ADJUSTMENT_FACTOR = parseFloat(process.env.DIFFICULTY_ADJUSTMENT_FACTOR) || 0.1;
const MIN_DIFFICULTY = parseFloat(process.env.MIN_DIFFICULTY) || 0.1;
const MAX_DIFFICULTY = parseFloat(process.env.MAX_DIFFICULTY) || 100;

/**
 * Adjusts the mining difficulty based on the time taken to mine the last block
 * @param {number} currentDifficulty - The current difficulty level
 * @param {number} lastBlockTime - Time taken to mine the last block in milliseconds
 * @returns {number} - The adjusted difficulty for the next block
 */
function adjustDifficulty(currentDifficulty, lastBlockTime) {
  // If block was mined too quickly, increase difficulty
  // If too slowly, decrease difficulty
  const timeRatio = TARGET_BLOCK_TIME / lastBlockTime;
  
  // Calculate new difficulty with adjustment factor to smooth changes
  let newDifficulty = currentDifficulty * (1 + ADJUSTMENT_FACTOR * (timeRatio - 1));
  
  // Clamp difficulty within bounds
  newDifficulty = Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, newDifficulty));
  
  console.log(`Difficulty adjusted: ${currentDifficulty} -> ${newDifficulty} (Block time: ${lastBlockTime}ms, Target: ${TARGET_BLOCK_TIME}ms)`);
  
  return newDifficulty;
}

module.exports = {
  adjustDifficulty
};