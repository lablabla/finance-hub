import { Router } from 'express';
import { query } from '../db/db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { from, to } = req.query;
    let sql = `SELECT * FROM snapshots WHERE 1=1`;
    const params = [];
    if (from) { sql += ' AND date >= ?'; params.push(from); }
    if (to)   { sql += ' AND date <= ?'; params.push(to); }
    sql += ' ORDER BY date ASC';
    res.json(query(sql, params));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
