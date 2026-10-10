import { createMemory, listMemories } from '../lib/memory.js';
import { createTask, listTasks } from '../lib/tasks.js';
import { searchDrive } from '../lib/google-drive.js';
import { logAction } from '../lib/action-log.js';

function normalize(text) {
  return String(text || '').trim();
}

function stripPrefix(text, prefixes) {
  const lower = text.toLowerCase();
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      return text.slice(prefix.length).trim().replace(/^[:,-]\s*/, '');
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const message = normalize(req.body?.message);
  if (!message) {
    return res.status(400).json({ error: 'Falta el mensaje' });
  }

  const lower = message.toLowerCase();

  try {
    if (lower === 'estado' || lower === '/estado') {
      return res.status(200).json({
        reply: 'Azu Office está activa y conectada a Supabase. Ya puedo guardar recuerdos y tareas.',
        intent: 'status',
      });
    }

    const memoryText = stripPrefix(message, ['recordá que', 'recorda que', 'acordate que', 'guardá que', 'guarda que']);
    if (memoryText) {
      const memory = await createMemory(memoryText, 'general', 'chat');
      return res.status(200).json({
        reply: `Listo. Lo guardé en mi memoria: “${memory.content}”.`,
        intent: 'create_memory',
      });
    }

    if (
      lower === 'qué recordás' ||
      lower === 'que recordas' ||
      lower === 'qué te acordás' ||
      lower === 'que te acordas' ||
      lower === 'mis recuerdos'
    ) {
      const memories = await listMemories(10);

      if (!memories.length) {
        return res.status(200).json({
          reply: 'Todavía no tengo recuerdos guardados.',
          intent: 'list_memories',
        });
      }

      const lines = memories.map((m, index) => `${index + 1}. ${m.content}`);
      return res.status(200).json({
        reply: `Esto es lo último que tengo guardado:\n\n${lines.join('\n')}`,
        intent: 'list_memories',
      });
    }

    const taskText = stripPrefix(message, ['creá una tarea', 'crea una tarea', 'anotá como tarea', 'anota como tarea', 'tarea:']);
    if (taskText) {
      const task = await createTask(taskText, null, null, 'chat');
      return res.status(200).json({
        reply: `Listo. Creé la tarea: “${task.title}”.`,
        intent: 'create_task',
      });
    }

    if (
      lower === 'mis tareas' ||
      lower === 'qué tengo pendiente' ||
      lower === 'que tengo pendiente' ||
      lower === 'pendientes'
    ) {
      const tasks = await listTasks(20);

      if (!tasks.length) {
        return res.status(200).json({
          reply: 'No tenés tareas pendientes.',
          intent: 'list_tasks',
        });
      }

      const lines = tasks.map((t, index) => `${index + 1}. ${t.title}`);
      return res.status(200).json({
        reply: `Tenés estas tareas pendientes:\n\n${lines.join('\n')}`,
        intent: 'list_tasks',
      });
    }

    const driveQuery = stripPrefix(message, ['buscame en drive', 'buscá en drive', 'busca en drive', 'buscame', 'buscá', 'busca']);
    if (driveQuery) {
      try {
        const files = await searchDrive(driveQuery, 8);
        await logAction('drive_search', message, 'google_drive', 'success', { result_count: files.length });

        if (!files.length) {
          return res.status(200).json({
            reply: `No encontré nada en Drive con “${driveQuery}”.`,
            intent: 'drive_search',
          });
        }

        const lines = files.map((f, i) => {
          const link = f.webViewLink ? ` — ${f.webViewLink}` : '';
          return `${i + 1}. ${f.name}${link}`;
        });

        return res.status(200).json({
          reply: `Encontré esto en Drive:\n\n${lines.join('\n')}`,
          intent: 'drive_search',
        });
      } catch (error) {
        return res.status(200).json({
          reply: error.message.includes('no está conectado')
            ? 'Google Drive todavía no está conectado. Tocá “Conectar Google Drive” en la pantalla principal.'
            : `No pude buscar en Drive: ${error.message}`,
          intent: 'drive_search_error',
        });
      }
    }

    if (lower.includes('qué podés hacer') || lower.includes('que podes hacer') || lower === 'ayuda') {
      return res.status(200).json({
        reply: 'Ya puedo guardar recuerdos, tareas y buscar archivos en Google Drive cuando esté conectado. Probá: “recordá que los certificados van en Drive”, “qué recordás”, “creá una tarea revisar débitos” o “mis tareas”. Después vamos a sumar Drive, Calendar y comprensión libre con IA.',
        intent: 'help',
      });
    }

    return res.status(200).json({
      reply: 'Todavía no entendí esa instrucción como una acción. Probá escribiendo “ayuda” para ver lo que ya puedo hacer.',
      intent: 'unknown',
      original_message: message,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'No pude completar la acción.',
      detail: error.message,
    });
  }
}
