import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const timeServer = new McpServer({
  name: "time",
  version: "1.0.0",
});

timeServer.registerTool(
  "get_time",
  {
    description: "Restituisce la data e l'ora correnti del sistema",
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: new Date().toLocaleString(),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await timeServer.connect(transport);
  console.error("Time MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
