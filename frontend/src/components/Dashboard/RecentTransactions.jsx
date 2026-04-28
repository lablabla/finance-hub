import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import './Card.css';
import './RecentTransactions.css';

export default function RecentTransactions() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    api.get(`/transactions?from=${from}`).then(setTxs).catch(() => {});
  }, []);

  return (
    <div className="card tx-card">
      <h3 className="card-title">Recent Transactions (last 30 days)</h3>
      {txs.length === 0 ? (
        <p className="empty">No transactions yet.</p>
      ) : (
        <table className="tx-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {txs.slice(0, 50).map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{tx.description || '—'}</td>
                <td>{tx.category || '—'}</td>
                <td className={tx.amount < 0 ? 'debit' : 'credit'}>
                  {tx.currency === 'ILS' ? '₪' : '$'}{Math.abs(tx.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
