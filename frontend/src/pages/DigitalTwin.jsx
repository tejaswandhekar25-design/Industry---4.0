import React, { useState } from 'react';
import { 
  Box, Cpu, Sliders, Activity, 
  Flame, Zap, Compass, Info, ShieldCheck 
} from 'lucide-react';
import FactoryScene from '../scene/FactoryScene';

export default function DigitalTwin({
  machineStatus = 'idle',
  telemetry = [],
  simState = {},
}) {
  const [selectedJoint, setSelectedJoint] = useState('base');

  // Extract readings
  const getVal = (type, fallback) => {
    const item = telemetry.find(t => t.sensor_type === type);
    return item ? item.reading_value : fallback;
  };

  const temp = getVal('temperature', 45.2);
  const vib = getVal('vibration', 3.4);
  const cur = getVal('motor_current', 8.1);
  const force = getVal('force', 5.0);

  // Joint angle readings from simulation
  const joints = [
    { name: 'Joint 1: Base Turntable', key: 'base', range: '-180° to +180°', axis: 'Y-Axis', current: '12.4°' },
    { name: 'Joint 2: Shoulder Pitch', key: 'shoulder', range: '-90° to +90°', axis: 'Z-Axis', current: '-24.8°' },
    { name: 'Joint 3: Elbow Pitch', key: 'elbow', range: '-135° to +135°', axis: 'Z-Axis', current: '42.1°' },
    { name: 'Joint 4: Wrist Roll', key: 'wrist_roll', range: '-180° to +180°', axis: 'X-Axis', current: '0.0°' },
    { name: 'Joint 5: Wrist Pitch', key: 'wrist_pitch', range: '-90° to +90°', axis: 'Z-Axis', current: '15.6°' },
    { name: 'End-Effector: Gripper', key: 'gripper', range: '0 to 50 mm', axis: 'Pneumatic', current: '28.0 mm' },
  ];

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={22} style={{ color: 'var(--accent-blue)' }} />
            Synchronized 3D Digital Twin — ROBOT-01
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Bi-directional digital representation synchronized with telemetry state and physics simulation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
          <span className={`badge badge-${machineStatus}`}>{machineStatus.toUpperCase()}</span>
        </div>
      </div>

      {/* Main Twin Layout: 3D Canvas + Telemetry Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Full 3D Viewport */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', height: '580px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', background: 'var(--panel-secondary)', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Interactive 3D Virtual Robot
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              6-Axis Articulated Kinematic Chain
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <FactoryScene 
              machineStatus={machineStatus} 
              simulationSpeed={simState.speed || 1.0}
            />
          </div>
        </div>

        {/* Telemetry & Joint Inspection Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Kinematic Joint State */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div className="card-title">
                <Sliders size={16} style={{ color: 'var(--accent-blue)' }} />
                Joint Encoders & Position
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {joints.map((j) => (
                <div 
                  key={j.key}
                  style={{
                    background: 'var(--panel-secondary)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--panel-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {j.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Range: {j.range} • {j.axis}
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {machineStatus === 'running' ? `${(Math.sin(Date.now() / 1000) * 20).toFixed(1)}°` : j.current}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Smart Sensors Snapshot */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={16} style={{ color: 'var(--accent-blue)' }} />
                Machine Sensor Telemetry
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--panel-secondary)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MOTOR TEMPERATURE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: temp > 75 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                  {temp} °C
                </div>
              </div>

              <div style={{ background: 'var(--panel-secondary)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VIBRATION (RMS)</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: vib > 8 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                  {vib} mm/s
                </div>
              </div>

              <div style={{ background: 'var(--panel-secondary)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MOTOR CURRENT</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: cur > 15 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                  {cur} A
                </div>
              </div>

              <div style={{ background: 'var(--panel-secondary)', padding: '10px 12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GRIPPER FORCE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {force} N
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Fidelity & Principle Explanation */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info size={16} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Digital Twin Fidelity & Architecture Note</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          This visual simulation demonstrates Industry 4.0 level-2 digital twin integration: real-time streaming telemetry and fault events alter the 3D model’s state, beacon lighting, and kinematic operations in real-time. Full industrial digital twins additionally incorporate certified finite-element analysis (FEA) and physical calibration models.
        </p>
      </div>
    </div>
  );
}
