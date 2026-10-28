import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { serverTransport } from "./serverTransport.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const weatherClient = new Client({
  name: "atlas-weather-client",
  version: "1.0.0",
});

const transport = serverTransport('weather');

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

