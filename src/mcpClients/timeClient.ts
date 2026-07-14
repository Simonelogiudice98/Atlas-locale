import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const timeClient = new Client({
  name: "jarvis-time-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/mcpServers/timeServer.ts"],

  // Versione "finale" da usare dopo il build (tsc), quando il server
  // sarà stabile — vedi punto 5 delle specifiche (perfezionamento successivo):
  // command: "node",
  // args: ["dist/mcpServers/timeServer.js"],
});

async function main() {
  await timeClient.connect(transport);
  console.log("jarvis-time-client connesso al time server");

  const toolsResult = await timeClient.listTools();
  console.log(toolsResult.tools);

  const result = await timeClient.callTool({
    name:"get_time"
  })
  console.log(result.content);
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});