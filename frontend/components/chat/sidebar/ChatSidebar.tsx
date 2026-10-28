"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import AtlasLogo from "@/components/AtlasLogo";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/types/chat";

type Props = {
  conversations: Conversation[];
  selectedId: string | null;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReload: () => void;
  onMore: () => void;
};

export default function ChatSidebar(props: Props) {
  const { conversations, selectedId, disabled, loading, error, hasMore, open, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const handleResize = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", handleResize);
    return () => desktop.removeEventListener("change", handleResize);
  }, [onClose]);

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-6 pb-5">
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <AtlasLogo size={36} />
            <span className="text-lg font-semibold tracking-tight">Atlas</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose} aria-label="Chiudi cronologia"><X /></Button>
        </div>
        <Button variant="outline" className="h-10 w-full justify-start gap-2" disabled={disabled} onClick={() => { setConfirmId(null); props.onNew(); onClose(); }}>
          <Plus aria-hidden="true" /> Nuova chat
        </Button>
      </div>
      <nav aria-label="Cronologia delle chat" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <h2 className="px-3 pb-3 text-xs font-medium tracking-wide text-muted-foreground">Le tue conversazioni</h2>
        {loading && conversations.length === 0 && <p role="status" className="px-3 py-3 text-sm text-muted-foreground">Caricamento delle chat…</p>}
        {!loading && !error && conversations.length === 0 && <p className="px-3 py-3 text-sm leading-6 text-muted-foreground">Nessuna chat salvata. Inizia con una domanda.</p>}
        <ul className="space-y-1">
          {conversations.map(conversation => (
            <li key={conversation.id} className={`group rounded-lg border-l-2 ${selectedId === conversation.id ? "border-[#C3A574] bg-secondary" : "border-transparent hover:bg-secondary/50"}`}>
              <div className="flex items-center">
                <button type="button" disabled={disabled} aria-current={selectedId === conversation.id ? "page" : undefined}
                  title={conversation.title} onClick={() => { setConfirmId(null); props.onSelect(conversation.id); onClose(); }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{conversation.title}</span>
                </button>
                <Button variant="ghost" size="icon" className="mr-1 shrink-0 text-muted-foreground hover:text-destructive" disabled={disabled}
                  aria-label={`Elimina ${conversation.title}`} onClick={() => setConfirmId(conversation.id)}><Trash2 className="size-3.5" /></Button>
              </div>
              {confirmId === conversation.id && <div className="px-3 pb-3" role="group" aria-label={`Conferma eliminazione di ${conversation.title}`}>
                <p className="mb-2 text-xs leading-5 text-muted-foreground">Eliminare questa chat e tutti i messaggi?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={disabled} onClick={() => { props.onDelete(conversation.id); setConfirmId(null); }}>Elimina</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Annulla</Button>
                </div>
              </div>}
            </li>
          ))}
        </ul>
        {error && <div role="alert" className="mt-3 rounded-lg border border-destructive/40 p-3 text-sm">
          <p className="mb-2">{error}</p><Button variant="outline" size="sm" disabled={loading || disabled} onClick={props.onReload}>Riprova</Button>
        </div>}
        {hasMore && <Button variant="ghost" className="mt-3 w-full" disabled={loading || disabled} onClick={props.onMore}>{loading ? "Caricamento…" : "Mostra altre chat"}</Button>}
      </nav>
      <p className="border-t border-border/50 px-6 py-4 text-xs text-muted-foreground">Le tue chat, su questo computer.</p>
    </div>
  );

  return <>
    <aside className="hidden h-full w-[264px] shrink-0 border-r border-border/50 bg-card/40 md:block">{content}</aside>
    <dialog ref={dialog} aria-label="Cronologia delle chat" onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-0 h-dvh max-h-dvh w-[min(85vw,280px)] max-w-none border-0 border-r border-border bg-background p-0 text-foreground backdrop:bg-black/60">
      {content}
    </dialog>
  </>;
}
