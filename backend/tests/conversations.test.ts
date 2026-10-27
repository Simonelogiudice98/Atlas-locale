import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ApiError } from '../src/errors.js';
import { ConversationStore } from '../src/conversationStore.js';
import { createApiServer } from '../src/httpServer.js';
import type { createAssistant } from '../src/assistant.js';

test('SQLite: persistence, ordering, atomic rollback and cascading deletion', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-db-'));
  const path = join(directory, 'atlas.db');
  let store = new ConversationStore(path);
  try {
    const conversation = store.create('Una chat');
    store.appendTurn(conversation.id, 'Città 🌍', 'Roma');
    assert.throws(() => store.appendTurn(conversation.id, 'Rollback', ''));
    assert.equal(store.messages(conversation.id).length, 2);
    store.close(); store = new ConversationStore(path);
    assert.equal(store.get(conversation.id).title, 'Una chat');
    assert.deepEqual(store.messages(conversation.id).map(m => m.content), ['Città 🌍', 'Roma']);
    store.delete(conversation.id);
    assert.deepEqual(store.list(), []);
    const check = new DatabaseSync(path);
    try { assert.equal(check.prepare('SELECT count(*) AS n FROM messages').get()!.n, 0); }
    finally { check.close(); }
  } finally { store.close(); await rm(directory, { recursive: true, force: true }); }
});

test('Conversation API: CRUD, JSON/SSE, server history, errors, busy and cancellation', async () => {
  const store = new ConversationStore(':memory:');
  let started!: () => void;
  let aborted!: () => void;
  const startedPromise = new Promise<void>(resolve => { started = resolve; });
  const abortedPromise = new Promise<void>(resolve => { aborted = resolve; });
  const assistant: ReturnType<typeof createAssistant> = async (history, signal, emit) => {
    const last = history.at(-1)!.content;
    if (last === 'fail') throw new ApiError(502, 'SIMULATED_FAILURE', 'Simulated generation failure');
    if (last === 'wait') {
      await emit({ type: 'delta', text: 'parziale' }); started();
      await new Promise<void>(resolve => signal.addEventListener('abort', () => { aborted(); resolve(); }, { once: true }));
      signal.throwIfAborted();
    }
    if (last === 'seconda') assert.deepEqual(history.map(m => m.content), ['prima', 'risposta', 'seconda']);
    const message = { role: 'assistant' as const, content: 'risposta' };
    await emit({ type: 'delta', text: message.content });
    await emit({ type: 'done', message });
    return message;
  };
  const server = createApiServer(assistant, undefined, store);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/conversations`;
  const post = (path: string, body: unknown, signal?: AbortSignal) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  try {
    const created = await post('', { title: 'Test' }); assert.equal(created.status, 201);
    const { conversation } = await created.json() as { conversation: { id: string } };
    const path = `/${conversation.id}`;
    assert.equal((await post('', { title: ' ' })).status, 400);
    assert.equal((await fetch(base + '?limit=0')).status, 400);
    assert.equal((await fetch(base + '/bad')).status, 400);
    assert.equal((await fetch(base + '/00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await post(path + '/messages', { content: ' ' })).status, 400);
    const first = await post(path + '/messages', { content: 'prima', stream: false });
    assert.deepEqual(await first.json(), { message: { role: 'assistant', content: 'risposta' } });
    const second = await post(path + '/messages', { content: 'seconda' });
    const events = await second.text();
    assert.match(events, /event: delta/); assert.equal(events.match(/event: done/g)?.length, 1);
    const detail = await (await fetch(base + path)).json() as { messages: unknown[] };
    assert.equal(detail.messages.length, 4);
    const failure = await post(path + '/messages', { content: 'fail' });
    assert.match(await failure.text(), /event: error/);
    assert.equal(store.messages(conversation.id).length, 4);
    const abort = new AbortController();
    const waiting = await post(path + '/messages', { content: 'wait' }, abort.signal);
    await startedPromise;
    assert.equal((await post(path + '/messages', { content: 'concurrent' })).status, 409);
    assert.equal((await fetch(base + path, { method: 'DELETE' })).status, 409);
    await waiting.body!.getReader().read(); abort.abort();
    await Promise.race([abortedPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Missing cancellation')), 1500).unref())]);
    // Allow the aborted request's finally block to release the conversation.
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(store.messages(conversation.id).length, 4);
    assert.equal((await fetch(base + path, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(base + path)).status, 404);
    assert.deepEqual(await (await fetch(base)).json(), { conversations: [] });
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); store.close();
  }
});
