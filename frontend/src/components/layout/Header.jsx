import React from 'react';
import { 
  Play, Pause, RotateCcw, AlertOctagon, 
  Cpu, Radio, ShieldAlert 
} from 'lucide-react';

export default function Header({
  simState = {},
  wsConnected = false,
  selectedMachine = 'ROBOT-01',
  onSelectMachine = () => {},
  onStart = () => {},
  onPause = () => {},
  onResume = () => {},
  onReset = () => {},
  onEmergencyStop = () => {},
}) {
  const isRunning = simState.running && !simState.paused && !simState.emergency_stop;
  const isPaused = simState.running && simState.paused && !simState.emergency_stop;
  const isEStop = simState.emergency_stop;

  return (
    <header className="header">
      {/* Brand & Factory Identity */}
      <div className="header-left">
        <div className="brand-badge">
          <div className="brand-logo-icon">
            <Cpu size={19} />
          </div>
          <span>SmartFactory 4.0</span>
        </div>
        <span className="header-tag">Digital Twin Platform</span>
      </div>

      {/* Simulation Master Controls in Header */}
      <div className="header-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--panel-secondary)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          {!simState.running ? (
            <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onStart}>
              <Play size={14} /> Start Sim
            </button>
          ) : isPaused ? (
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onResume}>
              <Play size={14} /> Resume
            </button>
          ) : (
            <button className="btn btn-warning" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onPause}>
              <Pause size={14} /> Pause
            </button>
          )}

          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onReset} title="Reset Simulation">
            <RotateCcw size={14} /> Reset
          </button>

          <button 
            className="btn btn-danger" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.8rem',
              animation: isEStop ? 'pulse 1s infinite' : 'none'
            }} 
            onClick={onEmergencyStop}
            title="Software E-Stop Simulation"
          >
            <AlertOctagon size={14} /> E-STOP
          </button>
        </div>

        {/* Machine Selector */}
        <select 
          className="form-select"
          style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          value={selectedMachine}
          onChange={(e) => onSelectMachine(e.target.value)}
        >
          <option value="ROBOT-01">Robot Arm #1 (ROBOT-01)</option>
          <option value="CONV-01">Conveyor #1 (CONV-01)</option>
        </select>
      </div>

      {/* Connection & Telemetry Status */}
      <div className="header-right">
        {/* Status Pill */}
        <div className="status-pill">
          <div className={`pulse-dot ${wsConnected ? 'online' : 'offline'}`} />
          <span>{wsConnected ? 'LIVE TELEMETRY' : 'CONNECTING...'}</span>
        </div>

        {/* MQTT Status Indicator */}
        <div className="status-pill" style={{ color: 'var(--text-muted)' }} title="IoT Architecture: MQTT broker fallback to internal simulation">
          <Radio size={13} style={{ color: 'var(--accent-blue)' }} />
          <span>MQTT / SIM</span>
        </div>
      </div>
    </header>
  );
}
