import type { IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { z } from 'zod';
import type { createAssistant } from './assistant.js';
import type { ConversationStore } from './conversationStore.js';
import { ApiError } from './errors.js';

export function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export async function readJson(req: IncomingMessage, signal: AbortSignal): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'CONTENT_TYPE', 'Usa application/json');
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    signal.throwIfAborted(); size += chunk.length;
    if (size > 256000) throw new ApiError(413, 'BODY_TOO_LARGE', 'Richiesta troppo grande');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'JSON non valido'); }
}

const createSchema = z.object({ title: z.string().trim().min(1).max(200).default('Nuova chat') }).strict();
const turnSchema = z.object({ content: z.string().trim().min(1).max(32000), stream: z.boolean().default(true) }).strict();
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
}).strict();

function method(res: ServerResponse, allowed: string): never {
  res.setHeader('Allow', allowed);
  throw new ApiError(405, 'METHOD_NOT_ALLOWED', `Usa ${allowed}`);
}

export function conversationRoutes(store: ConversationStore, assistant: ReturnType<typeof createAssistant>) {
  const busy = new Set<string>();
  return async (req: IncomingMessage, res: ServerResponse, signal: AbortSignal) => {
    const url = new URL(req.url!, 'http://localhost');
    const match = /^\/api\/conversations(?:\/([^/]+)(\/messages)?)?$/.exec(url.pathname);
    if (!match) return false;
    const [, id, messagesPath] = match;
    if (!id) {
      if (req.method === 'GET') {
        const parsed = paginationSchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) throw new ApiError(400, 'INVALID_REQUEST', 'Paginazione non valida');
        json(res, 200, { conversations: store.list(parsed.data.limit, parsed.data.offset) });
      } else if (req.method === 'POST') {
        const parsed = createSchema.safeParse(await readJson(req, signal));
        if (!parsed.success) throw new ApiError(400, 'INVALID_REQUEST', 'Titolo non valido (1-200 caratteri)');
        const conversation = store.create(parsed.data.title);
        res.setHeader('Location', `/api/conversations/${conversation.id}`);
        json(res, 201, { conversation });
      } else method(res, 'GET, POST');
      return true;
    }
    if (!z.uuid().safeParse(id).success) throw new ApiError(400, 'INVALID_REQUEST', 'ID conversazione non valido');
    if (!messagesPath) {
      if (req.method === 'GET') json(res, 200, { conversation: store.get(id), messages: store.messages(id) });
      else if (req.method === 'DELETE') {
        if (busy.has(id)) throw new ApiError(409, 'CONVERSATION_BUSY', 'Generazione in corso per questa conversazione');
        store.delete(id); res.writeHead(204); res.end();
      } else method(res, 'GET, DELETE');
      return true;
    }
    if (req.method !== 'POST') method(res, 'POST');
    const parsed = turnSchema.safeParse(await readJson(req, signal));
    if (!parsed.success) throw new ApiError(400, 'INVALID_REQUEST', 'Invia content non vuoto (max 32000 caratteri) e stream opzionale');
    if (busy.has(id)) throw new ApiError(409, 'CONVERSATION_BUSY', 'Generazione in corso per questa conversazione');
    const history = store.messages(id).slice(-98).map(({ role, content }) => ({ role, content }));
    history.push({ role: 'user', content: parsed.data.content });
    // Keep complete turns and cap the context without deleting saved messages.
    while (history.length > 1 && Buffer.byteLength(JSON.stringify(history)) > 240000) history.splice(0, 2);
    busy.add(id);
    let heartbeat: NodeJS.Timeout | undefined;
    try {
      if (parsed.data.stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
        res.flushHeaders();
        heartbeat = setInterval(() => { if (!res.destroyed && !res.writableNeedDrain) res.write(': keep-alive\n\n'); }, 15000);
      }
      const message = await assistant(history, signal, async event => {
        signal.throwIfAborted();
        // Completion is sent only after the database transaction commits.
        if (!parsed.data.stream || event.type === 'done') return;
        if (!res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)) await once(res, 'drain', { signal });
      });
      signal.throwIfAborted();
      store.appendTurn(id, parsed.data.content, message.content);
      if (parsed.data.stream) res.end(`event: done\ndata: ${JSON.stringify({ type: 'done', message })}\n\n`);
      else json(res, 200, { message });
    } finally { if (heartbeat) clearInterval(heartbeat); busy.delete(id); }
    return true;
  };
}
