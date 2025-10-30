import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Step 1: Company */
router.get('/company', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/html/onboarding-company.html'));
});

router.post('/company', async (req, res) => {
  // ✅ Read the user id from the verified JWT payload put on req.user by requireAuth
  const userId = req.user?.uid ?? req.user?.id ?? null;
  if (!userId) return res.status(401).redirect('/login');

  const companyName = (req.body.companyName || '').trim();
  if (!companyName) return res.status(400).send('Company name is required.');

  try {
    // Write an onboarding audit row (expects onboarding_events(user_id NOT NULL))
    await pool.query(
      'INSERT INTO onboarding_events (user_id, step, payload) VALUES ($1, $2, $3)',
      [userId, 'company', JSON.stringify({ companyName })]
    );

    // Continue to Step 2
    return res.redirect('/onboarding/cost-centers');
  } catch (e) {
    console.error('Company save error:', e);
    return res.status(500).send('Failed to save company');
  }
});

/** Step 2: Cost centers */
router.get('/cost-centers', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/html/onboarding-cost-centers.html'));
});

router.post('/cost-centers', async (req, res) => {
  // ✅ read the id from the verified JWT (set by requireAuth)
  const userId = req.user?.uid ?? req.user?.id ?? null;
  if (!userId) return res.status(401).redirect('/login');

  try {
    // Accept either JSON { centers:[{code,name,desc}]} or form inputs code[]/name[]/desc[]
    let { centers } = req.body;
    const toArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

    if (!centers) {
      const codes = toArray(req.body['code[]'] ?? req.body.code).map((s) => String(s ?? '').trim());
      const names = toArray(req.body['name[]'] ?? req.body.name).map((s) => String(s ?? '').trim());
      const descs = toArray(req.body['desc[]'] ?? req.body.desc).map((s) => String(s ?? '').trim());
      centers = codes
        .map((c, i) => ({ code: c, name: names[i] || '', desc: descs[i] || '' }))
        .filter((r, i) => (i === 0 ? true : r.code !== '' || r.name !== '')); // keep first row, others only if filled
    }

    if (!Array.isArray(centers) || centers.length === 0) {
      return res.status(400).send('No cost centers provided.');
    }

    // Write onboarding audit (user_id is NOT NULL here)
    await pool.query(
      'INSERT INTO onboarding_events (user_id, step, payload) VALUES ($1, $2, $3)',
      [userId, 'centers', JSON.stringify({ centers })]
    );

    // Go to Step 3
    return res.redirect('/onboarding/done');
  } catch (e) {
    console.error('Cost-centers save error:', e);
    return res.status(500).send('Failed to save cost centers');
  }
});

/** Step 3: Done → then Home */
router.get('/done', async (req, res) => {
  const userId = req.user?.uid ?? req.user?.id ?? null;
  if (!userId) return res.redirect('/login');

  try {
    // Mark onboarded
    await pool.query('UPDATE users SET onboarding_completed = TRUE WHERE id = $1', [userId]);

    // Re-issue JWT with onboarded=true
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign({ uid: userId, onboarded: true }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('kc_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000 });

    // Show the "done" page (it will auto-redirect)
    return res.sendFile(path.join(__dirname, '../../public/html/onboarding-done.html'));
  } catch (e) {
    console.error('Error finishing onboarding:', e);
    return res.status(500).send('Failed to complete onboarding');
  }
});

export default router;
