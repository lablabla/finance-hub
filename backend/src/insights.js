import Anthropic from '@anthropic-ai/sdk';
import { query, get, run } from './db/db.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a personal finance analyst assistant. You generate clear, actionable monthly financial insights in English.
Given a user's financial data (accounts, transactions, net worth snapshots), write a concise monthly narrative covering:
- Net worth change vs previous month
- Top spending categories
- Notable transactions
- One or two actionable observations

Write in plain markdown. Be specific with numbers. Keep it under 400 words.`;

export async function generateInsight(year, month) {
  const accounts = query(`SELECT * FROM accounts`);
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
  const transactions = query(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT 200`,
    [monthStart, monthEnd]
  );
  const snapshot = get(
    `SELECT * FROM snapshots WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT 1`,
    [monthStart, monthEnd]
  );
  const prevMonthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const prevSnapshot = get(
    `SELECT * FROM snapshots WHERE date >= ? AND date < ? ORDER BY date DESC LIMIT 1`,
    [prevMonthStart, monthStart]
  );

  const context = JSON.stringify(
    { accounts, transactions, snapshot, prevSnapshot },
    null,
    2
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Generate a financial insight for ${year}-${String(month + 1).padStart(2, '0')}.\n\nData:\n${context}`,
      },
    ],
  });

  const content = response.content[0].text;
  run(
    `INSERT INTO insights (year, month, content, model)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET content = excluded.content, model = excluded.model, generated_at = datetime('now')`,
    [year, month, content, 'claude-sonnet-4-6']
  );
  return content;
}
