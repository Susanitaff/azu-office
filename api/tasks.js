import { requireAuth } from '../lib/auth.js';
import { createTask, listTasks } from '../lib/tasks.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const tasks = await listTasks();
      return res.status(200).json({ ok: true, tasks });
    }

    if (req.method === 'POST') {
      const title = String(req.body?.title || '').trim();
      const notes = req.body?.notes ? String(req.body.notes).trim() : null;
      const dueAt = req.body?.due_at || null;

      if (!title) {
        return res.status(400).json({ error: 'Falta title' });
      }

      const task = await createTask(title, notes, dueAt, 'api');
      return res.status(201).json({ ok: true, task });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
