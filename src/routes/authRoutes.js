import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const COOKIE_NAME = 'kc_token';
// In production set secure:true (HTTPS) and a proper domain
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 };

/** POST /auth/register → create user, set JWT, go to onboarding step 1 */
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).send('Please fill in all required fields.');
  }
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount) return res.status(409).send('Email already registered.');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, onboarding_completed)
       VALUES ($1,$2,$3,$4, FALSE)
       RETURNING id, org_id, onboarding_completed`,
      [firstName, lastName, email, hash]
    );
    const user = rows[0];

    // Sign JWT with minimal claims you need during onboarding
    const token = jwt.sign(
      { uid: user.id, orgId: user.org_id ?? null, onboarded: user.onboarding_completed === true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    return res.redirect('/onboarding/company');
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).send('Registration failed.');
  }
});

/** POST /auth/login → verify, log, set JWT, route to onboarding or home */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Email and password are required.');

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(400).send('Invalid email or password.');

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).send('Invalid email or password.');

    // optional login audit
    await pool.query(
      'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES ($1,$2,$3)',
      [user.id, req.ip, req.get('user-agent') || null]
    );

    const token = jwt.sign(
      { uid: user.id, orgId: user.org_id ?? null, onboarded: user.onboarding_completed === true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    // If already onboarded, go home; else start onboarding
    return res.redirect(user.onboarding_completed ? '/home' : '/onboarding/company');
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).send('Login failed.');
  }
});

export default router;
