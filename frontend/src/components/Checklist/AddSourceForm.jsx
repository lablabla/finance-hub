import React, { useState } from 'react';
import { api } from '../../api/client.js';
import './AddSourceForm.css';

export default function AddSourceForm({ onAdded, onCancel }) {
  const [form, setForm] = useState({ id: '', name: '', category: 'bank', type: 'manual', format: 'CSV', url: '', frequency: 'monthly' });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.id || !form.name) return setError('ID and name are required');
    try {
      await api.post('/sources', form);
      onAdded();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="add-source-form" onSubmit={submit}>
      <h3>Add Source</h3>
      {error && <p className="form-error">{error}</p>}
      <div className="form-row">
        <label>ID <input value={form.id} onChange={e => set('id', e.target.value)} placeholder="e.g. my-bank" /></label>
        <label>Name <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Display name" /></label>
      </div>
      <div className="form-row">
        <label>Category
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {['bank','credit','pension','invest','insurance','other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Type
          <select value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="manual">Manual</option>
            <option value="api">API</option>
          </select>
        </label>
        <label>Format
          <select value={form.format} onChange={e => set('format', e.target.value)}>
            {['CSV','PDF','Excel','API'].map(f => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label>Frequency
          <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </label>
      </div>
      <label>Portal URL <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." /></label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Add</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
