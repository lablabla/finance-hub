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

// Otzar HaHayal securities portfolio XLSX
// Columns: _1=נייר, _2=מספר נייר, _5=כמות, _6=שער אחרון, _7=מטבע, _16=שווי אחזקה בשח
function mapOtzarHahayalSecurities(rows) {
  // Find meta row: contains "סניף:"
  const metaRow = rows.find(r => String(r[' _1'] || '').includes('סניף:')) || {};
  const branchStr  = String(metaRow[' _1'] || '');
  const accountStr = String(metaRow[' _2'] || '');
  const dateStr    = String(metaRow[' _3'] || '');

  const branch  = branchStr.replace('סניף:', '').trim();
  const account = accountStr.replace('חשבון:', '').trim();
  const asOf    = parseIsraeliDate(dateStr.replace('תאריך ייצוא:', '').trim());
  const accountId = `otzar-hahayal-securities-${account || 'main'}`;

  // Portfolio total: row containing שווי תיק
  const totalRow = rows.find(r => String(r[' _1'] || '').includes('שווי תיק'));
  const balance  = parseFloat(String(totalRow?.[' _2'] || '0').replace(/,/g, '')) || 0;

  // Find header row index (where _1 === "נייר")
  const headerIdx = rows.findIndex(r => String(r[' _1'] || '').trim() === 'נייר');

  // Section headers to skip (not actual holdings)
  const SKIP = ['ניע ישראלים', 'ניע זרים', 'קרנות נאמנות', 'אגרות חוב', 'מניות', 'תעודות סל'];

  const holdings = headerIdx >= 0
    ? rows.slice(headerIdx + 1).filter(r => {
        const name = String(r[' _1'] || '').trim();
        return name && !SKIP.some(s => name.includes(s)) && !name.includes('סה"כ') && !name.includes('סהכ');
      })
    : [];

  const transactions = holdings.map(r => {
    const name     = String(r[' _1'] || '').trim();
    const secNum   = String(r[' _2'] || '').trim();
    const qty      = parseFloat(String(r[' _5'] || '0').replace(/,/g, '')) || 0;
    const price    = parseFloat(String(r[' _6'] || '0').replace(/,/g, '')) || 0;
    const currency = String(r[' _7'] || '₪').trim() === '₪' ? 'ILS' : (r[' _7'] || 'ILS');
    const valueIls = parseFloat(String(r[' _16'] || '0').replace(/,/g, '')) || 0;
    const desc     = secNum ? `${name} (${secNum}) × ${qty}` : `${name} × ${qty}`;
    return {
      id: txId(accountId, asOf, desc, valueIls),
      account_id: accountId,
      date: asOf,
      processed_date: null,
      description: desc,
      category: 'holding',
      amount: valueIls,
      currency: 'ILS',
      amount_ils: valueIls,
      status: 'completed',
    };
  });

  return {
    account: {
      id: accountId,
      source_id: 'otzar-hahayal-securities',
      name: `Otzar HaHayal Securities (${account})`,
      type: 'investment',
      currency: 'ILS',
      balance,
      balance_usd: null,
      fx_rate: null,
      as_of: asOf,
    },
    transactions,
  };
}

const MAPPERS = {
  'otzar-hahayal': mapOtzarHahayal,
  'otzar-hahayal-securities': mapOtzarHahayalSecurities,
  'visa-cal': mapVisaCal,
};

// Apply a source mapper to pre-parsed rows (used by both CSV and XLSX paths)
export function applyMapper(rows, sourceId) {
  const mapper = MAPPERS[sourceId];
  if (!mapper) throw new Error(`No CSV mapper for source: ${sourceId}`);
  return mapper(rows);
}

export function parseCSV(filePath, sourceId) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', () => {
        try {
          resolve(applyMapper(rows, sourceId));
        } catch (e) {
          reject(e);
        }
      });
  });
}
