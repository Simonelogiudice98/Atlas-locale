import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const timeClient = new Client({
  name: "atlas-time-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "src/mcpServers/timeServer.ts"],

  // Versione "finale" da usare dopo il build (tsc), quando il server
  // sarà stabile — vedi punto 5 delle specifiche (perfezionamento successivo):
  // command: "node",
  // args: ["dist/mcpServers/timeServer.js"],
});

export async function connectTimeClient(): Promise<void> {
  await timeClient.connect(transport);
}

export async function getTimeTools(): Promise<Tool[]> {
  return (await timeClient.listTools()).tools;
}

export async function runTimeTools(name: string, args: Record<string, unknown>, signal?: AbortSignal) {
  return await timeClient.callTool({
    name: name,
    arguments:args
  }, undefined, { signal, timeout: 30000 });
}


export async function closetimeClient() { await timeClient.close(); }

