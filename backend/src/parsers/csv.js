import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import crypto from 'crypto';

function txId(accountId, date, description, amount) {
  return crypto
    .createHash('sha256')
    .update(`${accountId}|${date}|${description}|${amount}`)
    .digest('hex')
    .slice(0, 32);
}

// Otzar HaHayal bank CSV — Hebrew headers
function mapOtzarHahayal(rows) {
  const accountId = 'otzar-hahayal-main';
  const transactions = rows.map((r) => {
    // Headers vary; try both Hebrew and transliterated keys
    const date = r['תאריך'] || r['Date'] || '';
    const description = r['תיאור'] || r['Description'] || '';
    const credit = parseFloat(r['זכות'] || r['Credit'] || '0') || 0;
    const debit = parseFloat(r['חובה'] || r['Debit'] || '0') || 0;
    const amount = credit - debit;
    return {
      id: txId(accountId, date, description, amount),
      account_id: accountId,
      date: parseIsraeliDate(date),
      processed_date: null,
      description,
      category: null,
      amount,
      currency: 'ILS',
      amount_ils: amount,
      status: 'completed',
    };
  });
  // Balance from last row if present
  const lastRow = rows[rows.length - 1];
  const balance = parseFloat(lastRow?.['יתרה'] || lastRow?.['Balance'] || '0') || 0;
  return {
    account: {
      id: accountId,
      source_id: 'otzar-hahayal',
      name: 'Otzar HaHayal Main',
      type: 'checking',
      currency: 'ILS',
      balance,
      balance_usd: null,
      fx_rate: null,
      as_of: transactions[0]?.date || new Date().toISOString().split('T')[0],
    },
    transactions,
  };
}

// Visa Cal credit card CSV
function mapVisaCal(rows) {
  const accountId = 'visa-cal-main';
  const transactions = rows.map((r) => {
    const date = r['תאריך עסקה'] || r['Date'] || '';
    const description = r['שם בית עסק'] || r['Description'] || '';
    const amount = -(parseFloat(r['סכום חיוב'] || r['Amount'] || '0') || 0);
    return {
      id: txId(accountId, date, description, amount),
      account_id: accountId,
      date: parseIsraeliDate(date),
      processed_date: null,
      description,
      category: null,
      amount,
      currency: 'ILS',
      amount_ils: amount,
      status: 'completed',
    };
  });
  return {
    account: {
      id: accountId,
      source_id: 'visa-cal',
      name: 'Visa Cal',
      type: 'credit',
      currency: 'ILS',
      balance: transactions.reduce((s, t) => s + t.amount, 0),
      balance_usd: null,
      fx_rate: null,
      as_of: transactions[0]?.date || new Date().toISOString().split('T')[0],
    },
    transactions,
  };
}

function parseIsraeliDate(str) {
  // dd/mm/yyyy or yyyy-mm-dd
  if (!str) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const [d, m, y] = str.split('/');
  if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return str;
}

const MAPPERS = {
  'otzar-hahayal': mapOtzarHahayal,
  'visa-cal': mapVisaCal,
};

export function parseCSV(filePath, sourceId) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => {
        const mapper = MAPPERS[sourceId];
        if (!mapper) return reject(new Error(`No CSV mapper for source: ${sourceId}`));
        try {
          resolve(mapper(rows));
        } catch (e) {
          reject(e);
        }
      });
  });
}
