import { encryptJson, decryptJson } from './crypto.js';
import { getIntegration, saveIntegration } from './integrations.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

export function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || 'https://azu-office.vercel.app/api/google/callback';
}

export function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: required('GOOGLE_CLIENT_ID'),
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: [
      'https://www.googleapis.com/auth/drive',
    ].join(' '),
    state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Google rechazó el código OAuth');
  }

  const integration = await getIntegration('google');
  let previous = null;
  if (integration?.config?.tokens_encrypted) {
    try {
      previous = decryptJson(integration.config.tokens_encrypted);
    } catch {}
  }

  const merged = {
    ...previous,
    ...data,
    refresh_token: data.refresh_token || previous?.refresh_token || null,
    obtained_at: Date.now(),
  };

  await saveIntegration('google', 'connected', {
    tokens_encrypted: encryptJson(merged),
    scopes: merged.scope || null,
  });

  return merged;
}

async function refreshAccessToken(tokens) {
  if (!tokens.refresh_token) throw new Error('Google no entregó refresh_token');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'No pude renovar Google');
  }

  const merged = {
    ...tokens,
    ...data,
    refresh_token: tokens.refresh_token,
    obtained_at: Date.now(),
  };

  await saveIntegration('google', 'connected', {
    tokens_encrypted: encryptJson(merged),
    scopes: merged.scope || null,
  });

  return merged;
}

export async function getGoogleAccessToken() {
  const integration = await getIntegration('google');
  if (!integration?.config?.tokens_encrypted) {
    throw new Error('Google Drive no está conectado');
  }

  let tokens = decryptJson(integration.config.tokens_encrypted);
  const expiresIn = Number(tokens.expires_in || 3600) * 1000;
  const expiresAt = Number(tokens.obtained_at || 0) + expiresIn;
  const shouldRefresh = !tokens.access_token || Date.now() > expiresAt - 60_000;

  if (shouldRefresh) tokens = await refreshAccessToken(tokens);
  return tokens.access_token;
}

export async function isGoogleConnected() {
  const integration = await getIntegration('google');
  return Boolean(integration && integration.status === 'connected' && integration.config?.tokens_encrypted);
}
