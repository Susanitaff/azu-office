import { supabaseRequest } from './supabase-rest.js';

export async function getDefaultWorkspace() {
  const workspaces = await supabaseRequest(
    'workspaces?select=id,name,kind,created_at&order=created_at.asc&limit=1'
  );

  if (!Array.isArray(workspaces) || !workspaces[0]) {
    throw new Error('No hay un workspace configurado');
  }

  return workspaces[0];
}
