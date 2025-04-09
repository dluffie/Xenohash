import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket from '../../hooks/useWebSocket';

/**
 * Component to display and complete tasks for energy bonuses
 */
const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [energy, setEnergy] = useState({ current: 0, max: 0, bonusMax: 0 });
  const [loading, setLoading] = useState(true);
  const [claimingTask, setClaimingTask] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ 
    invited: 0, 
    active: 0, 
    totalReward: 0 
  });

  // WebSocket connection
  const { 
    isConnected,
    sendMessage
  } = useWebSocket('wss://api.xenohash.com/tasks', {
    onOpen: () => {
      console.log('Connected to tasks server');
      // Authenticate with Telegram data
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
        case 'tasks.list':
          // Update tasks list
          setTasks(data.tasks || []);
          setCompletedTasks(data.completed || []);
          setLoading(false);
          break;

        case 'task.claim_success':
          // Task was successfully claimed
          if (claimingTask === data.taskId) {
            setClaimingTask(null);
          }
          
          // Update completed tasks
          setCompletedTasks(prev => [...prev, data.taskId]);
          
          // Update energy if provided
          if (data.energy) {
            setEnergy({
              current: data.energy.current || energy.current,
              max: data.energy.max || energy.max,
              bonusMax: data.energy.bonusMax || energy.bonusMax
            });
          }
          break;

        case 'task.claim_failed':
          // Task claim failed
          console.error('Task claim failed:', data.message);
          setClaimingTask(null);
          break;

        case 'user.energy':
          // Energy update
          setEnergy({
            current: data.current || 0,
            max: data.max || 0,
            bonusMax: data.bonusMax || 0
          });
          break;
          
        case 'referral.info':
          // Referral information
          setReferralCode(data.code || '');
          setReferralStats({
            invited: data.invited || 0,
            active: data.active || 0,
            totalReward: data.totalReward || 0
          });
          break;

        default:
          console.log('Unhandled task message:', data);
      }
    }
  });

  // Fetch tasks when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage({ type: 'tasks.get_list' });
      sendMessage({ type: 'user.get_energy' });
      sendMessage({ type: 'referral.get_info' });
    }
  }, [isConnected, sendMessage]);

  // Handle task claim
  const handleClaimTask = useCallback((taskId) => {
    if (!isConnected || claimingTask) return;
    
    setClaimingTask(taskId);
    sendMessage({
      type: 'task.claim',
      taskId
    });
  }, [isConnected, claimingTask,sendMessage]);

  // Check if a task is completed
  const isTaskCompleted = useCallback((taskId) => {
    return completedTasks.includes(taskId);
  }, [completedTasks]);

  // Copy referral link to clipboard
  const copyReferralLink = useCallback(() => {
    const referralLink = `https://t.me/XenohashBot?start=${referralCode}`;
    
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        // Visual feedback that copying worked
        const copyButton = document.getElementById('copy-referral-btn');
        if (copyButton) {
          copyButton.textContent = '✓ Copied';
          setTimeout(() => {
            copyButton.textContent = 'Copy Link';
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Failed to copy referral link:', err);
      });
  }, [referralCode]);

  // Share referral link via Telegram
  const shareReferralLink = useCallback(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      try {
        window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=https://t.me/XenohashBot?start=${referralCode}&text=Join%20me%20on%20Xenohash%20and%20start%20mining%20cryptocurrency%20on%20Telegram!`);
      } catch (error) {
        console.error('Failed to open Telegram share:', error);
      }
    }
  }, [referralCode]);

  // Group tasks by category
  const dailyTasks = tasks.filter(task => task.type === 'daily');
  const weeklyTasks = tasks.filter(task => task.type === 'weekly');
  const achievementTasks = tasks.filter(task => task.type === 'achievement');
  const referralTasks = tasks.filter(task => task.type === 'referral');

  // Calculate energy indicator percentage
  const energyPercentage = energy.max > 0 ? Math.min(100, (energy.current / energy.max) * 100) : 0;
  const maxEnergyWithBonus = energy.max + energy.bonusMax;

  // Render loading state
  if (loading) {
    return (
      <div className="tasks-loading">
        <div className="loading-spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      {/* Energy Status Bar */}
      <div className="energy-status">
        <h2>Energy</h2>
        <div className="energy-bar-container">
          <div 
            className="energy-bar-fill" 
            style={{ width: `${energyPercentage}%` }}
          ></div>
        </div>
        <div className="energy-values">
          <span className="energy-value">
            <span className="energy-icon">🔋</span>
            {energy.current} / {energy.max}
            {energy.bonusMax > 0 && <span className="bonus-energy"> (+{energy.bonusMax} Max)</span>}
          </span>
          <span className="energy-regen">+1/sec</span>
        </div>
      </div>

      {/* Referral System */}
      <div className="referral-section">
        <h2>Invite Friends</h2>
        <div className="referral-stats">
          <div className="stat-item">
            <span className="stat-value">{referralStats.invited}</span>
            <span className="stat-label">Invited</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{referralStats.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{referralStats.totalReward.toLocaleString()}</span>
            <span className="stat-label">Total Rewards</span>
          </div>
        </div>

        <div className="referral-actions">
          <button 
            id="copy-referral-btn"
            className="referral-button copy"
            onClick={copyReferralLink}
          >
            Copy Link
          </button>
          <button 
            className="referral-button share"
            onClick={shareReferralLink}
          >
            Share on Telegram
          </button>
        </div>

        <div className="referral-note">
          <p>Earn +1000 Energy Capacity for each active friend!</p>
        </div>
      </div>

      {/* Daily Tasks */}
      <div className="task-category">
        <h2>Daily Tasks</h2>
        <div className="tasks-grid">
          {dailyTasks.map(task => (
            <div 
              key={task.id}
              className={`task-card ${isTaskCompleted(task.id) ? 'completed' : ''}`}
            >
              <div className="task-info">
                <div className="task-title">{task.title}</div>
                <div className="task-description">{task.description}</div>
                <div className="task-reward">
                  <span className="reward-icon">🔋</span>
                  <span className="reward-value">+{task.energyReward}</span>
                  {task.maxEnergyBonus > 0 && (
                    <span className="reward-bonus">Max Energy +{task.maxEnergyBonus}</span>
                  )}
                </div>
                {task.progress && (
                  <div className="task-progress">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${(task.progress.current / task.progress.required) * 100}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {task.progress.current}/{task.progress.required}
                    </div>
                  </div>
                )}
              </div>
              <div className="task-action">
                {isTaskCompleted(task.id) ? (
                  <div className="task-completed-badge">
                    <span className="completed-icon">✓</span>
                    <span>Completed</span>
                  </div>
                ) : (
                  <button 
                    className="claim-button"
                    onClick={() => handleClaimTask(task.id)}
                    disabled={
                      claimingTask === task.id || 
                      (task.progress && task.progress.current < task.progress.required)
                    }
                  >
                    {claimingTask === task.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Tasks */}
      {weeklyTasks.length > 0 && (
        <div className="task-category">
          <h2>Weekly Tasks</h2>
          <div className="tasks-grid">
            {weeklyTasks.map(task => (
              <div 
                key={task.id}
                className={`task-card ${isTaskCompleted(task.id) ? 'completed' : ''}`}
              >
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-description">{task.description}</div>
                  <div className="task-reward">
                    <span className="reward-icon">🔋</span>
                    <span className="reward-value">+{task.energyReward}</span>
                    {task.maxEnergyBonus > 0 && (
                      <span className="reward-bonus">Max Energy +{task.maxEnergyBonus}</span>
                    )}
                  </div>
                  {task.progress && (
                    <div className="task-progress">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${(task.progress.current / task.progress.required) * 100}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        {task.progress.current}/{task.progress.required}
                      </div>
                    </div>
                  )}
                </div>
                <div className="task-action">
                  {isTaskCompleted(task.id) ? (
                    <div className="task-completed-badge">
                      <span className="completed-icon">✓</span>
                      <span>Completed</span>
                    </div>
                  ) : (
                    <button 
                      className="claim-button"
                      onClick={() => handleClaimTask(task.id)}
                      disabled={
                        claimingTask === task.id || 
                        (task.progress && task.progress.current < task.progress.required)
                      }
                    >
                      {claimingTask === task.id ? 'Claiming...' : 'Claim'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Tasks */}
      {achievementTasks.length > 0 && (
        <div className="task-category">
          <h2>Achievements</h2>
          <div className="tasks-grid">
            {achievementTasks.map(task => (
              <div 
                key={task.id}
                className={`task-card ${isTaskCompleted(task.id) ? 'completed' : ''}`}
              >
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-description">{task.description}</div>
                  <div className="task-reward">
                    <span className="reward-icon">🔋</span>
                    <span className="reward-value">+{task.energyReward}</span>
                    {task.maxEnergyBonus > 0 && (
                      <span className="reward-bonus">Max Energy +{task.maxEnergyBonus}</span>
                    )}
                  </div>
                  {task.progress && (
                    <div className="task-progress">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${(task.progress.current / task.progress.required) * 100}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        {task.progress.current}/{task.progress.required}
                      </div>
                    </div>
                  )}
                </div>
                <div className="task-action">
                  {isTaskCompleted(task.id) ? (
                    <div className="task-completed-badge">
                      <span className="completed-icon">✓</span>
                      <span>Completed</span>
                    </div>
                  ) : (
                    <button 
                      className="claim-button"
                      onClick={() => handleClaimTask(task.id)}
                      disabled={
                        claimingTask === task.id || 
                        (task.progress && task.progress.current < task.progress.required)
                      }
                    >
                      {claimingTask === task.id ? 'Claiming...' : 'Claim'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Tasks */}
      {referralTasks.length > 0 && (
        <div className="task-category">
          <h2>Referral Tasks</h2>
          <div className="tasks-grid">
            {referralTasks.map(task => (
              <div 
                key={task.id}
                className={`task-card ${isTaskCompleted(task.id) ? 'completed' : ''}`}
              >
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-description">{task.description}</div>
                  <div className="task-reward">
                    <span className="reward-icon">🔋</span>
                    <span className="reward-value">+{task.energyReward}</span>
                    {task.maxEnergyBonus > 0 && (
                      <span className="reward-bonus">Max Energy +{task.maxEnergyBonus}</span>
                    )}
                  </div>
                  {task.progress && (
                    <div className="task-progress">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${(task.progress.current / task.progress.required) * 100}%` }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        {task.progress.current}/{task.progress.required}
                      </div>
                    </div>
                  )}
                </div>
                <div className="task-action">
                  {isTaskCompleted(task.id) ? (
                    <div className="task-completed-badge">
                      <span className="completed-icon">✓</span>
                      <span>Completed</span>
                    </div>
                  ) : (
                    <button 
                      className="claim-button"
                      onClick={() => handleClaimTask(task.id)}
                      disabled={
                        claimingTask === task.id || 
                        (task.progress && task.progress.current < task.progress.required)
                      }
                    >
                      {claimingTask === task.id ? 'Claiming...' : 'Claim'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;