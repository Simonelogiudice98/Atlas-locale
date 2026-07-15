import { ChatMessage } from "./interfaces/IChatInterface.js";
import {
  connectTimeClient,
  getTimeTools,
  runTimeTools,
} from "./mcpClients/timeClient.js";
import { convertToOllama } from "./mcpToOllamaAdapter.js";
import { chat } from "./ollamaClient.js";

async function main() {
  const messages: ChatMessage[] = [{ role: "user", content: "che ore sono?" }];

  await connectTimeClient();

  const toolsList = await getTimeTools();

  const ollamaTools = convertToOllama(toolsList);

  const res = await chat(messages, ollamaTools);

  let toolResultMessages: ChatMessage[] = [];
  if (res.tool_calls) {
    for (let tool of res.tool_calls) {
      const result = await runTimeTools(
        tool.function.name,
        tool.function.arguments,
      );

      if (Array.isArray(result.content)) {
        const block = result.content[0];
        if (block.type === "text") {
          let el = {
            role: "tool",
            content: block.text,
            name: tool.function.name,
          };
          toolResultMessages.push(el);
        }
      }
    }
    const newMessagesArray = [...messages, res, ...toolResultMessages];
    const response = await chat(newMessagesArray, ollamaTools);
    console.log(response.content);
  } else {
    console.log(res.content);
  }
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
