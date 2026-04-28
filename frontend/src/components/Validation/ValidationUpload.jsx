import React, { useState, useRef } from 'react';
import './ValidationUpload.css';

const REPORT_TYPES = [
  { id: 'har_habituach',       label: 'הר הביטוח (Har HaBituach)' },
  { id: 'pension_clearinghouse', label: 'המסלקה הפנסיונית (Pension Clearinghouse)' },
  { id: 'har_hakesef',         label: 'הר הכסף (Har HaKesef)' },
];

export default function ValidationUpload({ onDone }) {
  const [reportType, setReportType] = useState('har_habituach');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const upload = async (file) => {
    setUploading(true); setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('report_type', reportType);
    try {
      const res = await fetch('/api/validate/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onDone(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="val-upload">
      <h3>Upload Government Validation Report</h3>
      <label className="report-type-label">
        Report Type
        <select value={reportType} onChange={e => setReportType(e.target.value)}>
          {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <div
        className={`upload-zone${dragging ? ' dragging' : ''}${uploading ? ' uploading' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onClick={() => !uploading && inputRef.current.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,.csv,.xlsx" style={{ display: 'none' }} onChange={e => e.target.files[0] && upload(e.target.files[0])} />
        {uploading ? <p>Processing with AI…</p> : <><p className="drop-icon">🏛️</p><p>Drop PDF, CSV, or XLSX here or click to browse</p></>}
      </div>
      {error && <p className="val-error">{error}</p>}
    </div>
  );
}
