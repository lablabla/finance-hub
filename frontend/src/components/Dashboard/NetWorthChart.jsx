import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../api/client.js';
import './Card.css';

function fmt(n) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}

export default function NetWorthChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    api.get(`/snapshots?from=${from}&to=${to}`).then((rows) => {
      setData(rows.map((r) => ({ date: r.date, total: r.total_ils })));
    }).catch(() => {});
  }, []);

  return (
    <div className="card">
      <h3 className="card-title">Net Worth Over Time</h3>
      {data.length === 0 ? (
        <p className="empty">No history yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Line type="monotone" dataKey="total" stroke="#7c9ef8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
