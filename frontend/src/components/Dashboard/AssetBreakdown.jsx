import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client.js';
import './Card.css';

const COLORS = ['#7c9ef8', '#f87c7c', '#7cf8b4', '#f8d07c', '#c47cf8', '#7cf8f0', '#f8a07c'];

export default function AssetBreakdown() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const to = new Date().toISOString().split('T')[0];
    api.get(`/snapshots?from=2000-01-01&to=${to}`).then((rows) => {
      if (!rows.length) return;
      const latest = rows[rows.length - 1];
      const breakdown = JSON.parse(latest.breakdown || '{}');
      setData(Object.entries(breakdown).map(([name, value]) => ({ name, value: Math.round(value) })));
    }).catch(() => {});
  }, []);

  return (
    <div className="card">
      <h3 className="card-title">Asset Breakdown</h3>
      {data.length === 0 ? (
        <p className="empty">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
