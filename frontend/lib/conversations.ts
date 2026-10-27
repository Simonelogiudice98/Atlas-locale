import type { Conversation, Message } from "@/types/chat";

export class ChatApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function chatRequest(path = "", init?: RequestInit): Promise<Response> {
  const response = await fetch(`/api/conversations${path}`, { ...init, cache: "no-store" });
  if (!response.ok) {
    let message = `Errore HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data.error?.message === "string") message = data.error.message;
    } catch { /* Preserve the HTTP error when a proxy returns non-JSON content. */ }
    throw new ChatApiError(message, response.status);
  }
  return response;
}

export async function getConversation(id: string, signal?: AbortSignal): Promise<{ conversation: Conversation; messages: Message[] }> {
  return (await chatRequest(`/${encodeURIComponent(id)}`, { signal })).json();
}

export async function createConversation(content: string, signal?: AbortSignal): Promise<Conversation> {
  const response = await chatRequest("", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: content.replace(/\s+/g, " ").trim().slice(0, 80) }), signal,
  });
  return (await response.json()).conversation;
}
