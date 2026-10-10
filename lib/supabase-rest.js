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

export async function supabaseRequest(path, options = {}) {
  const { url, headers } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
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
