import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { run, query, get } from '../db/db.js';
import { extractText } from '../parsers/pdf.js';
import { extractInstitutions, compareWithSources } from '../parsers/validation.js';

const router = Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync('/data/uploads/validation', { recursive: true });
    cb(null, '/data/uploads/validation');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), async (req, res) => {
  const { report_type } = req.body;
  const validTypes = ['har_habituach', 'pension_clearinghouse', 'har_hakesef'];
  if (!validTypes.includes(report_type) || !req.file) {
    return res.status(400).json({ error: 'report_type and file are required' });
  }
  try {
    const buf = fs.readFileSync(req.file.path);
    const { text } = await extractText(buf);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const sources = query('SELECT * FROM sources WHERE active = 1');
    const institutions = await extractInstitutions(text, report_type, sources);

    run(
      `INSERT INTO validation_reports (report_type, year, month, raw_text, institutions)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(report_type, year, month) DO UPDATE SET raw_text = excluded.raw_text, institutions = excluded.institutions`,
      [report_type, year, month, text, JSON.stringify(institutions)]
    );
    const report = get(
      `SELECT * FROM validation_reports WHERE report_type = ? AND year = ? AND month = ?`,
      [report_type, year, month]
    );

    const { alertsCreated } = await compareWithSources(institutions, report.id);
    res.json({ ok: true, institutions, alertsCreated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/alerts', (req, res) => {
  try {
    const alerts = query(
      `SELECT a.*, r.report_type, r.year, r.month
       FROM source_alerts a
       JOIN validation_reports r ON r.id = a.report_id
       WHERE a.dismissed = 0 AND a.resolved = 0
       ORDER BY a.created_at DESC`
    );
    res.json(alerts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/alerts/:id/dismiss', (req, res) => {
  try {
    const result = run(
      `UPDATE source_alerts SET dismissed = 1, dismissed_at = datetime('now') WHERE id = ?`,
      [req.params.id]
    );
    if (result.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/alerts/:id/resolve', (req, res) => {
  try {
    const { source_id } = req.body;
    if (!source_id) return res.status(400).json({ error: 'source_id is required' });
    const result = run(
      `UPDATE source_alerts SET resolved = 1, resolved_source_id = ? WHERE id = ?`,
      [source_id, req.params.id]
    );
    if (result.changes === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
