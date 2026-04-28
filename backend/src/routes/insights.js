import { Router } from 'express';
import { get } from '../db/db.js';
import { generateInsight } from '../insights.js';

const router = Router();

router.get('/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const row = get(
      `SELECT * FROM insights WHERE year = ? AND month = ?`,
      [parseInt(year), parseInt(month)]
    );
    res.json({ content: row?.content || null, generated_at: row?.generated_at || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const content = await generateInsight(parseInt(year), parseInt(month));
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
