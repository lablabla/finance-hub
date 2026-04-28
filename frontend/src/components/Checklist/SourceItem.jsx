import React from 'react';
import './SourceItem.css';

export default function SourceItem({ item, onToggle, onDelete }) {
  const isAnnual = item.frequency === 'annual';

  return (
    <div className={`source-item${item.checked ? ' checked' : ''}`}>
      <label className="source-check">
        <input
          type="checkbox"
          checked={!!item.checked}
          onChange={(e) => onToggle(item.source_id, e.target.checked ? 1 : 0)}
        />
        <span className="source-name">{item.name}</span>
        {isAnnual && <span className="badge annual">Annual</span>}
        {item.type === 'api' && <span className="badge api">Auto</span>}
      </label>
      {item.checked && item.checked_at && (
        <span className="checked-at">{new Date(item.checked_at).toLocaleDateString()}</span>
      )}
      <button className="delete-btn" onClick={() => onDelete(item.source_id)} title="Remove source">×</button>
    </div>
  );
}
