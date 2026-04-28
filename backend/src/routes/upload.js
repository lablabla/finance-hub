import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { run } from '../db/db.js';
import { parseCSV, applyMapper } from '../parsers/csv.js';
import { parseXLSXRows, xlsxToCSVText } from '../parsers/xlsx.js';
import { extractText } from '../parsers/pdf.js';
import { extractFromPDF } from '../parsers/ai-extractor.js';
import { normalizeAndSave } from '../normalizer.js';

const router = Router();

const DATA_PATH = process.env.DATA_PATH || './data';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(DATA_PATH, 'uploads', req.body.source_id || 'unknown');
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
    if (ext === '.csv' || ext === '.xlsx') {
      // Try per-source mapper first; fall back to AI extraction if no mapper exists
      try {
        const parsed = ext === '.xlsx'
          ? applyMapper(parseXLSXRows(req.file.path), source_id)
          : await parseCSV(req.file.path, source_id);
        result = await normalizeAndSave(parsed, source_id);
      } catch (mapperErr) {
        if (mapperErr.message.startsWith('No CSV mapper')) {
          const text = ext === '.xlsx'
            ? xlsxToCSVText(req.file.path)
            : fs.readFileSync(req.file.path, 'utf8');
          const parsed = await extractFromPDF({ text, source_id });
          result = await normalizeAndSave(parsed, source_id);
        } else {
          throw mapperErr;
        }
      }
    } else if (ext === '.pdf') {
      const buf = fs.readFileSync(req.file.path);
      const { text, pages } = await extractText(buf);
      console.log(`[${new Date().toISOString()}] PDF extracted: ${pages} pages, ${text.length} chars for ${source_id}`);
      if (text.trim().length < 50) {
        throw new Error(`PDF appears to be image-based or empty (extracted ${text.trim().length} chars). Try exporting as CSV instead.`);
      }
      const parsed = await extractFromPDF({ text, source_id });
      result = await normalizeAndSave(parsed, source_id);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use CSV, XLSX, or PDF.' });
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
