import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import UploadZone from '../components/Upload/UploadZone.jsx';
import ParseResult from '../components/Upload/ParseResult.jsx';
import './Upload.css';

export default function Upload() {
  const [sources, setSources] = useState([]);
  const [sourceId, setSourceId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/sources').then((s) => {
      const manual = s.filter(src => src.type === 'manual' && !['har-habituach','pension-clearinghouse','har-hakesef'].includes(src.id));
      setSources(manual);
      if (manual.length) setSourceId(manual[0].id);
    }).catch(() => {});
  }, []);

  const handleResult = (r) => { setResult(r); setError(''); };
  const handleError  = (e) => { setError(e); setResult(null); };

  return (
    <div className="upload-page">
      <h1 className="page-title">Upload Statement</h1>
      <div className="upload-card">
        <label className="source-select-label">
          Source
          <select value={sourceId} onChange={e => { setSourceId(e.target.value); setResult(null); setError(''); }}>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <UploadZone sourceId={sourceId} onResult={handleResult} onError={handleError} />
        <ParseResult result={result} error={error} />
      </div>
    </div>
  );
}
