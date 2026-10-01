import { loadEnvFile } from 'node:process';
try { loadEnvFile(); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
function positive(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} deve essere un intero positivo`);
  return value;
}
export const config = {
  baseUrl: (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  model: process.env.OLLAMA_MODEL || 'qwen3:14b',
  port: positive('PORT', 3001),
  timeoutMs: positive('CHAT_TIMEOUT_MS', 120000),
  origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(x => x.trim()),
};
