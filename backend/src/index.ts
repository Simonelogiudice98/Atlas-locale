import { createInterface } from "readline/promises";
import { AssistantMessage, ChatMessage } from "./interfaces/IChatInterface.js";
import { convertToOllama } from "./mcpToOllamaAdapter.js";
import { chat } from "./ollamaClient.js";
import { buildToolMap, connectAllClients, getAllTools, closeAllClients } from "./toolRouter.js";

async function main() {
  await connectAllClients();
  const toolMap = await buildToolMap();
  const toolsList = await getAllTools();

  const ollamaTools = convertToOllama(toolsList);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const userInput = await rl.question("Tu:")
  rl.close();

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Sei un assistente che risponde in italiano. Dopo aver ricevuto il risultato di uno strumento (tool), scrivi sempre la risposta finale in linguaggio naturale come output di risposta — non lasciarla solo nel tuo ragionamento interno.",
    },
    { role: "user", content: userInput },
  ];

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
        const runFn = toolMap[tool.function.name];
        if (!runFn) throw new Error("Tool sconosciuto: " + tool.function.name);
        const result = await runFn(tool.function.name, tool.function.arguments);

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
              role: "tool" as const,
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

main().finally(closeAllClients).catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
