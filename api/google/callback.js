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
    const reason = encodeURIComponent(String(req.query.error));
    return res.redirect(302, `/?google=error&reason=${reason}`);
  }

  const code = req.query.code;
  const state = req.query.state;
  const expectedState = readCookie(req, 'azu_google_oauth_state');

  if (!code) return res.redirect(302, '/?google=error&reason=falta_codigo');
  if (!state || !expectedState || state !== expectedState) {
    return res.redirect(302, '/?google=error&reason=oauth_state');
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
    res.setHeader(
      'Set-Cookie',
      'azu_google_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    );
    const reason = encodeURIComponent(error.message || 'No pude conectar Google');
    return res.redirect(302, `/?google=error&reason=${reason}`);
  }
}
