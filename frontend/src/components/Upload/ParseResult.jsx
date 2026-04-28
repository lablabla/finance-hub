import React from 'react';
import './ParseResult.css';

export default function ParseResult({ result, error }) {
  if (error) return <div className="parse-result error">Error: {error}</div>;
  if (!result) return null;
  return (
    <div className="parse-result success">
      Imported {result.transactionsInserted} transactions
      {result.transactionsSkipped > 0 && ` (${result.transactionsSkipped} skipped / duplicates)`}.
    </div>
  );
}
