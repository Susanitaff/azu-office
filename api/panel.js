import { requireAuth } from '../lib/auth.js';
import { supabaseRequest } from '../lib/supabase-rest.js';
import { getDefaultWorkspace } from '../lib/workspace.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const workspace = await getDefaultWorkspace();
    const resource = String(req.query.resource || '').trim();

    if (resource === 'activity') {
      const logs = await supabaseRequest(
        `action_logs?workspace_id=eq.${workspace.id}&select=id,action_type,requested_text,provider,status,details,created_at&order=created_at.desc&limit=60`
      );
      return res.status(200).json({ ok: true, logs: logs || [] });
    }

    if (resource === 'documents') {
      const documents = await supabaseRequest(
        `documents?workspace_id=eq.${workspace.id}&select=id,name,mime_type,category,person_or_subject,external_provider,external_url,created_at&order=created_at.desc&limit=100`
      );
      return res.status(200).json({ ok: true, documents: documents || [] });
    }

    return res.status(400).json({ error: 'Recurso no válido' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
