import { isGoogleConnected } from '../../lib/google-oauth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    return res.status(200).json({ ok: true, connected: await isGoogleConnected() });
  } catch (error) {
    return res.status(500).json({ ok: false, connected: false, error: error.message });
  }
}
