import { exchangeGoogleCode } from '../../lib/google-oauth.js';

function readCookie(req, name) {
  const cookie = req.headers.cookie || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (req.query.error) {
    return res.status(400).send(`Google rechazó la conexión: ${req.query.error}`);
  }

  const code = req.query.code;
  const state = req.query.state;
  const expectedState = readCookie(req, 'azu_google_oauth_state');

  if (!code) return res.status(400).send('Falta code');
  if (!state || !expectedState || state !== expectedState) {
    return res.status(400).send('Estado OAuth inválido. Volvé a iniciar la conexión.');
  }

  try {
    await exchangeGoogleCode(code);
    res.setHeader(
      'Set-Cookie',
      'azu_google_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    );
    return res.redirect(302, '/?google=connected');
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).send(`No pude conectar Google: ${error.message}`);
  }
}
