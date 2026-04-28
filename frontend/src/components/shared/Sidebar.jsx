import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/checklist', label: 'Monthly Checklist', icon: '✅' },
  { to: '/upload', label: 'Upload', icon: '📤' },
  { to: '/insights', label: 'Insights', icon: '💡' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="sidebar-hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
        <span /><span /><span />
      </button>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <nav className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">Finance Hub</div>
        <ul className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="sidebar-icon">{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
