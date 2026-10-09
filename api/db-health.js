import { supabaseRequest } from '../lib/supabase-rest.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const workspaces = await supabaseRequest(
      'workspaces?select=id,name,kind,created_at&order=created_at.asc&limit=1'
    );

    return res.status(200).json({
      ok: true,
      database: 'connected',
      workspace: Array.isArray(workspaces) && workspaces[0] ? workspaces[0] : null,
    });
  } catch (error) {
    console.error('DB health error:', error);

    return res.status(500).json({
      ok: false,
      database: 'disconnected',
      error: error.message,
    });
  }
}
