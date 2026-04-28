import { Router } from 'express';
import { query, run, get } from '../db/db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const sources = query('SELECT * FROM sources ORDER BY category, name');
    res.json(sources);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { id, name, category, type, format, url, notes, frequency } = req.body;
    if (!id || !name || !category || !type) {
      return res.status(400).json({ error: 'id, name, category, type are required' });
    }
    run(
      `INSERT INTO sources (id, name, category, type, format, url, notes, frequency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, category, type, format || null, url || null, notes || null, frequency || 'monthly']
    );
    res.status(201).json(get('SELECT * FROM sources WHERE id = ?', [id]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = run('DELETE FROM sources WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
