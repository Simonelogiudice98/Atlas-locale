import { closetimeClient } from './mcpClients/timeClient.js';
import { closeweatherClient } from './mcpClients/weatherClient.js';
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  connectTimeClient,
  getTimeTools,
  runTimeTools,
} from "./mcpClients/timeClient.js";
import {
  connectWeatherClient,
  getWeatherTools,
  runWeatherTools,
} from "./mcpClients/weatherClient.js";

type RunToolFn = typeof runTimeTools;

export async function connectAllClients() {
  await Promise.all([connectTimeClient(), connectWeatherClient()]);
}

export async function getAllTools(): Promise<Tool[]> {
  const [timeTools, weatherTools] = await Promise.all([
    getTimeTools(),
    getWeatherTools(),
  ]);

  return [...timeTools, ...weatherTools];
}

export async function buildToolMap(): Promise<Record<string, RunToolFn>> {
  const timeTools: Tool[] = await getTimeTools();
  const weatherTools: Tool[] = await getWeatherTools();

  const toolMap: Record<string, RunToolFn> = {};

  for (let tool of timeTools) {
    toolMap[tool.name] = runTimeTools;
  }

  for (let tool of weatherTools) {
    toolMap[tool.name] = runWeatherTools;
  }

  return toolMap;
}

export async function closeAllClients() { await Promise.allSettled([closetimeClient(), closeweatherClient()]); }
