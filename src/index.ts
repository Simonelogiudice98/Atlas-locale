import { ChatMessage } from "./interfaces/IChatInterface.js";
import { connectTimeClient, getTimeTools } from "./mcpClients/timeClient.js";
import { convertToOllama } from "./mcpToOllamaAdapter.js";
import { chat } from "./ollamaClient.js";

async function main() {
  const messages: ChatMessage[] = [
    { role: "user", content: "che ore sono?" },
  ];

  await connectTimeClient();
  const toolsList = await getTimeTools();
  const ollamaTools = convertToOllama(toolsList);

  const prova = await chat(messages,ollamaTools);
  console.log(prova);
}
main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});