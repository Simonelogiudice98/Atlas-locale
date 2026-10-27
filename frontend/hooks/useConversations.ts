"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { messageAdded, messagesReplaced, messageUpdated } from "@/store/chatSlice";
import { chatRequest, createConversation, getConversation } from "@/lib/conversations";
import { readChatStream } from "@/lib/chat-stream";
import type { Conversation } from "@/types/chat";

const PAGE_SIZE = 50;
const errorText = (error: unknown) => error instanceof Error ? error.message : "Operazione non riuscita.";

export function useConversations() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(state => state.chat.messages);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const listRef = useRef<Conversation[]>([]);
  const listVersion = useRef(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "opening" | "sending" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const locked = useRef(false);
  const active = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (more = false, signal?: AbortSignal) => {
    const version = ++listVersion.current;
    try {
      const offset = more ? listRef.current.length : 0;
      const response = await chatRequest(`?limit=${PAGE_SIZE}&offset=${offset}`, { signal });
      const data: { conversations: Conversation[] } = await response.json();
      if (signal?.aborted || version !== listVersion.current) return;
      const combined = more ? [...listRef.current, ...data.conversations] : data.conversations;
      listRef.current = [...new Map(combined.map(item => [item.id, item])).values()];
      setConversations(listRef.current);
      setHistoryError(null);
      setHasMore(data.conversations.length === PAGE_SIZE);
    } catch (error) {
      if (!signal?.aborted && version === listVersion.current) setHistoryError(errorText(error));
    } finally {
      if (!signal?.aborted && version === listVersion.current) setHistoryLoading(false);
    }
  }, []);

  const loadHistory = useCallback((more = false, signal?: AbortSignal) => {
    setHistoryLoading(true);
    setHistoryError(null);
    return fetchHistory(more, signal);
  }, [fetchHistory]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHistory(false, controller.signal);
    return () => { controller.abort(); active.current?.abort(); };
  }, [fetchHistory]);

  function begin(next: typeof status) {
    if (locked.current) return null;
    locked.current = true;
    const controller = new AbortController();
    active.current = controller;
    setStatus(next);
    setError(null);
    return controller;
  }

  function finish(controller: AbortController) {
    if (active.current !== controller) return;
    active.current = null;
    locked.current = false;
    setStatus("idle");
  }

  async function selectConversation(id: string) {
    const controller = begin("opening");
    if (!controller) return;
    try {
      const detail = await getConversation(id, controller.signal);
      if (controller.signal.aborted) return;
      dispatch(messagesReplaced(detail.messages));
      setSelectedId(id);
      setFailedText(null);
      setUncertain(false);
    } catch (error) {
      if (!controller.signal.aborted) setError(errorText(error));
    } finally { finish(controller); }
  }

  function newChat() {
    if (locked.current) return;
    setSelectedId(null);
    dispatch(messagesReplaced([]));
    setError(null);
    setFailedText(null);
    setUncertain(false);
  }

  async function send(content: string) {
    if (uncertain || !content.trim()) return;
    const controller = begin("sending");
    if (!controller) return;
    setHasContent(false);
    setFailedText(null);
    let id = selectedId;
    const previousCount = messages.length;
    try {
      if (!id) {
        const conversation = await createConversation(content, controller.signal);
        id = conversation.id;
        setSelectedId(id);
        void loadHistory();
      }
      dispatch(messageAdded({ id: crypto.randomUUID(), role: "user", content }));
      const response = await chatRequest(`/${id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, stream: true }), signal: controller.signal,
      });
      if (!response.body) throw new Error("Risposta del server senza stream.");
      const messageId = crypto.randomUUID();
      let added = false;
      await readChatStream(response.body, text => {
        if (!added) {
          dispatch(messageAdded({ id: messageId, role: "assistant", content: text }));
          added = true;
          setHasContent(true);
        } else dispatch(messageUpdated({ id: messageId, content: text }));
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      let committed = false;
      if (id) {
        try {
          const detail = await getConversation(id, controller.signal);
          dispatch(messagesReplaced(detail.messages));
          committed = detail.messages.length === previousCount + 2 && detail.messages.at(-2)?.content === content;
        } catch {
          setUncertain(true);
          setError("Non è possibile verificare il salvataggio. Ricarica la chat prima di inviare un altro messaggio.");
          return;
        }
      }
      if (!committed) {
        setFailedText(content);
        setError(`${errorText(error)} Il messaggio non è stato salvato: puoi riprovare.`);
      }
    } finally {
      if (!controller.signal.aborted) void loadHistory();
      finish(controller);
    }
  }

  async function deleteConversation(id: string) {
    const controller = begin("deleting");
    if (!controller) return;
    try {
      await chatRequest(`/${id}`, { method: "DELETE", signal: controller.signal });
      if (id === selectedId) {
        setSelectedId(null);
        dispatch(messagesReplaced([]));
        setFailedText(null);
        setUncertain(false);
      }
      await loadHistory(false, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setError(errorText(error));
    } finally { finish(controller); }
  }

  return {
    conversations, selectedId, messages, status, error, failedText, uncertain, hasContent,
    historyLoading, historyError, hasMore, loadHistory, selectConversation, newChat, send,
    deleteConversation, dismissError: () => setError(null),
  };
}
