import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import AlertItem from './AlertItem.jsx';
import './AlertsList.css';

export default function AlertsList({ refresh }) {
  const [alerts, setAlerts] = useState([]);
  const [sources, setSources] = useState([]);

  const load = () => {
    api.get('/validate/alerts').then(setAlerts).catch(() => {});
    api.get('/sources').then(setSources).catch(() => {});
  };

  useEffect(() => { load(); }, [refresh]);

  if (!alerts.length) return <p className="no-alerts">No unresolved alerts.</p>;

  return (
    <div className="alerts-list">
      <h3 className="alerts-title">Missing Source Alerts ({alerts.length})</h3>
      {alerts.map(a => (
        <AlertItem key={a.id} alert={a} sources={sources} onAction={load} />
      ))}
    </div>
  );
}
