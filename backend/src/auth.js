import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { pool } from './db.js';

const DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'chitkara.edu.in').toLowerCase();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const isAllowedEmail = (email) => email.toLowerCase().endsWith('@' + DOMAIN);

// Verifies the Google ID token on the server. The domain check here is the real gate.
export async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) throw new HttpError(500, 'GOOGLE_CLIENT_ID is not set on the server.');
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'Google sign-in could not be verified. Try again.');
  }
  if (!payload?.email || !payload.email_verified) throw new HttpError(401, 'Your Google email is not verified.');
  return { email: payload.email.toLowerCase(), name: payload.name || payload.email.split('@')[0] };
}

// Finds out who this email is: warden, gate staff, or (by default) a student.
// Students are created on first sign-in.
export async function resolveUser({ email, name }) {
  if (!isAllowedEmail(email)) throw new HttpError(403, `Use your @${DOMAIN} email to sign in.`);

  const [[warden]] = await pool.query('SELECT warden_id FROM warden WHERE email = ?', [email]);
  if (warden) return { role: 'warden', id: warden.warden_id };

  const [[staff]] = await pool.query('SELECT staff_id FROM gate_staff WHERE email = ?', [email]);
  if (staff) return { role: 'gate', id: staff.staff_id };

  await pool.query('INSERT IGNORE INTO student (email, name) VALUES (?, ?)', [email, name]);
  const [[student]] = await pool.query('SELECT student_id FROM student WHERE email = ?', [email]);
  return { role: 'student', id: student.student_id };
}

export const signToken = (user) =>
  jwt.sign(user, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

export const requireAuth = (...roles) => (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Please sign in.'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch {
    return next(new HttpError(401, 'Your session expired. Sign in again.'));
  }
  if (roles.length && !roles.includes(req.user.role)) return next(new HttpError(403, 'You cannot access this page.'));
  next();
};

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
