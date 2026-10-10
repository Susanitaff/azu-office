import { buildGoogleAuthUrl } from '../../lib/google-oauth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    return res.redirect(302, buildGoogleAuthUrl());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
