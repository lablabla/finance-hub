import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import './InsightPanel.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

function renderMarkdown(text) {
  // Minimal markdown: bold, line breaks, headings
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br><br>');
}

export default function InsightPanel() {
  const monthOpts = getMonthOptions();
  const [selected, setSelected] = useState(0);
  const [content, setContent] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { year, month } = monthOpts[selected];

  useEffect(() => {
    setLoading(true); setContent(null);
    api.get(`/insights/${year}/${month}`)
      .then(d => { setContent(d.content); setGeneratedAt(d.generated_at); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]);

  const generate = async () => {
    setGenerating(true);
    try {
      const d = await api.post(`/insights/${year}/${month}`);
      setContent(d.content);
      setGeneratedAt(new Date().toISOString());
    } catch (e) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="insight-panel">
      <div className="insight-header">
        <select value={selected} onChange={e => setSelected(Number(e.target.value))}>
          {monthOpts.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
        </select>
        <button className="generate-btn" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : '✨ Generate Insight'}
        </button>
      </div>
      {loading && <p className="loading">Loading…</p>}
      {!loading && !content && (
        <div className="insight-empty">
          <p>No insight generated for {monthOpts[selected].label} yet.</p>
          <p>Click "Generate Insight" to create one with Claude AI.</p>
        </div>
      )}
      {content && (
        <div className="insight-body">
          <div className="insight-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          {generatedAt && <p className="insight-meta">Generated {new Date(generatedAt).toLocaleString()}</p>}
        </div>
      )}
    </div>
  );
}
