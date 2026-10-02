"use client";
import { useAtom } from "jotai";
import ChatComposer from "./chat-composer/ChatComposer";
import MessageList from "./message-list/MessageList";
import type { ChatResponse, Message } from "@/types/chat";
import { messagesAtom } from "@/store/messagesAtom";
import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { X } from "lucide-react";
// import { randomUUID } from "crypto";

// const mockMessages: Message[] = [
//   {
//     id: "mock-1",
//     role: "user",
//     content: "Ciao! Mi aiuti a capire come funziona questa chat?",
//   },
//   {
//     id: "mock-2",
//     role: "assistant",
//     content:
//       "Certo! Scrivi una domanda nel box in basso e premi Invia. La risposta apparirà nella conversazione.",
//   },
//   {
//     id: "mock-3",
//     role: "user",
//     content:
//       "Vorrei prepararmi a un colloquio frontend.\nDa quali argomenti posso iniziare?",
//   },
//   {
//     id: "mock-4",
//     role: "assistant",
//     content:
//       "Puoi iniziare da questi argomenti:\n\n1. Componenti React e passaggio delle props.\n2. Gestione dello stato locale e condiviso.\n3. Chiamate API, caricamento e gestione degli errori.\n\nQuesto progetto ti permette di esercitarti su tutti e tre. Quando la chat sarà collegata al backend, potrai aggiungere lo streaming e la cancellazione delle richieste per approfondire la gestione delle operazioni asincrone.",
//   },
// ];

const Chat = () => {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSend = async (value: string) => {
    if(isLoading) return

    setError(null);
    setIsLoading(true);

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    const updatedMessages = [...messages, newMessage];

    setMessages(updatedMessages);

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
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      const assistantResponse = {
        id: crypto.randomUUID(),
        role: data.message.role,
        content: data.message.content,
      };

      setMessages((prevValue) => [...prevValue, assistantResponse]);
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
    <div className="flex flex-col h-dvh w-full max-w-3xl mx-auto px-4">
      <MessageList messages={messages} isLoading={isLoading} />

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

      <ChatComposer onSend={onSend} isLoading={isLoading}/>
    </div>
  );
};

export default Chat;
