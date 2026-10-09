export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  return res.status(200).json({
    ok: true,
    service: 'azu-office',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}
