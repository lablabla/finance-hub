import React, { useState, useRef } from 'react';
import './UploadZone.css';

export default function UploadZone({ sourceId, onResult, onError }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const upload = async (file) => {
    if (!sourceId) return onError('Select a source first');
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('source_id', sourceId);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onResult(data);
    } catch (e) {
      onError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div
      className={`upload-zone${dragging ? ' dragging' : ''}${uploading ? ' uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept=".csv,.pdf" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
      {uploading ? (
        <p>Uploading…</p>
      ) : (
        <>
          <p className="drop-icon">📂</p>
          <p>Drag a CSV or PDF here, or click to browse</p>
        </>
      )}
    </div>
  );
}
