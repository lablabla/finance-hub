import { run, query } from './db/db.js';

export function normalizeAndSave({ account, transactions }, source_id) {
  if (!account?.id || !account?.name || !account?.type) {
    throw new Error('Invalid account data: id, name, type are required');
  }

  run(
    `INSERT INTO accounts (id, source_id, name, type, currency, balance, balance_usd, fx_rate, as_of, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       balance = excluded.balance,
       balance_usd = excluded.balance_usd,
       fx_rate = excluded.fx_rate,
       as_of = excluded.as_of,
       updated_at = excluded.updated_at`,
    [
      account.id,
      account.source_id || source_id,
      account.name,
      account.type,
      account.currency || 'ILS',
      account.balance ?? null,
      account.balance_usd ?? null,
      account.fx_rate ?? null,
      account.as_of || new Date().toISOString().split('T')[0],
    ]
  );

  let transactionsInserted = 0;
  let transactionsSkipped = 0;
  for (const tx of transactions || []) {
    if (!tx.id || !tx.date || tx.amount == null) {
      transactionsSkipped++;
      continue;
    }
    const result = run(
      `INSERT OR IGNORE INTO transactions
         (id, account_id, date, processed_date, description, category, amount, currency, amount_ils, status, source_file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.account_id,
        tx.date,
        tx.processed_date ?? null,
        tx.description ?? null,
        tx.category ?? null,
        tx.amount,
        tx.currency || 'ILS',
        tx.amount_ils ?? null,
        tx.status || 'completed',
        tx.source_file ?? null,
      ]
    );
    if (result.changes > 0) transactionsInserted++;
    else transactionsSkipped++;
  }

  recalcSnapshot(account.as_of);

  return { accountsUpserted: 1, transactionsInserted, transactionsSkipped };
}

function recalcSnapshot(date) {
  const snapshotDate = date || new Date().toISOString().split('T')[0];
  const accounts = query(`SELECT type, currency, balance, balance_usd, fx_rate FROM accounts`);
  const breakdown = {};
  let totalIls = 0;
  let totalUsd = 0;

  for (const a of accounts) {
    let ils = 0;
    if (a.currency === 'ILS') {
      ils = a.balance || 0;
    } else if (a.balance_usd != null) {
      ils = a.balance_usd * (a.fx_rate || 3.7);
      totalUsd += a.balance_usd;
    } else {
      ils = a.balance || 0;
    }
    breakdown[a.type] = (breakdown[a.type] || 0) + ils;
    totalIls += ils;
  }

  run(
    `INSERT INTO snapshots (date, total_ils, total_usd, breakdown)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       total_ils = excluded.total_ils,
       total_usd = excluded.total_usd,
       breakdown = excluded.breakdown`,
    [snapshotDate, totalIls, totalUsd, JSON.stringify(breakdown)]
  );
}
