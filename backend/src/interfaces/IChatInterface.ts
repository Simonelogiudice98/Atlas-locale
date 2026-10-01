export interface ChatMessage {
  role:Role;
  content: string;
  name?: string;
  tool_name?: string;
  thinking?: string;
}

type Role = "user" | "assistant" | "system" | "tool"

export interface AssistantMessage extends ChatMessage {
  tool_calls?: ToolCall[];
}

interface ToolCall {
  function: ToolCallFunction;
}

interface ToolCallFunction {
  name: string;
  arguments:Record<string, unknown>;
}

export interface ChatTools {
  type: string;
  function: ToolsFunction;
}

interface ToolsFunction {
  name: string;
  description?: string;
  parameters: Params;
}

interface Params {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}
interface PropertySchema {
  type: string;
  description?: string;
}

export interface RequestBody {
  model: string;
  messages: ChatMessage[];
  tools?: ChatTools[];
  stream: boolean;
}

export interface ResponseBody {
  message: AssistantMessage;
  done: boolean;
}

export type Reminder = {
  id:string;
  content:string;
  created_at:string;
}
