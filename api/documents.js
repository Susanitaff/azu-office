import { requireAuth } from '../lib/auth.js';
import { supabaseRequest } from '../lib/supabase-rest.js';
import { getDefaultWorkspace } from '../lib/workspace.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const workspace = await getDefaultWorkspace();
    const documents = await supabaseRequest(
      `documents?workspace_id=eq.${workspace.id}&select=id,name,mime_type,category,person_or_subject,external_provider,external_url,created_at&order=created_at.desc&limit=100`
    );
    return res.status(200).json({ ok: true, documents: documents || [] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
