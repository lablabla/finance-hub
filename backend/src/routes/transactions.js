import { Router } from 'express';
import { query } from '../db/db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const { account, from, to, category } = req.query;
    let sql = `SELECT t.*, a.name AS account_name, a.source_id FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id WHERE 1=1`;
    const params = [];
    if (account) { sql += ' AND t.account_id = ?'; params.push(account); }
    if (from)    { sql += ' AND t.date >= ?'; params.push(from); }
    if (to)      { sql += ' AND t.date <= ?'; params.push(to); }
    if (category){ sql += ' AND t.category = ?'; params.push(category); }
    sql += ' ORDER BY t.date DESC LIMIT 500';
    res.json(query(sql, params));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
