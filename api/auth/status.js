import { isAuthenticated } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  return res.status(200).json({ ok: true, authenticated: isAuthenticated(req) });
}
