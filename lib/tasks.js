import { supabaseRequest } from './supabase-rest.js';
import { getDefaultWorkspace } from './workspace.js';

export async function createTask(title, notes = null, dueAt = null, source = 'chat') {
  const workspace = await getDefaultWorkspace();

  const rows = await supabaseRequest('tasks', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      workspace_id: workspace.id,
      title,
      notes,
      due_at: dueAt,
      status: 'pending',
      source,
    }),
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

export async function listTasks(limit = 20) {
  const workspace = await getDefaultWorkspace();

  return await supabaseRequest(
    `tasks?workspace_id=eq.${workspace.id}&status=eq.pending&select=id,title,notes,due_at,status,created_at&order=created_at.desc&limit=${limit}`
  );
}
