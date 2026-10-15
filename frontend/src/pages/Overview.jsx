import React, { useState, useEffect } from 'react';
import { 
  Bot, AlertTriangle, CheckCircle, Flame, 
  Activity, Zap, ArrowUpRight, ShieldCheck, 
  TrendingUp, RefreshCw 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import FactoryScene from '../scene/FactoryScene';
import { api } from '../services/api';

export default function Overview({ 
  telemetry = [], 
  machineStatus = 'idle',
  simState = {},
  alerts = [],
  productionSummary = {},
  onSelectMachine = () => {}
}) {
  const [machines, setMachines] = useState([]);
  const [recentReadings, setRecentReadings] = useState([]);

  useEffect(() => {
    loadMachines();
  }, []);

  // Update telemetry chart series from live stream
  useEffect(() => {
    if (telemetry && telemetry.length > 0) {
      const temp = telemetry.find(t => t.sensor_type === 'temperature')?.reading_value ?? 45;
      const vib = telemetry.find(t => t.sensor_type === 'vibration')?.reading_value ?? 3.5;
      const cur = telemetry.find(t => t.sensor_type === 'motor_current')?.reading_value ?? 8.0;

      const newPoint = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temp,
        vib,
        cur
      };

      setRecentReadings(prev => {
        const next = [...prev, newPoint];
        return next.length > 25 ? next.slice(next.length - 25) : next;
      });
    }
  }, [telemetry]);

  const loadMachines = async () => {
    try {
      const data = await api.getMachines();
      setMachines(data);
    } catch (e) {
      console.warn('Could not load machines:', e);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running': return <span className="badge badge-running">Running</span>;
      case 'warning': return <span className="badge badge-warning">Warning</span>;
      case 'critical': 
      case 'emergency_stop': return <span className="badge badge-critical">Critical / E-Stop</span>;
      case 'stopped': return <span className="badge badge-stopped">Stopped</span>;
      default: return <span className="badge badge-idle">Idle</span>;
    }
  };

  const latestTemp = telemetry.find(t => t.sensor_type === 'temperature')?.reading_value ?? 45.0;
  const latestVib = telemetry.find(t => t.sensor_type === 'vibration')?.reading_value ?? 3.5;
  const latestCur = telemetry.find(t => t.sensor_type === 'motor_current')?.reading_value ?? 8.2;

  return (
    <div className="page-viewport">
      {/* Simulation / Demonstration Banner */}
      <div className="demo-banner">
        <ShieldCheck size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
        <div>
          <strong>Industry 4.0 Demonstration Mode:</strong> Simulated industrial telemetry pipeline with rule-based fault detection, real-time WebSocket broadcast, and synchronized 3D Digital Twin.
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card accent-blue">
          <div className="kpi-top">
            <span>MACHINES RUNNING</span>
            <Bot size={18} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="kpi-value">
            {productionSummary.machines_running ?? (machineStatus === 'running' ? 1 : 0)} / {productionSummary.machines_total || 2}
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--status-normal)' }}>● Active Plant Cell</span>
          </div>
        </div>

        <div className="kpi-card accent-green">
          <div className="kpi-top">
            <span>PRODUCTS INSPECTED</span>
            <CheckCircle size={18} style={{ color: 'var(--status-normal)' }} />
          </div>
          <div className="kpi-value">{productionSummary.products_inspected ?? 0}</div>
          <div className="kpi-footer">
            <span>Passed: {productionSummary.products_passed ?? 0}</span>
            <span style={{ color: 'var(--status-critical)', marginLeft: 'auto' }}>
              Defects: {productionSummary.products_rejected ?? 0}
            </span>
          </div>
        </div>

        <div className="kpi-card accent-amber">
          <div className="kpi-top">
            <span>DEFECT RATE</span>
            <TrendingUp size={18} style={{ color: 'var(--status-warning)' }} />
          </div>
          <div className="kpi-value">{productionSummary.defect_rate ?? '0.0'}%</div>
          <div className="kpi-footer">
            <span>Target: &lt; 5.0%</span>
          </div>
        </div>

        <div className="kpi-card accent-red">
          <div className="kpi-top">
            <span>ACTIVE ALERTS</span>
            <AlertTriangle size={18} style={{ color: 'var(--status-critical)' }} />
          </div>
          <div className="kpi-value">{alerts.filter(a => a.status === 'active').length}</div>
          <div className="kpi-footer">
            <span>Unresolved condition events</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Scene + Live Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* 3D Digital Twin View */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Bot size={18} style={{ color: 'var(--accent-blue)' }} />
                3D Digital Twin — Station A
              </div>
              <div className="card-subtitle">
                Interactive real-time spatial simulation with synchronized machine state
              </div>
            </div>
            {getStatusBadge(machineStatus)}
          </div>

          <div style={{ flex: 1, minHeight: '380px' }}>
            <FactoryScene 
              machineStatus={machineStatus} 
              simulationSpeed={simState.speed || 1.0}
            />
          </div>
        </div>

        {/* Live Telemetry Streaming Charts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-header" style={{ marginBottom: '8px' }}>
            <div>
              <div className="card-title">
                <Activity size={18} style={{ color: 'var(--accent-blue)' }} />
                Live Sensor Telemetry
              </div>
              <div className="card-subtitle">Real-time continuously updated telemetry stream</div>
            </div>
          </div>

          {/* Quick Sensor Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'var(--panel-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={12} style={{ color: '#f97316' }} /> TEMPERATURE
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: latestTemp > 75 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                {latestTemp} °C
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Warn: &gt; 75 °C</div>
            </div>

            <div style={{ background: 'var(--panel-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} style={{ color: '#a855f7' }} /> VIBRATION
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: latestVib > 8 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                {latestVib} mm/s
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Warn: &gt; 8 mm/s</div>
            </div>

            <div style={{ background: 'var(--panel-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={12} style={{ color: '#38bdf8' }} /> MOTOR CURRENT
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: latestCur > 15 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                {latestCur} A
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Warn: &gt; 15 A</div>
            </div>
          </div>

          {/* Real-time Temperature & Vibration Trend */}
          <div style={{ flex: 1, minHeight: '220px', width: '100%' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Temperature (°C) & Vibration (mm/s) Live Trend
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={recentReadings}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem', borderRadius: '6px' }}
                />
                <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vib" name="Vibration (mm/s)" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Machine Status Cards & Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Machine Cards */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Bot size={18} style={{ color: 'var(--accent-blue)' }} />
              Connected Machines
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {machines.map((m) => (
              <div 
                key={m.id}
                style={{
                  background: 'var(--panel-secondary)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
                onClick={() => onSelectMachine(m.id)}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {m.name}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({m.id})</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {m.location}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HEALTH SCORE</div>
                    <div style={{ 
                      fontSize: '1rem', 
                      fontWeight: 700, 
                      color: (m.health_score ?? 100) > 80 ? 'var(--status-normal)' : (m.health_score ?? 100) > 50 ? 'var(--status-warning)' : 'var(--status-critical)' 
                    }}>
                      {m.health_score ?? 100}%
                    </div>
                  </div>
                  {getStatusBadge(m.operating_status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} style={{ color: 'var(--status-critical)' }} />
              Active Machine Faults & Alerts
            </div>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              ✓ No active machine alerts. All monitored parameters are within nominal thresholds.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.slice(0, 4).map((a) => (
                <div 
                  key={a.id}
                  style={{
                    background: a.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${a.severity === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: a.severity === 'critical' ? 'var(--status-critical)' : 'var(--status-warning)',
                      textTransform: 'uppercase' 
                    }}>
                      {a.severity} — {a.fault_type.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {a.machine_id}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {a.description}
                  </p>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Action: {a.recommended_action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
