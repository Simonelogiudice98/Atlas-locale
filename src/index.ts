import { AssistantMessage, ChatMessage } from "./interfaces/IChatInterface.js";
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

  let res: AssistantMessage;
  try {
    res = await chat(messages, ollamaTools);
  } catch (error) {
    console.log("chiamata a Ollama fallita:", error);
    return;
  }

  let toolResultMessages: ChatMessage[] = [];
  if (res.tool_calls) {
    for (let tool of res.tool_calls) {
      try {
        const result = await runTimeTools(
          tool.function.name,
          tool.function.arguments,
        );

        if (Array.isArray(result.content)) {
          const block = result.content[0];
          if (block.type === "text") {
            console.log({
              timestamp: new Date().toISOString(),
              tool: tool.function.name,
              args: tool.function.arguments,
              result: block.text,
              status: "OK",
            });

            let el = {
              role: "tool",
              content: block.text,
              name: tool.function.name,
            };
            toolResultMessages.push(el);
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (error instanceof Error) {
          console.log(
            `chiamata al tool ${tool.function.name} fallita: ${error.message}`,
          );
        } else {
          console.log(`chiamata al tool ${tool.function.name} fallita:`, error);
        }
        console.log({
          timestamp: new Date().toISOString(),
          tool: tool.function.name,
          args: tool.function.arguments,
          result: errorMessage,
          status: "ERROR",
        });
        return;
      }
    }
    const newMessagesArray = [...messages, res, ...toolResultMessages];
    let response: AssistantMessage;
    try {
      response = await chat(newMessagesArray, ollamaTools);
    } catch (error) {
      console.log("chiamata a Ollama fallita (tools):", error);
      return;
    }

    console.log(response.content);
  } else {
    console.log(res.content);
  }
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
