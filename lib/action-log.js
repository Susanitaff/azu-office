import { supabaseRequest } from './supabase-rest.js';
import { getDefaultWorkspace } from './workspace.js';

export async function logAction(actionType, requestedText, provider, status, details = {}) {
  const workspace = await getDefaultWorkspace();

  const rows = await supabaseRequest('action_logs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      workspace_id: workspace.id,
      action_type: actionType,
      requested_text: requestedText || null,
      provider: provider || null,
      status,
      details,
    }),
  });

  return Array.isArray(rows) ? rows[0] : rows;
}
