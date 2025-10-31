import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { transporter } from '../utils/mailer.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const COOKIE_NAME = 'kc_token';

// In production: secure:true (HTTPS) and proper domain
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 };

// Short-lived cookie used only during password reset (after OTP verification)
const RESET_COOKIE = 'kc_reset';
const RESET_COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 10 * 60 * 1000 }; // 10 min

/** 
 * POST /auth/register → create user, set JWT, go to onboarding step 1 
 */
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

    // Sign JWT with minimal claims for onboarding
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

/** 
 * POST /auth/login → verify, log, set JWT, route to onboarding or home
 */
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
    return res.redirect(user.onboarding_completed ? '/home' : '/onboarding/company');
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).send('Login failed.');
  }
});

/** =========================
 *  PASSWORD RESET (OTP FLOW)
 *  =========================
 */

/**
 * POST /auth/forgot-password
 * - Always returns a generic message (no account enumeration).
 * - Stores a hashed 6-digit OTP in DB with 10-minute expiry (single-use).
 * - Sends OTP via email (MailDev in dev).
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const genericMsg = 'If that account exists, a one-time code has been sent.';

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(200).send(genericMsg);

    const userId = rows[0].id;

    // Generate 6-digit code
    const code = ('' + Math.floor(100000 + Math.random() * 900000)).slice(-6);
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query(
      `INSERT INTO password_reset_otps (user_id, code_hash, expires_at) VALUES ($1,$2,$3)`,
      [userId, codeHash, expires]
    );

    await transporter.sendMail({
      from: '"KostCalc" <no-reply@kostcalc.local>',
      to: email,
      subject: 'Your KostCalc one-time code',
      text: `Your code is: ${code} (valid for 10 minutes)`,
      html: `<p>Your one-time code is:</p><p style="font-size:20px;"><b>${code}</b></p><p>Valid for 10 minutes.</p>`
    });

    return res.status(200).send(genericMsg);
  } catch (e) {
    console.error('forgot-password error:', e);
    return res.status(200).send(genericMsg);
  }
});

/**
 * POST /auth/verify-otp
 * - Verifies the 6-digit code for the given email (single-use, unexpired).
 * - Sets a short-lived reset cookie (JWT) used only for /auth/reset-password.
 */
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).send('Invalid request');

  try {
    const u = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!u.rows.length) return res.status(400).send('Invalid code');

    const userId = u.rows[0].id;
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    // Find most recent unused & unexpired OTP
    const { rows } = await pool.query(
      `SELECT id, attempts FROM password_reset_otps
       WHERE user_id = $1 AND code_hash = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [userId, codeHash]
    );

    if (!rows.length) return res.status(400).send('Invalid or expired code');

    const otpId = rows[0].id;
    const attempts = rows[0].attempts;
    if (attempts >= 5) return res.status(429).send('Too many attempts');

    // Mark used & bump attempts (single-use)
    await pool.query('UPDATE password_reset_otps SET used = TRUE, attempts = $1 WHERE id = $2', [attempts + 1, otpId]);

    // Issue short-lived reset token cookie
    const resetToken = jwt.sign({ uid: userId, pr: true }, JWT_SECRET, { expiresIn: '10m' });
    res.cookie(RESET_COOKIE, resetToken, RESET_COOKIE_OPTS);

    return res.status(200).send('Verified');
  } catch (e) {
    console.error('verify-otp error:', e);
    return res.status(400).send('Invalid or expired code');
  }
});

/**
 * POST /auth/reset-password
 * - Requires the short-lived reset cookie set by /auth/verify-otp.
 * - Updates the user's password and clears the reset cookie.
 */
router.post('/reset-password', async (req, res) => {
  const token = req.cookies?.[RESET_COOKIE];
  const { password } = req.body;
  if (!token) return res.status(401).send('Unauthorized');
  if (!password || password.length < 8) return res.status(400).send('Password too short');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.uid || !decoded?.pr) return res.status(401).send('Unauthorized');

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, decoded.uid]);

    // Clear the reset cookie
    res.clearCookie(RESET_COOKIE, { httpOnly: true, sameSite: 'lax', secure: false });
    return res.status(200).send('Password updated. You can now log in.');
  } catch (e) {
    console.error('reset-password error:', e);
    return res.status(401).send('Unauthorized');
  }
});

export default router;
