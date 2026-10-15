import React, { useState, useEffect } from 'react';
import { History, Filter, Search, Calendar, FileText, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { api } from '../services/api';

export default function EventHistory() {
  const [events, setEvents] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'fault' | 'production' | 'maintenance'

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const [faults, prods, maints] = await Promise.all([
        api.getAlerts({ limit: 40 }),
        api.getProductionEvents({ limit: 40 }),
        api.getMaintenanceRecords({ limit: 40 })
      ]);

      const unified = [
        ...faults.map(f => ({
          id: `fault-${f.id}`,
          category: 'fault',
          type: f.fault_type,
          machine: f.machine_id,
          detail: f.description,
          severity: f.severity,
          time: f.created_at
        })),
        ...prods.map(p => ({
          id: `prod-${p.id}`,
          category: 'production',
          type: p.event_type,
          machine: p.machine_id,
          detail: p.details || `Product: ${p.product_id || 'N/A'}`,
          severity: 'info',
          time: p.event_timestamp
        })),
        ...maints.map(m => ({
          id: `maint-${m.id}`,
          category: 'maintenance',
          type: 'Maintenance Action',
          machine: m.machine_id,
          detail: `${m.action_taken} — ${m.technician_notes || ''}`,
          severity: 'success',
          time: m.created_at
        }))
      ];

      // Sort chronological descending
      unified.sort((a, b) => new Date(b.time) - new Date(a.time));
      setEvents(unified);
    } catch (e) {
      console.warn('Error loading event history:', e);
    }
  };

  const filtered = events.filter(e => {
    if (filterType === 'all') return true;
    return e.category === filterType;
  });

  const getIcon = (cat) => {
    switch (cat) {
      case 'fault': return <AlertTriangle size={15} style={{ color: 'var(--status-critical)' }} />;
      case 'production': return <CheckCircle2 size={15} style={{ color: 'var(--accent-blue)' }} />;
      case 'maintenance': return <Wrench size={15} style={{ color: 'var(--status-normal)' }} />;
      default: return <FileText size={15} />;
    }
  };

  return (
    <div className="page-viewport">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={22} style={{ color: 'var(--accent-blue)' }} />
            Factory Event History & Audit Log
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Unified time-stamped chronological audit log across machine condition faults, production line events, and maintenance actions
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'fault', 'production', 'maintenance'].map(cat => (
            <button
              key={cat}
              className={`btn ${filterType === cat ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}
              onClick={() => setFilterType(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Category</th>
              <th>Machine</th>
              <th>Event Type</th>
              <th>Description / Payload</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No logged events matching the filter.
                </td>
              </tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id}>
                  <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {e.time ? new Date(e.time).toLocaleString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getIcon(e.category)}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        {e.category}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{e.machine}</td>
                  <td style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                    {e.type.replace('_', ' ')}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {e.detail}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
