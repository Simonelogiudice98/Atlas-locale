# Jarvis backend per frontend React / Next.js

Tutti i comandi di questa guida vanno eseguiti dalla cartella `backend`. Dalla root del repository entrare prima con `cd backend`. I percorsi `src`, `tests`, `.env` e gli eventuali dati dei tool sono relativi a questa cartella.

Node 22+, dipendenze gia presenti. `npm run dev` avvia l'API su `http://127.0.0.1:3001`; `npm run dev:cli` mantiene la versione terminale. `.env` viene caricato automaticamente, senza sovrascrivere le variabili della shell.

Configurazione (vedi `.env.example`): OLLAMA_BASE_URL, OLLAMA_MODEL, PORT, CHAT_TIMEOUT_MS, CORS_ORIGINS. Avvia Ollama e installa il modello scelto. Il backend e limitato al loopback per uso locale.

## API

- `GET /api/health`: status `ok` o `degraded`, stato Ollama (`ready`, `unavailable`, `model_missing`), modello e strumenti collegati. HTTP 200 indica che l'API e raggiungibile, non che il modello sia pronto.
- `POST /api/chat`: `{ "messages": [{ "role": "user", "content": "Ciao" }], "stream": true }`. Includere tutta la cronologia user/assistant, ultimo messaggio user. Nessun database o salvataggio sul server. Max 100 messaggi, 32000 caratteri per messaggio, 256 KB totali.
- `stream: false`: risposta `{ "message": { "role": "assistant", "content": "..." } }`.
- `stream: true` (default): SSE tramite POST e fetch, non EventSource. Ogni evento termina con due newline: `event: delta` + `data: {"type":"delta","text":"..."}`. Eventi `tool_start` (`name`), `tool_end` (`name`, `status`: `ok`/`error`), `done` (`message` con testo completo), `error` (`error.code`, `error.message`). Ignorare commenti keep-alive. In caso di error, mantenere il testo parziale ma segnare la risposta incompleta; solo done certifica il completamento.

Il parser frontend deve accumulare frammenti, usare TextDecoder con stream e dividere sugli eventi completi: una lettura di rete non corrisponde necessariamente a un evento. Non aggiungere il testo di done ai delta: e la versione completa dello stesso messaggio.

```ts
const controller = new AbortController();
const response = await fetch('http://127.0.0.1:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, stream: true }),
  signal: controller.signal,
});
// Controllare response.ok prima di leggere response.body.
// Pulsante Stop: controller.abort().
```

Errori prima dello stream: HTTP 400/403/404/405/413/415/500/502/504 con `{ "error": { "code": "...", "message": "..." } }`. Dopo l'inizio dello stream: evento error, poi chiusura. Timeout totale configurabile (120 secondi default), sei round massimi con tool. Il ragionamento del modello resta interno. I risultati dei tool con isError vengono rimandati al modello per una risposta comprensibile.

CORS ammette solo localhost:3000 e 127.0.0.1:3000 di default; aggiungere altre origini esatte in CORS_ORIGINS. Con un proxy Next.js il browser puo chiamare /api/chat sul proprio sito. L'API locale non ha autenticazione e non va esposta pubblicamente.

Tool collegati: ora e meteo. Promemoria e ricerca web restano fuori da questa modifica. MCP viene inizializzato una volta, chiuso allo shutdown, e riceve il segnale di cancellazione; un tool puo avere gia eseguito il proprio lavoro quando arriva Stop.

## Verifica

`npm run typecheck`, `npm test`, `npm run build`. I test usano un Ollama simulato e coprono HTTP/SSE, validazione, CORS, cancellazione, risultati tool, limite del ciclo, parsing UTF8 e stream interrotto. Verificare separatamente il modello reale con una domanda semplice e una domanda sull'ora.

Protocollo upstream: https://docs.ollama.com/api/chat e https://docs.ollama.com/capabilities/streaming.
