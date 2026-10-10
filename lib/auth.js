import crypto from 'node:crypto';

export const SESSION_COOKIE = 'azu_session';
const SESSION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  const secret = process.env.APP_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Falta APP_SESSION_SECRET o SUPABASE_SECRET_KEY');
  return secret;
}

function accessPassword() {
  const password = process.env.AZU_ACCESS_PASSWORD;
  if (!password) throw new Error('Falta AZU_ACCESS_PASSWORD');
  return password;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sign(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function readCookie(req, name) {
  const cookie = req.headers.cookie || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function verifyAccessPassword(candidate) {
  return safeEqual(candidate || '', accessPassword());
}

export function createSessionCookie() {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function isAuthenticated(req) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ ok: false, error: 'No autorizado' });
  return false;
}
