import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createAssistant } from '../src/assistant.js';
import { createApiServer } from '../src/httpServer.js';
import { streamChat } from '../src/ollamaClient.js';
import { config } from '../src/config.js';
import type { ChatEvent } from '../src/assistant.js';

test('API: JSON, SSE, validation, CORS, cancellation', async () => {
  let cancelled!: () => void;
  const cancelledPromise = new Promise<void>(resolve => { cancelled = resolve; });
  const assistant: ReturnType<typeof createAssistant> = async (messages, signal, emit) => {
    if (messages[0].content === 'wait') {
      await emit({ type: 'delta', text: 'start' });
      await new Promise<void>(resolve => signal.addEventListener('abort', () => { cancelled(); resolve(); }, { once: true }));
      signal.throwIfAborted();
    }
    await emit({ type: 'delta', text: 'Ciao' });
    const message = { role: 'assistant' as const, content: 'Ciao' };
    await emit({ type: 'done', message }); return message;
  };
  const server = createApiServer(assistant); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/chat`;
  const post = (body: unknown, origin = 'http://localhost:3000') => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
  try {
    const response = await post({ messages: [{ role: 'user', content: 'hello' }], stream: false });
    assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.deepEqual(await response.json(), { message: { role: 'assistant', content: 'Ciao' } });
    const streamed = await post({ messages: [{ role: 'user', content: 'hello' }] });
    const text = await streamed.text(); assert.match(text, /event: delta/); assert.match(text, /event: done/);
    assert.equal((await post({ messages: [{ role: 'system', content: 'bad' }] })).status, 400);
    assert.equal((await post({ messages: [] })).status, 400);
    assert.equal((await post({}, 'https://other.example')).status, 403);
    assert.equal((await fetch(url, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } })).status, 204);
    const abort = new AbortController();
    const waiting = await fetch(url, { method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'wait' }] }) });
    await waiting.body!.getReader().read(); abort.abort();
    await Promise.race([cancelledPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('cancel not propagated')), 1500).unref())]);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('tool errors become context, multiple blocks and subsequent calls work', async () => {
  let round = 0; const events: ChatEvent[] = [];
  const run = createAssistant([], { weather: async () => ({ isError: true, content: [{ type: 'text', text: 'offline' }, { type: 'text', text: 'retry' }] }) }, async (messages, _tools, _signal, delta) => {
    if (round++ === 0) return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'weather', arguments: {} } }] };
    assert.match(messages.at(-1)!.content, /Errore: offline\nretry/);
    await delta('Errore meteo'); return { role: 'assistant', content: 'Errore meteo' };
  });
  const result = await run([{ role: 'user', content: 'meteo' }], new AbortController().signal, async event => { events.push(event); });
  assert.equal(result.content, 'Errore meteo'); assert.ok(events.some(x => x.type === 'tool_end' && x.status === 'error'));
});

test('tool loop is bounded', async () => {
  const run = createAssistant([], {}, async () => ({ role: 'assistant', content: '', tool_calls: [{ function: { name: 'missing', arguments: {} } }] }));
  await assert.rejects(run([{ role: 'user', content: 'hello' }], new AbortController().signal, async () => {}), /limite/);
});

test('Ollama: fragmented UTF8, thinking and tools, HTTP errors, truncated stream', async () => {
  let mode = 'ok';
  const mock = createServer((_req, res) => {
    if (mode === 'http') { res.writeHead(500); res.end('{}'); return; }
    res.setHeader('Content-Type', 'application/x-ndjson');
    const data = Buffer.from(JSON.stringify({ message: { content: 'Città', thinking: 'internal', tool_calls: [{ function: { name: 'time', arguments: {} } }] }, done: false }) + '\n' + (mode === 'truncated' ? '' : JSON.stringify({ message: { content: '!' }, done: true })));
    for (let i = 0; i < data.length; i += 3) res.write(data.subarray(i, i + 3));
    res.end();
  });
  mock.listen(0, '127.0.0.1'); await once(mock, 'listening');
  const original = config.baseUrl; config.baseUrl = `http://127.0.0.1:${(mock.address() as { port: number }).port}`;
  try {
    const deltas: string[] = [];
    const result = await streamChat([], [], new AbortController().signal, async text => { deltas.push(text); });
    assert.equal(result.content, 'Città!'); assert.equal(result.thinking, 'internal'); assert.equal(result.tool_calls?.[0].function.name, 'time'); assert.equal(deltas.join(''), 'Città!');
    mode = 'http'; await assert.rejects(streamChat([], [], new AbortController().signal, async () => {}), /HTTP 500/);
    mode = 'truncated'; await assert.rejects(streamChat([], [], new AbortController().signal, async () => {}), /interrotto/);
  } finally { config.baseUrl = original; mock.closeAllConnections(); await new Promise<void>(resolve => mock.close(() => resolve())); }
});
