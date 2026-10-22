import https from 'node:https';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export function getSupabaseConfig() {
  const url = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const secretKey = requireEnv('SUPABASE_SECRET_KEY');

  return {
    url,
    headers: {
      apikey: secretKey,
      'Content-Type': 'application/json',
    },
  };
}

function httpsRequest(url, options = {}, attempts = 3) {
  const target = new URL(url);
  const method = options.method || 'GET';
  const body = typeof options.body === 'string'
    ? options.body
    : options.body
      ? JSON.stringify(options.body)
      : null;

  const run = (attempt) => new Promise((resolve, reject) => {
    const headers = {
      ...(options.headers || {}),
    };

    if (body && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method,
      headers,
      timeout: 12000,
      family: 4,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        resolve({
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          status: res.statusCode || 0,
          raw,
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', async (error) => {
      if (attempt < attempts) {
        await new Promise(r => setTimeout(r, 300 * attempt));
        try {
          resolve(await run(attempt + 1));
        } catch (nested) {
          reject(nested);
        }
      } else {
        reject(error);
      }
    });

    if (body) req.write(body);
    req.end();
  });

  return run(1);
}

export async function supabaseRequest(path, options = {}) {
  const { url, headers } = getSupabaseConfig();

  let response;
  try {
    response = await httpsRequest(
      `${url}/rest/v1/${path}`,
      {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      }
    );
  } catch (error) {
    throw new Error(`No pude comunicarme con Supabase: ${error.message}`);
  }

  let data = null;
  if (response.raw) {
    try {
      data = JSON.parse(response.raw);
    } catch {
      data = response.raw;
    }
  }

  if (!response.ok) {
    const error = new Error(`Supabase respondió ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}
