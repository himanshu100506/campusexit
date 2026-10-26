import { Router } from 'express';
import { HttpError, resolveUser, signToken, verifyGoogleCredential, wrap } from '../auth.js';

const router = Router();

router.post('/google', wrap(async (req, res) => {
  const identity = await verifyGoogleCredential(req.body.credential);
  const user = await resolveUser(identity);
  res.json({ token: signToken(user) });
}));

// Local testing only: sign in with just an email. Disabled unless DEV_AUTH=true.
router.post('/dev', wrap(async (req, res) => {
  if (process.env.DEV_AUTH !== 'true') throw new HttpError(404, 'Not found.');
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) throw new HttpError(400, 'Enter an email.');
  const name = String(req.body.name || '').trim() || email.split('@')[0];
  const user = await resolveUser({ email, name });
  res.json({ token: signToken(user) });
}));

export default router;
