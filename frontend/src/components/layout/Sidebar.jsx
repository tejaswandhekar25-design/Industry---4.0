import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Box, Activity, Wrench, 
  CheckCircle2, LineChart, Server, History, 
  SlidersHorizontal, Info
} from 'lucide-react';

export default function Sidebar({ alertCount = 0 }) {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/digital-twin', label: 'Digital Twin', icon: Box },
    { to: '/sensors', label: 'Sensor Monitoring', icon: Activity },
    { to: '/predictive-maintenance', label: 'Maintenance', icon: Wrench, badge: alertCount },
    { to: '/quality-inspection', label: 'Quality Inspection', icon: CheckCircle2 },
    { to: '/production-analytics', label: 'Production Analytics', icon: LineChart },
    { to: '/machines', label: 'Machine Inventory', icon: Server },
    { to: '/events', label: 'Event History', icon: History },
    { to: '/settings', label: 'Settings & Faults', icon: SlidersHorizontal },
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          Navigation
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* College Project Info Card at Bottom */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', background: 'rgba(15, 23, 42, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Info size={14} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Industry 4.0 Capstone
          </span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Smart Sensors in Industrial Robots • Real-time Telemetry & 3D Twin
        </p>
      </div>
    </aside>
  );
}
