import type { AssistantMessage, ChatMessage, ChatTools } from './interfaces/IChatInterface.js';
import { ApiError } from './errors.js';
import { streamChat } from './ollamaClient.js';

export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_end'; name: string; status: 'ok' | 'error' }
  | { type: 'done'; message: { role: 'assistant'; content: string } };
type ToolResult = { [key: string]: unknown; content?: unknown; isError?: boolean };
export type ToolRunner = (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<ToolResult>;
type Generator = typeof streamChat;

export function createAssistant(tools: ChatTools[], toolMap: Record<string, ToolRunner>, generate: Generator = streamChat) {
  return async (history: ChatMessage[], signal: AbortSignal, emit: (event: ChatEvent) => Promise<void>) => {
    const messages: ChatMessage[] = [{ role: 'system', content:
      'Sei un assistente che risponde in italiano. Dopo i tool scrivi sempre una risposta finale in linguaggio naturale. Se un tool fallisce spiega il problema senza inventare risultati.' }, ...history];
    let content = '';
    for (let round = 0; round < 6; round++) {
      signal.throwIfAborted();
      const answer: AssistantMessage = await generate(messages, tools, signal, async text => {
        content += text; await emit({ type: 'delta', text });
      });
      if (!answer.tool_calls?.length) {
        if (!content.trim()) throw new ApiError(502, 'EMPTY_RESPONSE', 'Il modello non ha prodotto una risposta testuale');
        const message = { role: 'assistant' as const, content };
        await emit({ type: 'done', message }); return message;
      }
      messages.push(answer);
      for (const call of answer.tool_calls) {
        signal.throwIfAborted();
        const { name, arguments: args } = call.function;
        await emit({ type: 'tool_start', name });
        let text: string, status: 'ok' | 'error' = 'ok';
        try {
          const run = toolMap[name];
          if (!run) throw new Error('Tool sconosciuto');
          const result = await run(name, args, signal);
          signal.throwIfAborted();
          text = Array.isArray(result.content) ? result.content
            .filter((x): x is { type: 'text'; text: string } => x?.type === 'text' && typeof x.text === 'string')
            .map(x => x.text).join('\n') : '';
          if (result.isError) status = 'error';
          if (!text) { text = 'Il tool non ha restituito testo utilizzabile'; status = 'error'; }
        } catch (error) {
          if (signal.aborted) throw signal.reason;
          status = 'error'; text = error instanceof Error ? error.message : 'Errore del tool';
        }
        messages.push({ role: 'tool', name, tool_name: name, content: status === 'error' ? `Errore: ${text}` : text });
        await emit({ type: 'tool_end', name, status });
      }
    }
    throw new ApiError(502, 'TOOL_LIMIT', 'Raggiunto il limite di chiamate agli strumenti');
  };
}
