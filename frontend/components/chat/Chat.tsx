"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import ChatComposer from "./chat-composer/ChatComposer";
import MessageList from "./message-list/MessageList";
import ChatHeader from "./chat-header/chatHeader";
import ChatSidebar from "./sidebar/ChatSidebar";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { useConversations } from "@/hooks/useConversations";

export default function Chat() {
  const chat = useConversations();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const busy = chat.status !== "idle";
  const title = chat.conversations.find(item => item.id === chat.selectedId)?.title ?? "Nuova chat";

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <ChatSidebar conversations={chat.conversations} selectedId={chat.selectedId} disabled={busy}
        loading={chat.historyLoading} error={chat.historyError} hasMore={chat.hasMore}
        open={sidebarOpen} onClose={closeSidebar} onNew={() => { chat.newChat(); setDraftKey(key => key + 1); }}
        onSelect={id => void chat.selectConversation(id)} onDelete={id => void chat.deleteConversation(id)}
        onReload={() => void chat.loadHistory()} onMore={() => void chat.loadHistory(true)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader title={title} onOpenSidebar={() => setSidebarOpen(true)} />
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-2 pb-3 sm:px-4 sm:pb-5">
          {chat.status === "opening" ? <div role="status" className="flex-1 px-4 py-8 text-sm text-muted-foreground">Apertura della chat…</div>
            : <MessageList key={chat.selectedId ?? "new"} messages={chat.messages} isLoading={chat.status === "sending" && !chat.hasContent} />}
          <div className="flex flex-col gap-3">
            {chat.error && <Alert variant="destructive">
              <button type="button" onClick={chat.dismissError} aria-label="Chiudi il messaggio di errore" className="rounded focus-visible:outline-2 focus-visible:outline-ring"><X className="size-4" /></button>
              <AlertDescription>
                <p>{chat.error}</p>
                {chat.failedText && !chat.uncertain && <Button variant="outline" size="sm" disabled={busy} onClick={() => void chat.send(chat.failedText!)}>Riprova invio</Button>}
              </AlertDescription>
            </Alert>}
            {chat.uncertain && chat.selectedId && <Button variant="outline" disabled={busy} onClick={() => void chat.selectConversation(chat.selectedId!)}>Ricarica chat</Button>}
            {chat.status === "sending" && chat.hasContent && <p role="status" className="px-3 text-xs text-muted-foreground">Atlas sta rispondendo…</p>}
            <ChatComposer key={`${chat.selectedId ?? "new"}-${draftKey}`} onSend={value => void chat.send(value)} isLoading={busy || chat.uncertain} />
          </div>
        </div>
      </main>
    </div>
  );
}
