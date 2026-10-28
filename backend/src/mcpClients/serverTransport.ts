import { fileURLToPath } from 'node:url';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Resolve relative to this module so both tsx development and compiled builds work.
export function serverTransport(name: 'time' | 'weather') {
  const source = import.meta.url.endsWith('.ts');
  const path = fileURLToPath(new URL(`../mcpServers/${name}Server.${source ? 'ts' : 'js'}`, import.meta.url));
  return new StdioClientTransport({
    command: process.execPath,
    args: source ? ['--import', 'tsx', path] : [path],
    env: process.env.TZ ? { TZ: process.env.TZ } : undefined,
  });
}
