"use client";
import { useAtom } from "jotai";
import ChatComposer from "./chat-composer/ChatComposer";
import MessageList from "./message-list/MessageList";
import type { Message } from "@/types/chat";
import { messagesAtom } from "@/store/messagesAtom";
import { randomUUID } from "crypto";



const mockMessages: Message[] = [
  {
    id: "mock-1",
    role: "user",
    content: "Ciao! Mi aiuti a capire come funziona questa chat?",
  },
  {
    id: "mock-2",
    role: "assistant",
    content:
      "Certo! Scrivi una domanda nel box in basso e premi Invia. La risposta apparirà nella conversazione.",
  },
  {
    id: "mock-3",
    role: "user",
    content:
      "Vorrei prepararmi a un colloquio frontend.\nDa quali argomenti posso iniziare?",
  },
  {
    id: "mock-4",
    role: "assistant",
    content:
      "Puoi iniziare da questi argomenti:\n\n1. Componenti React e passaggio delle props.\n2. Gestione dello stato locale e condiviso.\n3. Chiamate API, caricamento e gestione degli errori.\n\nQuesto progetto ti permette di esercitarti su tutti e tre. Quando la chat sarà collegata al backend, potrai aggiungere lo streaming e la cancellazione delle richieste per approfondire la gestione delle operazioni asincrone.",
  },
];

const Chat = () => {
  const [messages, setMessages] = useAtom(messagesAtom);

  const onSend = (value: string) => {
    const newMessage:Message ={
      id: crypto.randomUUID(),
      role:"user",
      content:value
    }

    setMessages((prevValue) => [
      ...prevValue,
      newMessage
    ])

  };

  return (
    <div className="flex flex-col h-dvh w-full max-w-3xl mx-auto px-4">
      <MessageList messages={messages} />
      <ChatComposer onSend={onSend} />
    </div>
  );
};

export default Chat;
