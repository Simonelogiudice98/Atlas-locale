import { config } from './config.js';
import { createAssistant } from './assistant.js';
import { createApiServer } from './httpServer.js';
import { convertToOllama } from './mcpToOllamaAdapter.js';
import { connectAllClients, buildToolMap, getAllTools, closeAllClients } from './toolRouter.js';

async function main() {
  await connectAllClients();
  const tools = convertToOllama(await getAllTools());
  const assistant = createAssistant(tools, await buildToolMap());
  const server = createApiServer(assistant, async () => {
    let ollama = 'unavailable';
    try {
      const response = await fetch(`${config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json() as { models?: { name: string }[] };
        ollama = data.models?.some(x => x.name === config.model || x.name === `${config.model}:latest`) ? 'ready' : 'model_missing';
      }
    } catch { /* Health remains available while Ollama is offline. */ }
    return { status: ollama === 'ready' ? 'ok' : 'degraded', ollama, model: config.model, tools: tools.map(x => x.function.name) };
  });
  server.requestTimeout = 15000;
  server.listen(config.port, '127.0.0.1', () => console.log(`Atlas API: http://127.0.0.1:${config.port}`));
  let stopping = false;
  async function shutdown() {
    if (stopping) return; stopping = true;
    server.close(); server.closeAllConnections(); await closeAllClients();
  }
  server.on('error', error => { console.error(error); void shutdown().then(() => { process.exitCode = 1; }); });
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}
main().catch(async error => { console.error(error); await closeAllClients(); process.exitCode = 1; });
