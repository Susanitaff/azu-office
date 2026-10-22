import { requireAuth } from '../lib/auth.js';
import { supabaseRequest } from '../lib/supabase-rest.js';
import { getDefaultWorkspace } from '../lib/workspace.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const workspace = await getDefaultWorkspace();
    const logs = await supabaseRequest(
      `action_logs?workspace_id=eq.${workspace.id}&select=id,action_type,requested_text,provider,status,details,created_at&order=created_at.desc&limit=60`
    );
    return res.status(200).json({ ok: true, logs: logs || [] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
