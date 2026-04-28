import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

const client = new Anthropic();

const SYSTEM_PROMPTS = {
  'harel-pension': `You extract structured financial data from Israeli pension fund (קרן פנסיה) PDF reports by Harel insurance.
Extract: account holder name, account number, current balance (in ILS), as-of date, and a list of transactions if present.
Return JSON only, no prose. Schema:
{
  "account": { "name": string, "id": string, "type": "pension", "currency": "ILS", "balance": number, "as_of": "YYYY-MM-DD" },
  "transactions": [{ "date": "YYYY-MM-DD", "description": string, "amount": number, "currency": "ILS" }]
}`,
  'harel-keren-hishtalmut': `You extract structured financial data from Israeli study fund (קרן השתלמות) PDF reports by Harel insurance.
Extract: account holder name, account number, current balance (in ILS), as-of date, and a list of transactions if present.
Return JSON only, no prose. Schema:
{
  "account": { "name": string, "id": string, "type": "study_fund", "currency": "ILS", "balance": number, "as_of": "YYYY-MM-DD" },
  "transactions": [{ "date": "YYYY-MM-DD", "description": string, "amount": number, "currency": "ILS" }]
}`,
  'excellence-investments': `You extract structured financial data from Israeli investment portfolio PDF reports by Excellence (אקסלנס) / Phoenix Holdings.
Extract: account holder name, account number, total portfolio value (in ILS or USD), as-of date, and holdings/transactions if present.
Return JSON only, no prose. Schema:
{
  "account": { "name": string, "id": string, "type": "investment", "currency": string, "balance": number, "as_of": "YYYY-MM-DD" },
  "transactions": [{ "date": "YYYY-MM-DD", "description": string, "amount": number, "currency": string }]
}`,
};

const DEFAULT_SYSTEM = `You extract structured financial data from Israeli financial PDF reports.
Return JSON only, no prose. Schema:
{
  "account": { "name": string, "id": string, "type": string, "currency": string, "balance": number, "as_of": "YYYY-MM-DD" },
  "transactions": [{ "date": "YYYY-MM-DD", "description": string, "amount": number, "currency": string }]
}`;

function txId(accountId, date, description, amount) {
  return crypto
    .createHash('sha256')
    .update(`${accountId}|${date}|${description}|${amount}`)
    .digest('hex')
    .slice(0, 32);
}

export async function extractFromPDF({ text, source_id }) {
  const systemPrompt = SYSTEM_PROMPTS[source_id] || DEFAULT_SYSTEM;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Extract financial data from this PDF text:\n\n${text}`,
      },
    ],
  });

  const raw = response.content[0].text;
  // Strip markdown code fences if present
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(json);

  const accountId = `${source_id}-${parsed.account.id || 'main'}`;
  const account = {
    id: accountId,
    source_id,
    name: parsed.account.name || source_id,
    type: parsed.account.type || 'investment',
    currency: parsed.account.currency || 'ILS',
    balance: parsed.account.balance || 0,
    balance_usd: null,
    fx_rate: null,
    as_of: parsed.account.as_of || new Date().toISOString().split('T')[0],
  };

  const transactions = (parsed.transactions || []).map((t) => ({
    id: txId(accountId, t.date, t.description, t.amount),
    account_id: accountId,
    date: t.date,
    processed_date: null,
    description: t.description,
    category: null,
    amount: t.amount,
    currency: t.currency || account.currency,
    amount_ils: t.currency === 'ILS' ? t.amount : null,
    status: 'completed',
  }));

  return { account, transactions };
}
