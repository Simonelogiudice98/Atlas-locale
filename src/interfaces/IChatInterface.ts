interface ChatMessage {
  role: string;
  content: string;
}

interface AssistantMessage extends ChatMessage {
  tool_calls?: ToolCall[];
}

interface ToolCall {
  function: ToolCallFunction;
}

interface ToolCallFunction {
  name: string;
  arguments:Record<string, unknown>;
}

interface Tools {
  type: string;
  function: ToolsFunction;
}

interface ToolsFunction {
  name: string;
  description: string;
  parameters: Params;
}

interface Params {
  type: string;
  properties: Record<string, PropertySchema>;
  required: string[];
}
interface PropertySchema {
  type: string;
  description?: string;
}

export interface RequestBody {
  model: string;
  messages: ChatMessage[];
  tools?: Tools[];
  stream: boolean;
}

export interface ResponseBody {
  message: AssistantMessage;
  done: boolean;
}
