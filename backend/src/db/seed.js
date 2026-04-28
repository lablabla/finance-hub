import 'dotenv/config';
import { run } from './db.js';

const sources = [
  {
    id: 'etrade',
    name: 'E*TRADE',
    category: 'invest',
    type: 'manual',
    format: 'CSV',
    url: 'https://us.etrade.com',
    notes: 'US stocks. Export portfolio CSV from the E*TRADE website.',
    frequency: 'monthly',
  },
  {
    id: 'otzar-hahayal-securities',
    name: 'Otzar HaHayal – Securities',
    category: 'invest',
    type: 'manual',
    format: 'XLSX',
    url: 'https://www.otsarhahayal.co.il',
    notes: 'Securities portfolio (תיק ני"ע). Export via the portfolio page.',
    frequency: 'monthly',
  },
  {
    id: 'otzar-hahayal',
    name: 'Otzar HaHayal',
    category: 'bank',
    type: 'manual',
    format: 'CSV',
    url: 'https://www.otsarhahayal.co.il',
    notes: null,
    frequency: 'monthly',
  },
  {
    id: 'visa-cal',
    name: 'Visa Cal',
    category: 'credit',
    type: 'manual',
    format: 'CSV',
    url: 'https://www.cal-online.co.il',
    notes: null,
    frequency: 'monthly',
  },
  {
    id: 'harel-kupat-gemel',
    name: 'Harel – Kupat Gemel',
    category: 'pension',
    type: 'manual',
    format: 'PDF',
    url: 'https://www.harel-group.co.il',
    notes: null,
    frequency: 'monthly',
  },
  {
    id: 'harel-keren-hishtalmut',
    name: 'Harel – Keren Hishtalmut',
    category: 'pension',
    type: 'manual',
    format: 'PDF',
    url: 'https://www.harel-group.co.il',
    notes: null,
    frequency: 'monthly',
  },
  {
    id: 'excellence-investments',
    name: 'Excellence Investments',
    category: 'invest',
    type: 'manual',
    format: 'PDF',
    url: 'https://www.excellence.co.il',
    notes: 'Now under Phoenix Holdings.',
    frequency: 'monthly',
  },
];

for (const s of sources) {
  run(
    `INSERT OR IGNORE INTO sources (id, name, category, type, format, url, notes, frequency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.id, s.name, s.category, s.type, s.format, s.url, s.notes, s.frequency]
  );
}

// Remove validation sources if they exist from a previous seed
for (const id of ['har-habituach', 'pension-clearinghouse', 'har-hakesef']) {
  run(`DELETE FROM sources WHERE id = ?`, [id]);
}

// Update etrade to manual if it was previously seeded as api
run(`UPDATE sources SET type = 'manual', format = 'CSV' WHERE id = 'etrade' AND type = 'api'`);

console.log(`[${new Date().toISOString()}] Seeded ${sources.length} sources`);
