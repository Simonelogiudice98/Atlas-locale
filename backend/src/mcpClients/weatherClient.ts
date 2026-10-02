import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const weatherClient = new Client({
  name: "atlas-weather-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "src/mcpServers/weatherServer.ts"],

  // Versione "finale" da usare dopo il build (tsc), quando il server
  // sarà stabile — vedi punto 5 delle specifiche (perfezionamento successivo):
  // command: "node",
  // args: ["dist/mcpServers/weatherServer.js"],
});

export async function connectWeatherClient(): Promise<void> {
  await weatherClient.connect(transport);
}

export async function getWeatherTools(): Promise<Tool[]> {
  return (await weatherClient.listTools()).tools;
}

export async function runWeatherTools(name: string, args: Record<string, unknown>, signal?: AbortSignal) {
  return await weatherClient.callTool({
    name: name,
    arguments:args
  }, undefined, { signal, timeout: 30000 });
}


export async function closeweatherClient() { await weatherClient.close(); }

