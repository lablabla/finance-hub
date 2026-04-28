import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/checklist', label: 'Monthly Checklist', icon: '✅' },
  { to: '/upload', label: 'Upload', icon: '📤' },
  { to: '/validate', label: 'Validation', icon: '🏛️' },
  { to: '/insights', label: 'Insights', icon: '💡' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">Finance Hub</div>
      <ul className="sidebar-nav">
        {NAV.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{icon}</span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
