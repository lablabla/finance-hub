import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import './NetWorthCard.css';

const CATEGORY_LABELS = {
  bank: 'Bank', credit: 'Credit', pension: 'Pension',
  invest: 'Investments', investment: 'Investments',
  study_fund: 'Study Fund', insurance: 'Insurance', other: 'Other',
};

function fmt(n, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

export default function NetWorthCard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/accounts').then(setAccounts).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalIls = accounts.reduce((s, a) => s + (a.currency === 'ILS' ? (a.balance || 0) : (a.balance_usd || 0) * (a.fx_rate || 3.7)), 0);
  const byCategory = accounts.reduce((acc, a) => {
    const cat = CATEGORY_LABELS[a.type] || a.type;
    acc[cat] = (acc[cat] || 0) + (a.currency === 'ILS' ? (a.balance || 0) : (a.balance_usd || 0) * (a.fx_rate || 3.7));
    return acc;
  }, {});

  return (
    <div className="net-worth-card">
      <div className="net-worth-header">
        <h2>Net Worth</h2>
        <button onClick={load} className="refresh-btn" title="Refresh">↻</button>
      </div>
      {loading ? (
        <p className="loading">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="empty">No accounts yet. Upload a statement to get started.</p>
      ) : (
        <>
          <div className="net-worth-total">{fmt(totalIls)}</div>
          <div className="category-breakdown">
            {Object.entries(byCategory).map(([cat, val]) => (
              <div key={cat} className="category-row">
                <span>{cat}</span>
                <span>{fmt(val)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
