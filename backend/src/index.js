import 'dotenv/config';
import express from 'express';
import getDb from './db/db.js';
import sourcesRouter from './routes/sources.js';
import checklistRouter from './routes/checklist.js';
import uploadRouter from './routes/upload.js';
import validateRouter from './routes/validate.js';
import insightsRouter from './routes/insights.js';
import etradeAuthRouter from './routes/etrade-auth.js';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  try {
    getDb();
    res.json({ ok: true, db: true });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: e.message });
  }
});

app.use('/api/sources', sourcesRouter);
app.use('/api/checklist', checklistRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/validate', validateRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/etrade', etradeAuthRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Finance Hub backend running on :${PORT}`);
});
