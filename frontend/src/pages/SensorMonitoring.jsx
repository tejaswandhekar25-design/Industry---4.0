import React, { useState, useEffect } from 'react';
import { 
  Activity, Flame, Zap, Compass, 
  Eye, CheckCircle2, AlertTriangle, Radio, RefreshCw 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend 
} from 'recharts';
import { api } from '../services/api';

export default function SensorMonitoring({ telemetry = [] }) {
  const [history, setHistory] = useState([]);
  const [timeFilter, setTimeFilter] = useState(15); // minutes
  const [sensors, setSensors] = useState([]);

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    if (telemetry && telemetry.length > 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const temp = telemetry.find(t => t.sensor_type === 'temperature')?.reading_value ?? 45;
      const vib = telemetry.find(t => t.sensor_type === 'vibration')?.reading_value ?? 3.5;
      const cur = telemetry.find(t => t.sensor_type === 'motor_current')?.reading_value ?? 8.0;
      const force = telemetry.find(t => t.sensor_type === 'force')?.reading_value ?? 5.0;

      setHistory(prev => {
        const next = [...prev, { time: now, temp, vib, cur, force }];
        return next.length > 30 ? next.slice(next.length - 30) : next;
      });
    }
  }, [telemetry]);

  const loadSensors = async () => {
    try {
      const data = await api.getMachineSensors('ROBOT-01');
      setSensors(data);
    } catch (e) {
      console.warn('Could not load sensor metadata:', e);
    }
  };

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} style={{ color: 'var(--accent-blue)' }} />
            Connected Sensor Monitoring & Telemetry
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time multi-channel telemetry acquisition from robot joint sensors, thermistors, and accelerometers
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--panel-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          {[5, 15, 30, 60].map((m) => (
            <button
              key={m}
              className={`btn ${timeFilter === m ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setTimeFilter(m)}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Sensor Channel Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {sensors.map((s) => {
          const liveItem = telemetry.find(t => t.sensor_id === s.id);
          const liveVal = liveItem?.reading_value ?? s.last_reading ?? '--';
          const isDisconnected = liveItem?.connection_status === 'disconnected';
          const isStale = liveItem?.connection_status === 'stale';

          return (
            <div key={s.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {s.name}
                </span>
                <span className={`badge ${isDisconnected ? 'badge-critical' : isStale ? 'badge-warning' : 'badge-running'}`} style={{ fontSize: '0.65rem' }}>
                  {isDisconnected ? 'DISCONNECTED' : isStale ? 'STALE' : 'CONNECTED'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                <span className="font-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {isDisconnected ? 'N/A' : liveVal}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.unit}</span>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Warn: {s.warning_threshold ?? '--'} {s.unit}</span>
                <span>Crit: {s.critical_threshold ?? '--'} {s.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Temperature Chart with Thresholds */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Flame size={16} style={{ color: '#f97316' }} />
              Motor Temperature (°C)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thresholds: 75°C (Warn) / 90°C (Crit)</span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[30, 110]} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem' }} />
                <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn (75°C)', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crit (90°C)', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="temp" name="Temperature" stroke="#f97316" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vibration Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={16} style={{ color: '#a855f7' }} />
              Structural Vibration (mm/s RMS)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thresholds: 8 mm/s / 12 mm/s</span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 20]} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem' }} />
                <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn (8 mm/s)', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={12} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crit (12 mm/s)', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="vib" name="Vibration" stroke="#a855f7" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Motor Current */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Zap size={16} style={{ color: '#38bdf8' }} />
              Motor Current Draw (A)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thresholds: 15 A / 20 A</span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 30]} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem' }} />
                <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warn (15 A)', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Crit (20 A)', fill: '#ef4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="cur" name="Current" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gripper Force */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Compass size={16} style={{ color: '#22c55e' }} />
              Gripper Clamping Force (N)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nominal: 4 - 8 N</span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 20]} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem' }} />
                <Line type="monotone" dataKey="force" name="Force" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
