import React, { useState } from 'react';
import { 
  SlidersHorizontal, Flame, Activity, Zap, 
  WifiOff, Clock, RotateCcw, ShieldCheck, 
  CheckCircle2, AlertOctagon, Save 
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings({ 
  simState = {}, 
  onRefreshSim = () => {} 
}) {
  const [speed, setSpeed] = useState(simState.speed || 1.0);
  const [activeMessage, setActiveMessage] = useState('');
  const [tempWarn, setTempWarn] = useState(75.0);
  const [tempCrit, setTempCrit] = useState(90.0);
  const [vibWarn, setVibWarn] = useState(8.0);
  const [vibCrit, setVibCrit] = useState(12.0);

  const handleInjectFault = async (faultType, severity = 'warning', value = null) => {
    try {
      await api.injectFault(faultType, 'ROBOT-01', severity, value);
      setActiveMessage(`Injected simulated fault: ${faultType.replace('_', ' ')} (${severity})`);
      onRefreshSim();
      setTimeout(() => setActiveMessage(''), 4000);
    } catch (e) {
      alert('Error injecting fault: ' + e.message);
    }
  };

  const handleClearFaults = async () => {
    try {
      await api.clearFaults('ROBOT-01');
      setActiveMessage('All simulated machine faults cleared. Normal operation resumed.');
      onRefreshSim();
      setTimeout(() => setActiveMessage(''), 4000);
    } catch (e) {
      alert('Error clearing faults: ' + e.message);
    }
  };

  const handleResetDemo = async () => {
    if (window.confirm('Reset full demonstration state? This will clear all active faults, reset machinery to idle, and refresh data.')) {
      try {
        await api.resetSimulation();
        setActiveMessage('Demo state successfully reset.');
        onRefreshSim();
        setTimeout(() => setActiveMessage(''), 4000);
      } catch (e) {
        alert('Reset failed: ' + e.message);
      }
    }
  };

  const handleSpeedChange = async (newSpeed) => {
    setSpeed(newSpeed);
    try {
      await api.setSpeed(newSpeed);
      onRefreshSim();
    } catch (e) {
      console.warn('Speed set error:', e);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    try {
      await api.updateSensorThresholds('ROBOT-01_TEMP_01', {
        warning_threshold: parseFloat(tempWarn),
        critical_threshold: parseFloat(tempCrit)
      });
      await api.updateSensorThresholds('ROBOT-01_VIB_01', {
        warning_threshold: parseFloat(vibWarn),
        critical_threshold: parseFloat(vibCrit)
      });
      setActiveMessage('Custom sensor thresholds updated in backend fault detection engine.');
      setTimeout(() => setActiveMessage(''), 4000);
    } catch (e) {
      alert('Threshold update failed: ' + e.message);
    }
  };

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={22} style={{ color: 'var(--accent-blue)' }} />
            Simulation Settings & Fault Injection Panel
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Interactive demonstration control panel for college evaluation, viva presentations, and parameter calibration
          </p>
        </div>
      </div>

      {activeMessage && (
        <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
          ✓ {activeMessage}
        </div>
      )}

      {/* College Demo Fault Injection Panel */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">
              <Zap size={18} style={{ color: 'var(--status-warning)' }} />
              Fault-Injection Demonstration Triggers (Section 17)
            </div>
            <div className="card-subtitle">
              Simulates physical industrial robot failure modes through the real backend evaluation and alert pipeline
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
          {/* Normal operation */}
          <button 
            className="btn btn-outline" 
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}
            onClick={handleClearFaults}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--status-normal)' }}>
              <CheckCircle2 size={16} /> Normal Operation
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Restore normal baseline telemetry
            </span>
          </button>

          {/* High temperature */}
          <button 
            className="btn btn-outline" 
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => handleInjectFault('high_temperature', 'critical', 96.5)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f97316' }}>
              <Flame size={16} /> High Temperature
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Ramps temperature to 96.5°C (&gt; 90°C crit)
            </span>
          </button>

          {/* Excessive vibration */}
          <button 
            className="btn btn-outline" 
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => handleInjectFault('excessive_vibration', 'critical', 15.2)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#a855f7' }}>
              <Activity size={16} /> Excessive Vibration
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Ramps vibration to 15.2 mm/s (&gt; 12 mm/s crit)
            </span>
          </button>

          {/* Motor Current */}
          <button 
            className="btn btn-outline" 
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => handleInjectFault('high_motor_current', 'critical', 24.5)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#38bdf8' }}>
              <Zap size={16} /> Motor Overcurrent
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Ramps current to 24.5 A (&gt; 20 A crit)
            </span>
          </button>

          {/* Sensor Disconnection */}
          <button 
            className="btn btn-outline" 
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}
            onClick={() => handleInjectFault('sensor_disconnection', 'warning')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--status-warning)' }}>
              <WifiOff size={16} /> Sensor Disconnect
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Cuts sensor signal to test offline handling
            </span>
          </button>

          {/* Stale Telemetry */}
          <button 
            className="btn btn-outline" 
            style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}
            onClick={() => handleInjectFault('stale_data', 'warning')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#cbd5e1' }}>
              <Clock size={16} /> Stale Telemetry
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Freezes reading values to test stale detector
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-warning" onClick={handleClearFaults}>
            Clear All Faults & Resume Nominal
          </button>
          <button className="btn btn-danger" onClick={handleResetDemo}>
            <RotateCcw size={14} /> Full Demo Reset
          </button>
        </div>
      </div>

      {/* Simulation Speed & Thresholds Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Speed Slider */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} style={{ color: 'var(--accent-blue)' }} />
              Simulation Clock & Speed Multiplier
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Playback Speed:</span>
              <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                {speed}x
              </span>
            </div>
            <input 
              type="range" 
              min="0.2" 
              max="4.0" 
              step="0.2" 
              value={speed} 
              onChange={e => handleSpeedChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>0.2x (Slow Motion)</span>
              <span>1.0x (Real-time)</span>
              <span>4.0x (Fast Forward)</span>
            </div>
          </div>
        </div>

        {/* Threshold Calibration Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} style={{ color: 'var(--accent-blue)' }} />
              Rule-Based Detection Thresholds
            </div>
          </div>

          <form onSubmit={handleSaveThresholds}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Temp Warning (°C)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="form-input" 
                  value={tempWarn} 
                  onChange={e => setTempWarn(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temp Critical (°C)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="form-input" 
                  value={tempCrit} 
                  onChange={e => setTempCrit(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vibration Warning (mm/s)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="form-input" 
                  value={vibWarn} 
                  onChange={e => setVibWarn(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vibration Critical (mm/s)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  className="form-input" 
                  value={vibCrit} 
                  onChange={e => setVibCrit(e.target.value)} 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
              <Save size={14} /> Update Detection Thresholds
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
