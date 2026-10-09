function normalize(text) {
  return String(text || '').trim();
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

  if (lower === 'estado' || lower === '/estado') {
    return res.status(200).json({
      reply: 'Azu Office está activa. La base ya funciona; el próximo paso es conectar memoria, tareas y Google Drive.',
      intent: 'status',
    });
  }

  if (lower.includes('qué podés hacer') || lower.includes('que podes hacer') || lower === 'ayuda') {
    return res.status(200).json({
      reply: 'Estoy preparando mis herramientas para memoria, tareas, Drive, Calendar y Gmail. Por ahora podés escribirme “estado” para comprobar que el núcleo funciona.',
      intent: 'help',
    });
  }

  return res.status(200).json({
    reply: 'Te entendí. Todavía no ejecuto esa acción porque estamos conectando mis herramientas. No voy a decir “listo” hasta que la acción haya ocurrido de verdad.',
    intent: 'pending_tool',
    original_message: message,
  });
}
