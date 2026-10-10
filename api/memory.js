import { requireAuth } from '../lib/auth.js';
import { createMemory, listMemories } from '../lib/memory.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const memories = await listMemories();
      return res.status(200).json({ ok: true, memories });
    }

    if (req.method === 'POST') {
      const content = String(req.body?.content || '').trim();
      const category = String(req.body?.category || 'general').trim();

      if (!content) {
        return res.status(400).json({ error: 'Falta content' });
      }

      const memory = await createMemory(content, category, 'api');
      return res.status(201).json({ ok: true, memory });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Memory API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
