// A network chunk may split an SSE event or a UTF-8 character.
export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onContent: (content: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let complete = false;

  function consume(frame: string) {
    const data = frame.split("\n")
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    const event = JSON.parse(data);
    if (event.type === "error") {
      throw new Error(event.error?.message || "Errore durante la generazione.");
    }
    if (event.type === "delta" && typeof event.text === "string") {
      content += event.text;
      if (content) onContent(content);
    } else if (event.type === "done") {
      if (typeof event.message?.content !== "string" || !event.message.content.trim()) {
        throw new Error("Il modello non ha prodotto una risposta testuale.");
      }
      onContent(event.message.content);
      complete = true;
    }
  }

  try {
    while (!complete) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary: number;
      while (!complete && (boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        consume(frame);
      }
      if (done) break;
    }
    if (!complete) throw new Error("La connessione si è interrotta prima della fine della risposta.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
