import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client.js';
import SourceItem from './SourceItem.jsx';
import AddSourceForm from './AddSourceForm.jsx';
import './MonthlyChecklist.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

export default function MonthlyChecklist() {
  const monthOpts = getMonthOptions();
  const [selected, setSelected] = useState(0); // index into monthOpts
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const { year, month } = monthOpts[selected];

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/checklist/${year}/${month}`)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (source_id, checked) => {
    await api.post(`/checklist/${year}/${month}`, { source_id, checked });
    load();
  };

  const handleDelete = async (id) => {
    await api.del(`/sources/${id}`);
    load();
  };

  const handleAdded = () => { setShowAdd(false); load(); };

  const apiSources    = items.filter(i => i.type === 'api');
  const manualSources = items.filter(i => i.type === 'manual');

  const total   = items.length;
  const checked = items.filter(i => i.checked).length;
  const pct     = total ? Math.round((checked / total) * 100) : 0;

  // SVG progress ring
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;

  return (
    <div className="checklist-page">
      <div className="checklist-sidebar">
        <div className="month-list">
          {monthOpts.map((opt, i) => (
            <button
              key={i}
              className={`month-btn${i === selected ? ' active' : ''}`}
              onClick={() => setSelected(i)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="checklist-main">
        <div className="checklist-header">
          <div>
            <h1 className="page-title">{monthOpts[selected].label}</h1>
            <p className="checklist-subtitle">{checked}/{total} sources collected</p>
          </div>
          <svg width="70" height="70" className="progress-ring">
            <circle cx="35" cy="35" r={r} fill="none" stroke="#eee" strokeWidth="5" />
            <circle
              cx="35" cy="35" r={r}
              fill="none" stroke="#7c9ef8" strokeWidth="5"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={dash}
              strokeLinecap="round"
              transform="rotate(-90 35 35)"
            />
            <text x="35" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a2e">{pct}%</text>
          </svg>
        </div>

        {loading ? (
          <p className="loading">Loading…</p>
        ) : (
          <>
            <Section title="⚡ API Sources (auto)" sources={apiSources} year={year} month={month} onToggle={toggle} onDelete={handleDelete} />
            <Section title="📂 Manual Sources" sources={manualSources} year={year} month={month} onToggle={toggle} onDelete={handleDelete} />
          </>
        )}

        <div className="add-source-area">
          {showAdd ? (
            <AddSourceForm onAdded={handleAdded} onCancel={() => setShowAdd(false)} />
          ) : (
            <button className="add-source-btn" onClick={() => setShowAdd(true)}>+ Add Source</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, sources, year, month, onToggle, onDelete }) {
  if (!sources.length) return null;
  return (
    <div className="checklist-section">
      <h2 className="section-title">{title}</h2>
      {sources.map(item => (
        <SourceItem key={item.source_id} item={item} year={year} month={month} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </div>
  );
}
