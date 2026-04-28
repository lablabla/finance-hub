import Anthropic from '@anthropic-ai/sdk';
import { run } from '../db/db.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a financial data extraction assistant specializing in Israeli government financial reports (Hebrew).
Given the text of a government validation report and a list of known financial sources, extract all institutions and products mentioned in the report.
For each institution found, check if it matches one of the known sources. Return a matched_source_id if you find a match (use the source id field), or null if not found.
Return JSON array only. Schema:
[{ "institution": string, "product_type": string, "matched_source_id": string|null }]`;

export async function extractInstitutions(text, report_type, knownSources) {
  const sourceList = knownSources.map((s) => `${s.id}: ${s.name}`).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
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
        content: `Report type: ${report_type}\n\nKnown sources:\n${sourceList}\n\nReport text:\n${text}`,
      },
    ],
  });

  const raw = response.content[0].text;
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(json);
}

export async function compareWithSources(institutions, report_id) {
  let alertsCreated = 0;
  for (const inst of institutions) {
    if (!inst.matched_source_id) {
      run(
        `INSERT INTO source_alerts (report_id, institution, product_type) VALUES (?, ?, ?)`,
        [report_id, inst.institution, inst.product_type || null]
      );
      alertsCreated++;
    }
  }
  return { matched: institutions.length - alertsCreated, alertsCreated };
}
