// Simple in-memory KV cache for serverless execution
// In production with Upstash or Supabase, KV env variables can connect directly.
const memoryStore = new Map<string, any>();

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do bolão não informado' });
    }
    const data = memoryStore.get(id);
    if (!data) {
      return res.status(404).json({ error: 'Bolão não encontrado' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const payload = req.body;
    if (!payload || !payload.bolao || !payload.bolao.id) {
      return res.status(400).json({ error: 'Payload inválido' });
    }
    const bolaoId = payload.bolao.id;
    memoryStore.set(bolaoId, payload);
    if (payload.bolao.hash_slug) {
      memoryStore.set(payload.bolao.hash_slug, payload);
    }
    return res.status(200).json({ success: true, id: bolaoId });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
