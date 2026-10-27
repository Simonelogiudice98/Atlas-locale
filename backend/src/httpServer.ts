import { createServer } from 'node:http';
import { once } from 'node:events';
import { z } from 'zod';
import { config } from './config.js';
import { ApiError, publicError } from './errors.js';
import type { createAssistant } from './assistant.js';
import type { ConversationStore } from './conversationStore.js';
import { conversationRoutes, json, readJson } from './conversationRoutes.js';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(32000) }).strict()).min(1).max(100),
  stream: z.boolean().default(true),
}).strict().refine(x => x.messages.at(-1)?.role === 'user', 'Ultimo messaggio richiesto: user');
export function createApiServer(assistant: ReturnType<typeof createAssistant>, health: () => Promise<unknown> = async () => ({ status: 'ok' }), store?: ConversationStore) {
  const handleConversations = store ? conversationRoutes(store, assistant) : undefined;
  return createServer(async (req, res) => {
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin && !config.origins.includes(origin)) { json(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origine non consentita' } }); return; }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const controller = new AbortController();
    const signal = controller.signal;
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    let timer: NodeJS.Timeout | undefined;
    try {
      if (req.url === '/api/health' && req.method === 'GET') { json(res, 200, await health()); return; }
      timer = setTimeout(() => controller.abort(new ApiError(504, 'TIMEOUT', 'Tempo massimo della richiesta superato')), config.timeoutMs);
      if (handleConversations && await handleConversations(req, res, signal)) return;
      if (req.url !== '/api/chat') throw new ApiError(404, 'NOT_FOUND', 'Endpoint non trovato');
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST'); }
      const raw = await readJson(req, signal);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ApiError(400, 'INVALID_REQUEST', 'Invia messages con role user/assistant e content non vuoto; ultimo messaggio user');
      if (!parsed.data.stream) {
        const message = await assistant(parsed.data.messages, signal, async () => {});
        json(res, 200, { message }); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      const heartbeat = setInterval(() => { if (!res.destroyed && !res.writableNeedDrain) res.write(': keep-alive\n\n'); }, 15000);
      try {
        await assistant(parsed.data.messages, signal, async event => {
          signal.throwIfAborted();
          if (!res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)) await once(res, 'drain', { signal });
        });
      } finally { clearInterval(heartbeat); }
      res.end();
    } catch (error) {
      if (res.destroyed) return;
      const failure = publicError(signal.aborted ? signal.reason : error);
      const payload = { error: { code: failure.code, message: failure.message } };
      if (res.headersSent) { res.end(`event: error\ndata: ${JSON.stringify({ type: 'error', ...payload })}\n\n`); }
      else json(res, failure.status, payload);
    } finally { if (timer) clearTimeout(timer); }
  });
}
