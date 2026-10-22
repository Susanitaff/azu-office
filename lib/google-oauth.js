import https from 'node:https';
import { encryptJson, decryptJson } from './crypto.js';
import { getIntegration, saveIntegration } from './integrations.js';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function postFormJson(url, form, attempts = 3) {
  const target = new URL(url);
  const body = new URLSearchParams(form).toString();

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = https.request({
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || 443,
          path: target.pathname + target.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': 'azu-office/0.4',
          },
          timeout: 12000,
        }, (res) => {
          let raw = '';
          res.setEncoding('utf8');
          res.on('data', chunk => raw += chunk);
          res.on('end', () => {
            let data = {};
            try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode || 0,
              data,
            });
          });
        });

        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 350 * attempt));
      }
    }
  }

  throw new Error(`No pude comunicarme con Google (${lastError?.message || 'red'})`);
}

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
  let tokenResult;
  try {
    tokenResult = await postFormJson(TOKEN_URL, {
      code,
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    });
  } catch (error) {
    throw new Error(`Falló el intercambio con Google: ${error.message}`);
  }

  const { ok, data } = tokenResult;
  if (!ok) {
    throw new Error(data.error_description || data.error || 'Google rechazó el código OAuth');
  }

  let previous = null;

  // En una reconexión con prompt=consent Google normalmente entrega refresh_token.
  // Solo consultamos la integración previa si realmente necesitamos conservar el anterior.
  if (!data.refresh_token) {
    try {
      const integration = await getIntegration('google');
      if (integration?.config?.tokens_encrypted) {
        try {
          previous = decryptJson(integration.config.tokens_encrypted);
        } catch {}
      }
    } catch (error) {
      throw new Error(`Google autorizó, pero no pude recuperar el refresh token anterior: ${error.message}`);
    }
  }

  const merged = {
    ...previous,
    ...data,
    refresh_token: data.refresh_token || previous?.refresh_token || null,
    obtained_at: Date.now(),
  };

  let saved = false;
  let lastSaveError;
  for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
    try {
      await saveIntegration('google', 'connected', {
        tokens_encrypted: encryptJson(merged),
        scopes: merged.scope || null,
      });
      saved = true;
    } catch (error) {
      lastSaveError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  if (!saved) {
    throw new Error(`Google autorizó, pero no pude guardar la conexión: ${lastSaveError?.message || 'error de almacenamiento'}`);
  }

  return merged;
}

async function refreshAccessToken(tokens) {
  if (!tokens.refresh_token) throw new Error('Google no entregó refresh_token');

  let refreshResult;
  try {
    refreshResult = await postFormJson(TOKEN_URL, {
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    });
  } catch (error) {
    throw new Error(`Falló la renovación con Google: ${error.message}`);
  }

  const { ok, data } = refreshResult;
  if (!ok) {
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
  if (!(integration && integration.status === 'connected' && integration.config?.tokens_encrypted)) {
    return false;
  }

  try {
    await getGoogleAccessToken();
    return true;
  } catch {
    return false;
  }
}
