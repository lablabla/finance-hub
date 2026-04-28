import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { fetchAccounts, fetchBalance } from './etrade.js';
import { getStoredAccessToken } from '../routes/etrade-auth.js';
import { run, query, get } from '../db/db.js';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function pollEtrade() {
  log('E*TRADE poll starting');
  const token = getStoredAccessToken();
  if (!token) {
    log('E*TRADE poll skipped — no access token stored');
    return;
  }
  try {
    const accounts = await fetchAccounts(token);
    for (const acct of accounts) {
      const idKey = acct.accountIdKey;
      const balance = await fetchBalance(token, idKey);
      const netValue = balance?.BalanceResponse?.Computed?.RealTimeValues?.totalAccountValue || 0;
      run(
        `INSERT INTO accounts (id, source_id, name, type, currency, balance, as_of, updated_at)
         VALUES (?, 'etrade', ?, 'investment', 'USD', ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET balance = excluded.balance, as_of = excluded.as_of, updated_at = excluded.updated_at`,
        [idKey, acct.accountDesc || idKey, netValue, new Date().toISOString().split('T')[0]]
      );
    }
    recalcSnapshot();
    log(`E*TRADE poll done — ${accounts.length} accounts updated`);
  } catch (e) {
    log(`E*TRADE poll error: ${e.message}`);
  }
}

function recalcSnapshot() {
  const today = new Date().toISOString().split('T')[0];
  const accounts = query(
    `SELECT type, currency, balance, balance_usd FROM accounts WHERE active IS NOT 0 OR active IS NULL`
  );
  const breakdown = {};
  let totalIls = 0;
  let totalUsd = 0;
  for (const a of accounts) {
    const ils = a.balance_usd != null ? a.balance_usd * (a.fx_rate || 3.7) : (a.balance || 0);
    breakdown[a.type] = (breakdown[a.type] || 0) + ils;
    totalIls += ils;
    if (a.balance_usd) totalUsd += a.balance_usd;
  }
  run(
    `INSERT INTO snapshots (date, total_ils, total_usd, breakdown)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET total_ils = excluded.total_ils, total_usd = excluded.total_usd, breakdown = excluded.breakdown`,
    [today, totalIls, totalUsd, JSON.stringify(breakdown)]
  );
}

export async function runNow() {
  await pollEtrade();
}

async function sendReminder() {
  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const msg = `Finance Hub reminder: download your monthly exports for ${monthName}`;
  log(`Sending reminder: ${msg}`);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: msg }),
    });
    log('Reminder sent via Telegram');
    return;
  }

  if (process.env.SMTP_HOST && process.env.REMINDER_EMAIL_TO) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.REMINDER_EMAIL_FROM,
      to: process.env.REMINDER_EMAIL_TO,
      subject: 'Finance Hub monthly reminder',
      text: msg,
    });
    log('Reminder sent via email');
  }
}

export function startScheduler() {
  // Daily at 06:00 — poll E*TRADE
  cron.schedule('0 6 * * *', pollEtrade);

  // 1st of each month at 08:00 — monthly reminder
  cron.schedule('0 8 1 * *', sendReminder);

  // Jan 1 at 09:00 — E*TRADE developer agreement renewal reminder
  cron.schedule('0 9 1 1 *', () => {
    log('REMINDER: Renew E*TRADE developer agreement at developer.etrade.com');
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: 'Finance Hub: Time to renew your E*TRADE developer agreement at developer.etrade.com',
        }),
      }).catch(() => {});
    }
  });

  log('Scheduler started');
}
