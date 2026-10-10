import { exchangeGoogleCode } from '../../lib/google-oauth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (req.query.error) {
    return res.status(400).send(`Google rechazó la conexión: ${req.query.error}`);
  }

  const code = req.query.code;
  if (!code) return res.status(400).send('Falta code');

  try {
    await exchangeGoogleCode(code);
    return res.redirect(302, '/?google=connected');
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).send(`No pude conectar Google: ${error.message}`);
  }
}
