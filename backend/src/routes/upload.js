import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { run } from '../db/db.js';
import { parseCSV } from '../parsers/csv.js';
import { extractText } from '../parsers/pdf.js';
import { extractFromPDF } from '../parsers/ai-extractor.js';
import { normalizeAndSave } from '../normalizer.js';

const router = Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = `/data/uploads/${req.body.source_id || 'unknown'}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
  const { source_id } = req.body;
  if (!source_id || !req.file) {
    return res.status(400).json({ error: 'source_id and file are required' });
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  let result;
  try {
    if (ext === '.csv') {
      const parsed = await parseCSV(req.file.path, source_id);
      result = await normalizeAndSave(parsed, source_id);
    } else if (ext === '.pdf') {
      const buf = fs.readFileSync(req.file.path);
      const { text } = await extractText(buf);
      const parsed = await extractFromPDF({ text, source_id });
      result = await normalizeAndSave(parsed, source_id);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use CSV or PDF.' });
    }

    run(
      `INSERT INTO uploads (source_id, filename, parsed_ok, records) VALUES (?, ?, 1, ?)`,
      [source_id, req.file.originalname, result.transactionsInserted]
    );
    res.json({ ok: true, ...result });
  } catch (e) {
    run(
      `INSERT INTO uploads (source_id, filename, parsed_ok, error) VALUES (?, ?, 0, ?)`,
      [source_id, req.file.originalname, e.message]
    );
    res.status(500).json({ error: e.message });
  }
});

export default router;
