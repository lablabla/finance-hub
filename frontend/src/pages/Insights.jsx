import React from 'react';
import InsightPanel from '../components/Insights/InsightPanel.jsx';

export default function Insights() {
  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.25rem', fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e' }}>Monthly Insights</h1>
      <InsightPanel />
    </div>
  );
}
