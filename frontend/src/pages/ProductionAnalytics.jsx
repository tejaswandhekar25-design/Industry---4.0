import React, { useState, useEffect } from 'react';
import { 
  LineChart as LineChartIcon, FileDown, 
  TrendingUp, Clock, AlertTriangle, Layers, Info 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { api } from '../services/api';

export default function ProductionAnalytics() {
  const [summary, setSummary] = useState({});
  const [faultStats, setFaultStats] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const sum = await api.getAnalyticsSummary();
      setSummary(sum);
      const fs = await api.getFaultFrequency();
      setFaultStats(fs);
    } catch (e) {
      console.warn('Error loading analytics:', e);
    }
  };

  const faultChartData = faultStats.map(f => ({
    name: f.fault_type.replace('_', ' '),
    count: f.count,
    severity: f.severity
  }));

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChartIcon size={22} style={{ color: 'var(--accent-blue)' }} />
            Production Analytics & Plant Reporting
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Plant-wide KPIs, historical fault distributions, and downloadable CSV records for audit
          </p>
        </div>

        {/* CSV Export Dropdown / Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={api.getExportUrl('sensors')} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.78rem' }}>
            <FileDown size={14} /> Telemetry CSV
          </a>
          <a href={api.getExportUrl('faults')} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.78rem' }}>
            <FileDown size={14} /> Faults CSV
          </a>
          <a href={api.getExportUrl('inspections')} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.78rem' }}>
            <FileDown size={14} /> Inspections CSV
          </a>
        </div>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card accent-blue">
          <div className="kpi-top">TOTAL TELEMETRY SAMPLES</div>
          <div className="kpi-value">{summary.sensor_readings_count ?? 0}</div>
          <div className="kpi-footer">Stored time-series records</div>
        </div>

        <div className="kpi-card accent-green">
          <div className="kpi-top">PLANT HEALTH AVERAGE</div>
          <div className="kpi-value">{summary.avg_health_score ?? 100}%</div>
          <div className="kpi-footer">Across all registered machinery</div>
        </div>

        <div className="kpi-card accent-amber">
          <div className="kpi-top">FAULT EVENTS LOGGED</div>
          <div className="kpi-value">{summary.fault_events_count ?? 0}</div>
          <div className="kpi-footer">Top: {summary.most_common_fault?.replace('_', ' ') || 'None'}</div>
        </div>

        <div className="kpi-card accent-red">
          <div className="kpi-top">WORK ORDERS / ACTIONS</div>
          <div className="kpi-value">{summary.maintenance_records_count ?? 0}</div>
          <div className="kpi-footer">Completed technician actions</div>
        </div>
      </div>

      {/* Formula & Calculation Transparent Explanation */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info size={16} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>KPI Mathematical Formulations</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ background: 'var(--panel-secondary)', padding: '12px', borderRadius: '6px' }}>
            <strong>Defect Rate (%)</strong>
            <p style={{ marginTop: '4px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
              (Defective Parts / Inspected Parts) × 100
            </p>
          </div>
          <div style={{ background: 'var(--panel-secondary)', padding: '12px', borderRadius: '6px' }}>
            <strong>Machine Health (%)</strong>
            <p style={{ marginTop: '4px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
              100 - (25 × Critical) - (10 × Warning) + (5 × Acknowledged)
            </p>
          </div>
          <div style={{ background: 'var(--panel-secondary)', padding: '12px', borderRadius: '6px' }}>
            <strong>Production Rate</strong>
            <p style={{ marginTop: '4px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
              Total Entered Units / Elapsed Active Hours
            </p>
          </div>
        </div>
      </div>

      {/* Fault Frequency Bar Chart */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <AlertTriangle size={18} style={{ color: 'var(--status-warning)' }} />
            Historical Fault Distribution by Type
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Categorized by rule-based condition triggers
          </span>
        </div>

        <div style={{ height: '280px', width: '100%' }}>
          {faultChartData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No fault events recorded in history yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faultChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#111c2f', borderColor: '#38bdf8', fontSize: '0.75rem' }} />
                <Bar dataKey="count" name="Fault Count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
