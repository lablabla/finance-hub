import { Router } from 'express';
import { getRequestToken, buildAuthUrl, getAccessToken } from '../collectors/etrade.js';
import { run, get } from '../db/db.js';

const router = Router();

// Temporary in-memory store for the request token during the OAuth dance
let _pendingRequestToken = null;

router.get('/auth', async (req, res) => {
  try {
    _pendingRequestToken = await getRequestToken();
    res.redirect(buildAuthUrl(_pendingRequestToken));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { oauth_verifier } = req.query;
    if (!oauth_verifier || !_pendingRequestToken) {
      return res.status(400).json({ error: 'Missing verifier or no pending OAuth flow' });
    }
    const accessToken = await getAccessToken(_pendingRequestToken, oauth_verifier);
    _pendingRequestToken = null;

    // Persist in a simple config table (upsert)
    run(
      `CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)`,
      []
    );
    run(
      `INSERT INTO config (key, value) VALUES ('etrade_token_key', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [accessToken.key]
    );
    run(
      `INSERT INTO config (key, value) VALUES ('etrade_token_secret', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [accessToken.secret]
    );

    res.json({ ok: true, message: 'E*TRADE connected. Token stored in DB.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export function getStoredAccessToken() {
  try {
    run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)`, []);
    const key = get(`SELECT value FROM config WHERE key = 'etrade_token_key'`, []);
    const secret = get(`SELECT value FROM config WHERE key = 'etrade_token_secret'`, []);
    if (!key || !secret) return null;
    return { key: key.value, secret: secret.value };
  } catch {
    return null;
  }
}

export default router;
