import React, { useState } from 'react';
import { api } from '../../api/client.js';
import './AlertItem.css';

export default function AlertItem({ alert, sources, onAction }) {
  const [resolving, setResolving] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');

  const dismiss = async () => {
    await api.post(`/validate/alerts/${alert.id}/dismiss`);
    onAction();
  };

  const resolve = async () => {
    if (!selectedSource) return;
    await api.post(`/validate/alerts/${alert.id}/resolve`, { source_id: selectedSource });
    onAction();
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="alert-item">
      <div className="alert-info">
        <span className="alert-institution">{alert.institution}</span>
        {alert.product_type && <span className="alert-product">{alert.product_type}</span>}
        <span className="alert-meta">{MONTHS[alert.month]} {alert.year} · {alert.report_type.replace(/_/g, ' ')}</span>
      </div>
      <div className="alert-actions">
        {resolving ? (
          <>
            <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)}>
              <option value="">Select source…</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn-resolve" onClick={resolve} disabled={!selectedSource}>Confirm</button>
            <button className="btn-cancel" onClick={() => setResolving(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn-resolve" onClick={() => setResolving(true)}>Resolve</button>
            <button className="btn-dismiss" onClick={dismiss}>Dismiss</button>
          </>
        )}
      </div>
    </div>
  );
}
