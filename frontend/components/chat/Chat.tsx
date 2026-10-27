"use client";
import ChatComposer from "./chat-composer/ChatComposer";
import MessageList from "./message-list/MessageList";
import type { ChatErrorResponse, Message } from "@/types/chat";
import { readChatStream } from "@/lib/chat-stream";
import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { messageAdded, messageUpdated } from "@/store/chatSlice";
import ChatHeader from "./chat-header/chatHeader";

const Chat = () => {
  const messages = useAppSelector((state) => state.chat.messages);
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasContent, setHasContent] = useState(false);

  const onSend = async (value: string) => {
    if (isLoading) return;

    setError(null);
    setIsLoading(true);
    setHasContent(false);

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    const updatedMessages = [...messages, newMessage];
    dispatch(messageAdded(newMessage));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((message) => {
            return {
              role: message.role,
              content: message.content,
            };
          }),
          stream: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Errore HTTP ${response.status}`;

        try {
          const errorData: ChatErrorResponse | null = await response.json();

          if (
            typeof errorData?.error?.message === "string" &&
            errorData.error.message.trim()
          ) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // Se il body non è JSON, manteniamo il messaggio HTTP generico.
        }

        throw new Error(errorMessage);
      }

      if (!response.body) throw new Error("Risposta del server senza stream.");
      const id = crypto.randomUUID();
      let added = false;
      await readChatStream(response.body, (content) => {
        if (!added) {
          dispatch(messageAdded({ id, role: "assistant", content }));
          added = true;
          setHasContent(true);
        } else {
          dispatch(messageUpdated({ id, content }));
        }
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Non è stato possibile ricevere la risposta.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh bg-background p-2 sm:p-4">
      <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
        <ChatHeader />
        <MessageList messages={messages} isLoading={isLoading && !hasContent} />

        <div className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="chiudi il messaggio d'errore"
              >
                <X className="size-4" />
              </button>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ChatComposer onSend={onSend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
