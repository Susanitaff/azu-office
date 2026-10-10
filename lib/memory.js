import { supabaseRequest } from './supabase-rest.js';
import { getDefaultWorkspace } from './workspace.js';

export async function createMemory(content, category = 'general', source = 'chat') {
  const workspace = await getDefaultWorkspace();

  const rows = await supabaseRequest('memories', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      workspace_id: workspace.id,
      content,
      category,
      source,
    }),
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

export async function listMemories(limit = 10) {
  const workspace = await getDefaultWorkspace();

  return await supabaseRequest(
    `memories?workspace_id=eq.${workspace.id}&select=id,content,category,source,created_at&order=created_at.desc&limit=${limit}`
  );
}
