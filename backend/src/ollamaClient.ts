import { z } from 'zod';
import { config } from './config.js';
import { ApiError } from './errors.js';
import type { AssistantMessage, ChatMessage, ChatTools } from './interfaces/IChatInterface.js';

const chunkSchema = z.object({
  error: z.string().optional(), done: z.boolean().optional(),
  message: z.object({
    content: z.string().optional(), thinking: z.string().optional(),
    tool_calls: z.array(z.object({ function: z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) }) })).optional(),
  }).optional(),
});

export async function streamChat(messages: ChatMessage[], tools: ChatTools[], signal: AbortSignal,
  onDelta: (text: string) => Promise<void>): Promise<AssistantMessage> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ model: config.model, messages, tools, stream: true }),
    });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw new ApiError(502, 'OLLAMA_UNAVAILABLE', 'Ollama non raggiungibile. Controlla che sia avviato.');
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ApiError(502, 'OLLAMA_HTTP_ERROR', `Ollama ha restituito HTTP ${response.status}. Controlla anche il modello configurato.`);
  }
  if (!response.body) throw new ApiError(502, 'INVALID_OLLAMA_RESPONSE', 'Risposta Ollama senza stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const result: AssistantMessage = { role: 'assistant', content: '' };
  let buffer = '', done = false;
  async function consume(line: string) {
    if (!line.trim()) return;
    let chunk: z.infer<typeof chunkSchema>;
    try { chunk = chunkSchema.parse(JSON.parse(line)); }
    catch { throw new ApiError(502, 'INVALID_OLLAMA_RESPONSE', 'Stream Ollama non valido'); }
    if (chunk.error) throw new ApiError(502, 'OLLAMA_GENERATION_ERROR', 'Ollama ha interrotto la generazione');
    if (chunk.message?.content) { result.content += chunk.message.content; await onDelta(chunk.message.content); }
    if (chunk.message?.thinking) result.thinking = (result.thinking || '') + chunk.message.thinking;
    if (chunk.message?.tool_calls?.length) result.tool_calls = [...(result.tool_calls || []), ...chunk.message.tool_calls];
    if (chunk.done) done = true;
  }
  try {
    while (!done) {
      const next = await reader.read();
      buffer += decoder.decode(next.value, { stream: !next.done });
      if (buffer.length > 2_000_000) throw new ApiError(502, 'INVALID_OLLAMA_RESPONSE', 'Chunk Ollama troppo grande');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); await consume(line);
      }
      if (next.done) { await consume(buffer); break; }
    }
    if (!done) throw new ApiError(502, 'INCOMPLETE_STREAM', 'Stream Ollama interrotto prima del completamento');
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function chat(messages: ChatMessage[], tools: ChatTools[] = []): Promise<AssistantMessage> {
  return streamChat(messages, tools, AbortSignal.timeout(config.timeoutMs), async () => {});
}
