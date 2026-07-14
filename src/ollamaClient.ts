import { AssistantMessage, ChatMessage, ChatTools, RequestBody, ResponseBody } from "./interfaces/IChatInterface.js";

const baseUrl = getEnvVar("OLLAMA_BASE_URL");
const model = getEnvVar("OLLAMA_MODEL");

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} non trovato`);
  }
  return value;
}

export async function chat(messages:ChatMessage[],tools?:ChatTools[]): Promise<AssistantMessage> {
  const body: RequestBody = {
    model,
    messages:messages,
    stream: false,
    ...(tools && {tools})
  };

  const response = await fetch(baseUrl + "/api/chat", {
    method:"POST",
    headers:{ "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const res = await response.json() as ResponseBody;

  return res.message;
}
