import { requireAuth } from '../../lib/auth.js';
import { searchDrive } from '../../lib/google-drive.js';
import { logAction } from '../../lib/action-log.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Falta q' });

  try {
    const files = await searchDrive(q, 10);
    await logAction('drive_search', q, 'google_drive', 'success', {
      result_count: files.length,
    });
    return res.status(200).json({ ok: true, files });
  } catch (error) {
    await logAction('drive_search', q, 'google_drive', 'error', {
      error: error.message,
    }).catch(() => {});
    return res.status(500).json({ ok: false, error: error.message });
  }
}
