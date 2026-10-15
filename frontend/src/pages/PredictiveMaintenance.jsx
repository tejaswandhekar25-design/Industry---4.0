import React, { useState } from 'react';
import { 
  Wrench, AlertTriangle, CheckCircle, Clock, 
  FileDown, ShieldCheck, UserCheck, HelpCircle 
} from 'lucide-react';
import { api } from '../services/api';

export default function PredictiveMaintenance({ 
  alerts = [], 
  onRefreshAlerts = () => {} 
}) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'acknowledge' | 'resolve'
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('Operator-01');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter === 'all') return true;
    return a.severity === severityFilter;
  });

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    try {
      await api.acknowledgeAlert(selectedAlert.id, technicianName);
      setSelectedAlert(null);
      setModalMode(null);
      onRefreshAlerts();
    } catch (e) {
      alert('Error acknowledging alert: ' + e.message);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    try {
      await api.resolveAlert(selectedAlert.id, technicianNotes || 'Fault cleared after inspection.');
      // Also log a maintenance record
      await api.createMaintenanceRecord({
        machine_id: selectedAlert.machine_id,
        fault_event_id: selectedAlert.id,
        action_taken: 'Inspected and verified operating conditions.',
        technician_notes: technicianNotes,
        inspection_result: 'Passed',
        downtime_minutes: 15
      });
      setSelectedAlert(null);
      setModalMode(null);
      setTechnicianNotes('');
      onRefreshAlerts();
    } catch (e) {
      alert('Error resolving alert: ' + e.message);
    }
  };

  const handleDownloadCsv = () => {
    window.open('http://localhost:8000/api/analytics/export/faults/csv', '_blank');
  };

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={22} style={{ color: 'var(--accent-blue)' }} />
            Predictive Maintenance & Machine Health
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Condition-based anomaly alerts, deduplicated fault logging, and technician resolution workflows
          </p>
        </div>

        <button className="btn btn-outline" onClick={handleDownloadCsv}>
          <FileDown size={15} /> Export Fault History (CSV)
        </button>
      </div>

      {/* Health Score Calculation Explanation Box */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <HelpCircle size={16} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Transparent Health Score Calculation Model</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          The machine health score begins at <strong>100%</strong>. Deductions are transparently applied based on active condition events:
          <strong> -25%</strong> for each critical threshold violation, <strong> -10%</strong> for warning anomalies, and partial restoration (+5%) once an operator acknowledges the work order. This provides an explainable metric without fabricating unvalidated Remaining Useful Life (RUL) estimates.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {['all', 'critical', 'warning'].map(f => (
          <button
            key={f}
            className={`btn ${severityFilter === f ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}
            onClick={() => setSeverityFilter(f)}
          >
            {f} Alerts ({alerts.filter(a => f === 'all' ? true : a.severity === f).length})
          </button>
        ))}
      </div>

      {/* Fault Events Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Machine</th>
              <th>Fault Type</th>
              <th>Severity</th>
              <th>Observed vs Limit</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No fault events matching the current filter.
                </td>
              </tr>
            ) : (
              filteredAlerts.map(a => (
                <tr key={a.id}>
                  <td className="font-mono">#{a.id}</td>
                  <td style={{ fontWeight: 600 }}>{a.machine_id}</td>
                  <td>{a.fault_type.replace('_', ' ')}</td>
                  <td>
                    <span className={`badge ${a.severity === 'critical' ? 'badge-critical' : 'badge-warning'}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.8rem' }}>
                    {a.observed_value != null ? `${a.observed_value} / ${a.threshold_value ?? '--'}` : 'N/A'}
                  </td>
                  <td style={{ maxWidth: '280px', fontSize: '0.8rem' }}>{a.description}</td>
                  <td>
                    <span className={`badge ${a.status === 'active' ? 'badge-critical' : a.status === 'acknowledged' ? 'badge-warning' : 'badge-running'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.status === 'active' && (
                      <button 
                        className="btn btn-warning" 
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        onClick={() => { setSelectedAlert(a); setModalMode('acknowledge'); }}
                      >
                        Acknowledge
                      </button>
                    )}
                    {a.status === 'acknowledged' && (
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        onClick={() => { setSelectedAlert(a); setModalMode('resolve'); }}
                      >
                        Resolve
                      </button>
                    )}
                    {a.status === 'resolved' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--status-normal)' }}>✓ Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Acknowledge / Resolve */}
      {modalMode && selectedAlert && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {modalMode === 'acknowledge' ? 'Acknowledge Fault Alert' : 'Complete Maintenance Work Order'}
              </div>
              <button className="btn btn-outline" style={{ padding: '2px 6px' }} onClick={() => setModalMode(null)}>
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: '14px', background: 'var(--panel-secondary)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FAULT DETAILS</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {selectedAlert.fault_type} on {selectedAlert.machine_id}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {selectedAlert.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '6px' }}>
                  Recommended: {selectedAlert.recommended_action}
                </div>
              </div>

              {modalMode === 'acknowledge' ? (
                <div className="form-group">
                  <label className="form-label">Operator / Technician ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={technicianName} 
                    onChange={e => setTechnicianName(e.target.value)} 
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Resolution & Technician Notes</label>
                  <textarea 
                    className="form-textarea" 
                    rows={4}
                    placeholder="Describe actions taken (e.g., inspected cooling fan, re-seated connector, verified vibration levels nominal)..."
                    value={technicianNotes}
                    onChange={e => setTechnicianNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div style={{ padding: '14px 22px', background: 'var(--panel-secondary)', borderTop: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setModalMode(null)}>
                Cancel
              </button>
              {modalMode === 'acknowledge' ? (
                <button className="btn btn-warning" onClick={handleAcknowledge}>
                  Confirm Acknowledgment
                </button>
              ) : (
                <button className="btn btn-success" onClick={handleResolve}>
                  Confirm & Clear Fault
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
