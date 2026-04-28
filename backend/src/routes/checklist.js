// Month parameter is 0-indexed (Jan=0, Dec=11), matching JS Date.getMonth()
import { Router } from 'express';
import { query, run } from '../db/db.js';

const router = Router();

router.get('/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const rows = query(
      `SELECT s.id AS source_id, s.name, s.category, s.type, s.frequency,
              COALESCE(c.checked, 0) AS checked,
              c.checked_at,
              c.notes
       FROM sources s
       LEFT JOIN checklist c
         ON c.source_id = s.id AND c.year = ? AND c.month = ?
       WHERE s.active = 1
       ORDER BY s.category, s.name`,
      [parseInt(year), parseInt(month)]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const { source_id, checked, notes } = req.body;
    if (!source_id) return res.status(400).json({ error: 'source_id is required' });

    const checkedAt = checked ? new Date().toISOString() : null;
    run(
      `INSERT INTO checklist (year, month, source_id, checked, checked_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(year, month, source_id) DO UPDATE SET
         checked = excluded.checked,
         checked_at = excluded.checked_at,
         notes = COALESCE(excluded.notes, checklist.notes)`,
      [parseInt(year), parseInt(month), source_id, checked ? 1 : 0, checkedAt, notes ?? null]
    );
    const row = query(
      `SELECT * FROM checklist WHERE year = ? AND month = ? AND source_id = ?`,
      [parseInt(year), parseInt(month), source_id]
    )[0];
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
