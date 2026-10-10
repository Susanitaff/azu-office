import { requireAuth } from '../../lib/auth.js';
import crypto from 'node:crypto';
import { buildGoogleAuthUrl } from '../../lib/google-oauth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const state = crypto.randomBytes(24).toString('hex');
    res.setHeader(
      'Set-Cookie',
      `azu_google_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    );
    return res.redirect(302, buildGoogleAuthUrl(state));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
