import { useMining } from '../../context/MiningContext';
//import './EnergyStatus.css';

const EnergyStatus = () => {
  const { energy, isMining } = useMining();
  
  // Calculate total max energy
  const totalMax = energy.max + energy.bonus;
  
  // Calculate energy percentage for progress bar
  const energyPercentage = Math.min(100, Math.max(0, (energy.current / totalMax) * 100));
  
  // Format energy display
  const formatEnergy = (value) => {
    return value.toLocaleString();
  };

  return (
    <div className="energy-status">
      <div className="energy-header">
        <span className="energy-icon">🔋</span>
        <span className="energy-label">Energy</span>
        <span className="energy-value">
          {formatEnergy(energy.current)}/{formatEnergy(totalMax)}
          {energy.bonus > 0 && <span className="energy-bonus"> (+{formatEnergy(energy.bonus)} Max)</span>}
        </span>
      </div>
      
      <div className="energy-bar-container">
        <div 
          className={`energy-bar ${energy.current < 500 ? 'low' : ''} ${isMining ? 'active' : ''}`}
          style={{ width: `${energyPercentage}%` }}
        ></div>
      </div>
      
      <div className="energy-info">
        <span className="recharge-info">
          {!isMining 
            ? 'Recharging +1/sec' 
            : 'Consuming while mining'}
        </span>
      </div>
    </div>
  );
};

export default EnergyStatus;