import { Router } from 'express';
import { query } from '../db/db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const accounts = query(
      `SELECT a.*, s.name AS source_name, s.category
       FROM accounts a
       LEFT JOIN sources s ON s.id = a.source_id
       ORDER BY s.category, a.name`
    );
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
