import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Reminder } from "../interfaces/IChatInterface.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const remindersServer = new McpServer({
  name: "reminders",
  version: "1.0.0",
});

async function readReminders(): Promise<Reminder[]> {
  try {
    const file = await readFile("data/reminders.json", "utf-8");

    return JSON.parse(file) as Reminder[];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeReminders(reminders: Reminder[]): Promise<void> {
  await mkdir("data", { recursive: true });
  const jsonReminders = JSON.stringify(reminders, null, 2);

  await writeFile("data/reminders.json", jsonReminders, "utf-8");
}

remindersServer.registerTool(
  "add_reminder",
  {
    description: "Aggiunge un nuovo reminder alla lista",
    inputSchema: {
      content: z.string().describe("il testo all'interno del reminder"),
    },
  },
  async ({ content }) => {
    const reminders = await readReminders();
    const newReminder:Reminder = {
      id: crypto.randomUUID(),
      content: content,
      created_at:new Date().toISOString(),
    };
    await writeReminders([...reminders,newReminder]);

    return {
        content:[
            {
                type:"text" as const,
                text:`"Promemoria aggiunto: ${content}"`,
            },
            
        ],
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await remindersServer.connect(transport);
  console.error("reminders MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
