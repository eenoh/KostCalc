// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

/**
 * Constants
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const COOKIE_NAME = 'kc_token';

/**
 * Require a valid JWT.
 * Reads from cookie "kc_token" or Authorization: Bearer <token>.
 * Sets req.user = decoded payload.
 */
export function requireAuth(req, res, next) {
  try {
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = req.cookies?.[COOKIE_NAME] || bearer;
    if (!token) return res.status(401).redirect('/login');

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { uid, orgId, onboarded, iat, exp }
    next();
  } catch (err) {
    console.error('Auth failed:', err.message);
    return res.status(401).redirect('/login');
  }
}

/**
 * Require onboarding to be complete.
 * If not, redirect to first onboarding step.
 */
export function requireOnboardingComplete(req, res, next) {
  if (!req.user?.onboarded) return res.redirect('/onboarding/company');
  next();
}
