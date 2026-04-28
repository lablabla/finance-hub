import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../api/client.js';
import './Card.css';
import './SpendingChart.css';

export default function SpendingChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    api.get(`/transactions?from=${from}&to=${to}`).then((txs) => {
      const byCat = {};
      for (const tx of txs) {
        if (tx.amount >= 0) continue; // only debits
        const cat = tx.category || 'Uncategorised';
        byCat[cat] = (byCat[cat] || 0) + Math.abs(tx.amount);
      }
      setData(Object.entries(byCat).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value));
    }).catch(() => {});
  }, []);

  return (
    <div className="card spending-card">
      <h3 className="card-title">Spending This Month by Category</h3>
      {data.length === 0 ? (
        <p className="empty">No transactions this month yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
            <Bar dataKey="value" fill="#7c9ef8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
