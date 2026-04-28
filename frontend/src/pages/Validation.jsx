import React, { useState } from 'react';
import ValidationUpload from '../components/Validation/ValidationUpload.jsx';
import AlertsList from '../components/Validation/AlertsList.jsx';
import './Validation.css';

export default function Validation() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastResult, setLastResult] = useState(null);

  const handleDone = (result) => {
    setLastResult(result);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="validation-page">
      <h1 className="page-title">Government Validation</h1>
      <p className="val-desc">Upload Har HaBituach or Pension Clearinghouse PDFs to check for missing sources.</p>
      <ValidationUpload onDone={handleDone} />
      {lastResult && (
        <div className="upload-summary">
          Found {lastResult.institutions?.length || 0} institutions — {lastResult.alertsCreated} new alerts created.
        </div>
      )}
      <AlertsList refresh={refreshKey} />
    </div>
  );
}
