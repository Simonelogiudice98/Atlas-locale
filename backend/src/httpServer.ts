import { createServer, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { z } from 'zod';
import { config } from './config.js';
import { ApiError, publicError } from './errors.js';
import type { createAssistant } from './assistant.js';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(32000) }).strict()).min(1).max(100),
  stream: z.boolean().default(true),
}).strict().refine(x => x.messages.at(-1)?.role === 'user', 'Ultimo messaggio richiesto: user');
function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body));
}
export function createApiServer(assistant: ReturnType<typeof createAssistant>, health: () => Promise<unknown> = async () => ({ status: 'ok' })) {
  return createServer(async (req, res) => {
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin && !config.origins.includes(origin)) { json(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origine non consentita' } }); return; }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const controller = new AbortController();
    const signal = controller.signal;
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    let timer: NodeJS.Timeout | undefined;
    try {
      if (req.url === '/api/health' && req.method === 'GET') { json(res, 200, await health()); return; }
      if (req.url !== '/api/chat') throw new ApiError(404, 'NOT_FOUND', 'Endpoint non trovato');
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST'); }
      if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'CONTENT_TYPE', 'Usa application/json');
      timer = setTimeout(() => controller.abort(new ApiError(504, 'TIMEOUT', 'Tempo massimo della richiesta superato')), config.timeoutMs);
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        signal.throwIfAborted(); size += chunk.length;
        if (size > 256000) throw new ApiError(413, 'BODY_TOO_LARGE', 'Richiesta troppo grande');
        chunks.push(chunk);
      }
      let raw: unknown;
      try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new ApiError(400, 'INVALID_JSON', 'JSON non valido'); }
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
