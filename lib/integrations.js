import { supabaseRequest } from './supabase-rest.js';
import { getDefaultWorkspace } from './workspace.js';

export async function getIntegration(provider) {
  const workspace = await getDefaultWorkspace();
  const rows = await supabaseRequest(
    `integrations?workspace_id=eq.${workspace.id}&provider=eq.${encodeURIComponent(provider)}&select=*&limit=1`
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function saveIntegration(provider, status, config = {}) {
  const workspace = await getDefaultWorkspace();
  const rows = await supabaseRequest(
    'integrations?on_conflict=workspace_id,provider',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        workspace_id: workspace.id,
        provider,
        status,
        config,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  return Array.isArray(rows) ? rows[0] : rows;
}
