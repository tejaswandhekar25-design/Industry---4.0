import React, { useState, useEffect } from 'react';
import { Server, Bot, Cpu, MapPin, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function MachineManagement({ selectedMachine = 'ROBOT-01' }) {
  const [machines, setMachines] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [activeMid, setActiveMid] = useState(selectedMachine);

  useEffect(() => {
    loadData();
  }, [activeMid]);

  const loadData = async () => {
    try {
      const ms = await api.getMachines();
      setMachines(ms);
      if (activeMid) {
        const ss = await api.getMachineSensors(activeMid);
        setSensors(ss);
      }
    } catch (e) {
      console.warn('Error loading machines:', e);
    }
  };

  const currentMachine = machines.find(m => m.id === activeMid) || machines[0];

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={22} style={{ color: 'var(--accent-blue)' }} />
            Machine Inventory & Sensor Management
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Plant equipment database, physical locations, kinematic parameters, and sensor channel assignments
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Machine List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {machines.map((m) => (
            <div 
              key={m.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: m.id === activeMid ? 'var(--accent-blue)' : 'var(--panel-border)',
                background: m.id === activeMid ? 'rgba(56, 189, 248, 0.05)' : 'var(--panel-card)'
              }}
              onClick={() => setActiveMid(m.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{m.name}</div>
                <span className={`badge badge-${m.operating_status}`}>{m.operating_status}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                ID: {m.id} • Type: {m.machine_type}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <MapPin size={12} /> {m.location}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Machine Detail & Sensors */}
        {currentMachine && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Bot size={18} style={{ color: 'var(--accent-blue)' }} />
                    {currentMachine.name} Specification
                  </div>
                  <div className="card-subtitle">{currentMachine.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HEALTH INDEX</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--status-normal)' }}>
                    {currentMachine.health_score}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'var(--panel-secondary)', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LOCATION</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentMachine.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>OPERATING STATUS</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{currentMachine.operating_status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DATABASE ID</div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>{currentMachine.id}</div>
                </div>
              </div>
            </div>

            {/* Assigned Sensors */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Activity size={18} style={{ color: 'var(--accent-blue)' }} />
                  Installed Smart Sensors ({sensors.length})
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sensor ID</th>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Unit</th>
                      <th>Warning Limit</th>
                      <th>Critical Limit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono" style={{ fontSize: '0.8rem' }}>{s.id}</td>
                        <td style={{ textTransform: 'capitalize' }}>{s.sensor_type.replace('_', ' ')}</td>
                        <td>{s.name}</td>
                        <td className="font-mono">{s.unit}</td>
                        <td className="font-mono">{s.warning_threshold ?? '—'}</td>
                        <td className="font-mono">{s.critical_threshold ?? '—'}</td>
                        <td>
                          <span className={`badge ${s.connection_status === 'connected' ? 'badge-running' : 'badge-critical'}`}>
                            {s.connection_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
