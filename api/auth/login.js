import { createSessionCookie, verifyAccessPassword } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    if (!verifyAccessPassword(req.body?.password)) {
      return res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
    }

    res.setHeader('Set-Cookie', createSessionCookie());
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
