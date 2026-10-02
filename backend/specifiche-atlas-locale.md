# Specifiche — Assistente Vocale Locale ("Atlas")

## 1. Obiettivo

Costruire un assistente vocale locale, ispirato a Atlas, usando esclusivamente modelli open-source eseguiti in locale (Ollama). Obiettivo primario: **apprendimento** — capire come si integrano LLM locali, tool/function calling, STT/TTS e orchestrazione in un sistema end-to-end. Non è richiesto un livello enterprise: un prototipo funzionante e comprensibile vale più di un sistema "perfetto" ma opaco.

## 2. Modalità di lavoro (istruzioni per Claude in questo progetto)

Questo progetto è fatto **principalmente per imparare**, non solo per arrivare al risultato. Quando si lavora su una nuova parte del sistema, in particolare quando si integra un componente nuovo (es. un server MCP, uno strumento come STT/TTS, una nuova API), Claude deve:

1. **Spiegare prima di implementare**: prima di scrivere codice per un componente nuovo, spiegare a parole cosa fa quel componente, come si inserisce nell'architettura e quali sono i concetti chiave da capire (es. cos'è un server MCP, come comunica con il client, cosa sono i tool schema)
2. **Segnalare se serve un tutorial**: questa regola vale per qualsiasi componente del progetto, non solo per MCP — installazione e primo utilizzo di Ollama, scelta/pull di un modello, setup di un ambiente STT/TTS, configurazione di una wake word, uso di un'API esterna (es. Brave Search), ecc. Se il concetto è complesso o poco intuitivo da spiegare solo a parole, dire esplicitamente "prima di procedere può avere senso guardare/leggere [tipo di risorsa]" — non è necessario trovare link precisi ogni volta, basta segnalare il tipo di risorsa utile (doc ufficiale, guida introduttiva, video) e il motivo per cui aiuterebbe. Vale anche per cose apparentemente semplici la prima volta che si incontrano (es. il primissimo `ollama run`): meglio segnalare la risorsa anche se il passo sembra banale, piuttosto che darlo per scontato
3. **Andare per gradi**: seguire le milestone (sezione 7) una alla volta, senza saltare avanti o proporre scorciatoie che uniscono più concetti insieme, anche se tecnicamente più veloci
4. **Verificare comprensione, non solo funzionamento**: dopo aver implementato un pezzo, va bene chiedere se è chiaro *perché* funziona così, non solo se il codice gira
5. **Perfezionamento successivo**: una volta che una parte è chiara e funzionante, è legittimo tornare indietro per renderla più solida/production-ready — ma questo è un passo separato, esplicito, non implicito nella prima implementazione

## 3. Scope

### In scope (v1)
- Interazione testuale con l'LLM tramite tool calling (MCP)
- Almeno 3 tool funzionanti (es. ora/data, meteo, promemoria)
- Persistenza minima dello stato (es. lista promemoria)
- Logging delle chiamate ai tool per capire cosa succede "sotto"

### In scope (v2 — dopo che v1 funziona)
- STT (speech-to-text) per input vocale
- TTS (text-to-speech) per output vocale
- Wake word ("Hey Atlas")

### Fuori scope (per ora)
- Multi-utente
- Deploy cloud / accesso remoto
- Vision/multimodale
- Automazioni smart home reali (si può simulare con un tool mock)

## 4. Requisiti funzionali

| ID | Requisito | Priorità |
|----|-----------|----------|
| RF1 | Il sistema riceve un input testuale e produce una risposta testuale coerente | Alta |
| RF2 | Il sistema riconosce quando serve invocare un tool invece di rispondere direttamente | Alta |
| RF3 | Il sistema espone almeno un tool di esempio (es. `get_time`) tramite un server MCP | Alta |
| RF4 | Il sistema mantiene una breve memoria conversazionale (ultimi N turni) | Media |
| RF5 | Il sistema gestisce l'errore quando un tool fallisce (non deve "impazzire") | Media |
| RF9 | Il sistema espone un tool `web_search` per recuperare informazioni aggiornate dal web | Alta |
| RF6 | (v2) Il sistema accetta input vocale e lo trascrive correttamente in italiano | Media |
| RF7 | (v2) Il sistema legge ad alta voce la risposta finale | Media |
| RF8 | (v2) Il sistema si attiva solo dopo una wake word | Bassa |

## 5. Requisiti non funzionali

- **Hardware target**: dichiarare fin da subito la macchina disponibile (VRAM/RAM), perché determina la scelta del modello — è il primo bivio da sciogliere
- **Latenza accettabile v1**: risposta testuale entro ~5-10s è ok per un prototipo
- **Trasparenza**: ogni chiamata a un tool deve essere loggata (nome tool, argomenti, risultato) — serve per capire il comportamento del modello, non solo per debug
- **Lingua**: italiano come lingua principale di interazione

## 6. Architettura

```
[Input: testo o voce]
        │
        ▼
   (v2) STT (Whisper / faster-whisper)
        │
        ▼
  Orchestratore (Node.js)
        │
        ▼
   Ollama API (chat + tools)
        │
        ├─── decide di rispondere direttamente ──► risposta
        │
        └─── decide di chiamare un tool
                     │
                     ▼
              Client MCP → Server MCP (tool)
                     │
                     ▼
              risultato del tool
                     │
                     ▼
              torna al modello → risposta finale
        │
        ▼
   (v2) TTS (Piper / Kokoro) → audio
```

Componenti:
1. **Orchestratore**: script Node.js che gestisce il loop conversazione → chiamata modello → eventuale tool call → risposta
2. **LLM**: servito da Ollama via API REST locale (`localhost:11434`)
3. **Tool layer**: uno o più server MCP che espongono le funzioni concrete
4. **(v2) Voce**: STT in ingresso, TTS in uscita, entrambi come processi separati richiamati dall'orchestratore

## 7. Scelte tecniche (v1)

| Componente | Scelta | Alternative da valutare |
|---|---|---|
| Runtime modello | Ollama | LM Studio (se preferisci GUI) |
| Modello | Qwen3.6 (9B o 27B a seconda della VRAM) | gpt-oss:20b, Llama-3-Groq-Tool-Use |
| Protocollo tool | MCP | function calling nativo di Ollama senza MCP (più semplice, meno riutilizzabile) |
| Orchestratore | Node.js | Python (se preferisci, ma tu hai più esperienza Node) |
| Persistenza | file JSON locale | SQLite se vuoi fare un salto di qualità |
| Ricerca web | Brave Search API (free tier, 2000 query/mese) | Tavily (digest già pronti per LLM), SerpAPI (a pagamento), DuckDuckGo non ufficiale (gratis ma fragile) |

## 8. Milestone (approccio incrementale)

1. **M1** — Ollama installato, modello scaricato, chiamata base via API funzionante (solo chat, nessun tool)
2. **M2** — Un server MCP minimo con un solo tool (es. `get_time`), il modello lo invoca correttamente
3. **M3** — Aggiungere 2-3 tool reali (meteo, promemoria con persistenza su file, `web_search` via Brave API). Per `web_search` va inclusa nel system prompt un'istruzione esplicita su quando usarlo (informazioni attuali, prezzi, notizie, o quando il modello non è sicuro che la propria conoscenza sia aggiornata) — senza questa indicazione il modello tende a cercare troppo poco o troppo, a seconda del caso
4. **M4** — Loop conversazionale con memoria breve e logging delle tool call
5. **M5** — STT integrato (input vocale → testo)
6. **M6** — TTS integrato (risposta → audio)
7. **M7** — Wake word

Ogni milestone deve essere **testabile in isolamento** prima di passare alla successiva — è il modo più utile per imparare cosa fa ogni pezzo.

## 9. Criteri di accettazione v1 (M1-M4)

- [x] Riesco a fare una domanda testuale e ricevere una risposta pertinente
- [x] Riesco a chiedere "che ore sono" e il modello chiama correttamente il tool invece di inventare la risposta
- [x] Se il tool fallisce (es. server MCP spento), il sistema non crasha e comunica l'errore
- [x] Ho un log leggibile di ogni tool call (nome, argomenti, risultato, timestamp)
- [ ] So spiegare a qualcun altro, a parole mie, perché il modello ha deciso di chiamare quel tool in quel momento

## 10. Domande aperte da sciogliere prima di iniziare

- Quanta VRAM/RAM ha la macchina su cui girerà? (determina il modello) → **Risolto**: NVIDIA 12GB VRAM, 32GB RAM. Modello scelto: `qwen3:14b` (9.3GB)
- Vuoi MCP fin da subito o preferisci partire con function calling nativo di Ollama e migrare a MCP dopo, per non sommare due curve di apprendimento insieme? → **Risolto**: MCP fin da subito
- Il primo tool "vero" che vuoi costruire — quale ti motiva di più da vedere funzionare? → **Risolto**: `get_time`

## 11. Stato di avanzamento

### M1 — Completata ✅

Chiamata base a Ollama via API funzionante (solo chat, nessun tool).

- Repo Git privata inizializzata, `.gitignore` a posto
- `tsconfig.json`: `rootDir: "src"`, `types: ["node"]`, `module`/`moduleResolution: "NodeNext"`
- Struttura: `src/interfaces/IChatInterface.ts` (`ChatMessage`, `RequestBody`, `ResponseBody`), `src/ollamaClient.ts` (`getEnvVar()`, `chat()`), `src/index.ts` (entry point)
- `.env` con `OLLAMA_BASE_URL` e `OLLAMA_MODEL=qwen3:14b`, letto via `--env-file=.env`
- Lancio in dev: `npx tsx src/index.ts` (richiede il flag `--env-file=.env` se non passato tramite script npm dedicato)

### M2 — Completata ✅

Loop di tool-calling end-to-end funzionante: il modello riceve la lista dei tool, decide autonomamente di chiamare `get_time`, il tool viene eseguito, il risultato viene rimandato al modello, e la risposta finale in linguaggio naturale viene stampata correttamente. Gestione errore e logging delle tool call implementati.

**Fatto in precedenza:**
- Dipendenze aggiunte: `@modelcontextprotocol/sdk` (v1.29.0), `zod`
- Struttura aggiunta:
  - `src/mcpServers/timeServer.ts` — server MCP con tool `get_time` (nessun parametro, restituisce `new Date().toLocaleString()`, locale di sistema non hardcoded), trasporto stdio, log su `console.error` (stderr, per non sporcare il canale protocollo)
  - `src/mcpClients/timeClient.ts` — client MCP dedicato (`atlas-time-client`), lancia il server via `npx tsx` (con nota commentata per la versione "finale" post-build con `node dist/...`)
- Script npm aggiunti: `dev`, `dev:time-server`
- Testato con successo sia via **MCP Inspector** sia via codice standalone — `get_time` risponde correttamente con data/ora corrente
- Commit effettuato a fine di questo checkpoint (server + client MCP funzionanti, tool ancora chiamato manualmente/hardcoded, non ancora da Ollama)

**Fatto in questa sessione:**
- `IChatInterface.ts` esteso con i tipi per il function calling di Ollama:
  - Request: `ChatTools` (rinominata da `Tools` per evitare conflitto con l'import `Tool` dell'SDK MCP), `ToolsFunction`, `Params`, `PropertySchema`
  - Response: `AssistantMessage` (estende `ChatMessage` con `tool_calls?`), `ToolCall`, `ToolCallFunction`
  - `Params.properties`/`required` resi opzionali e `properties` tipizzato con `Record<string, unknown>` (non più `Record<string, PropertySchema>`) per allinearsi ai tipi permissivi dell'SDK MCP, dopo diversi errori di compilazione dovuti al disallineamento tra la forma stretta desiderata e quella dichiarata dall'SDK. Scelta consapevole: velocità di modifica futura preferita a precisione statica massima. **Zod segnalato come miglioramento futuro** per validazione runtime, da valutare quando si introdurranno server MCP di terze parti (es. Brave Search in M3)
- `mcpToOllamaAdapter.ts` creato: `convertToOllama(tools: Tool[]): ChatTools[]` converte l'output di `listTools()` (formato MCP, campo `inputSchema`) nel formato richiesto da Ollama (campo `function.parameters`, wrapper `type: "function"`). **Nessun adapter di ritorno necessario**: la forma di `tool_calls` restituita da Ollama (`{ function: { name, arguments } }`) e l'input atteso da `callTool()` MCP (`{ name, arguments }`) coincidono già, senza bisogno di trasformazione
- `ollamaClient.ts` / `chat()` esteso:
  - Firma cambiata da `chat(prompt: string)` a `chat(messages: ChatMessage[], tools?: ChatTools[])` — necessario perché l'API di Ollama è stateless e richiede l'intera cronologia ad ogni chiamata, inclusa la seconda chiamata dopo l'esecuzione di un tool
  - Tipo di ritorno cambiato da `Promise<string>` a `Promise<AssistantMessage>`, per non perdere l'informazione di `tool_calls` quando il modello non risponde con testo
  - `body.tools` incluso condizionalmente via spread (`...(tools && {tools})`)
- `timeClient.ts` ristrutturato da script standalone (con `main()` di test) a modulo con funzioni esportate, per nascondere i dettagli MCP (Client, transport) a chi lo importa:
  - `connectTimeClient(): Promise<void>`
  - `getTimeTools(): Promise<Tool[]>`
  - `runTimeTools(name: string, args: Record<string, unknown>)` — tipo di ritorno lasciato inferito (non dichiarato esplicitamente `CallToolResult`) per evitare conflitti con l'unione di tipi più ampia che l'SDK dichiara per `callTool()`
  - vecchio `main()` di test rimosso
- `index.ts` aggiornato con `main()` async e gestione errori (`main().catch(...)` con `process.exit(1)`); primi 4 passi del flusso implementati e **testati con successo end-to-end**: connessione al client MCP → recupero tool (`getTimeTools`) → conversione (`convertToOllama`) → prima chiamata a `chat()` con tool inclusi. Verificato che il modello (`qwen3:14b`) riconosce correttamente quando serve `get_time` e genera `tool_calls` di conseguenza

**Osservazioni emerse dal test reale (da sistemare come rifinitura, non bloccanti):**
- La risposta di Ollama include un campo `thinking` (ragionamento del modello, essendo `qwen3:14b` un modello reasoning) non ancora tipizzato in `ChatMessage`/`AssistantMessage`
- Ogni elemento di `tool_calls` include anche un campo `id` (es. `call_pmjjjyv9`) non ancora presente in `ToolCall` — utile in futuro per correlare tool call multiple in parallelo
- Nessuno dei due punti sopra causa errori a runtime per ora, perché il parsing della response in `chat()` usa un'asserzione di tipo (`as ResponseBody`) senza validazione runtime — i campi extra "passano" comunque, semplicemente non sono tipizzati/accessibili in modo sicuro

**Fatto in questa sessione (completamento M2 + criteri di accettazione M1-M4):**
- `IChatInterface.ts`: aggiunto campo opzionale `name?: string` a `ChatMessage`, necessario per associare un messaggio `role: "tool"` al tool che ha prodotto il risultato (l'API di Ollama usa `name`, non serve `id` per ora — un solo tool per volta, `id` rimandato a quando servirà distinguere chiamate multiple dello stesso tool)
- `index.ts` — logica condizionale in `main()` completata:
  - `for` su `res.tool_calls` (gestito fin da subito come array, anche con un solo tool oggi, per non doverci tornare in M3 con più tool)
  - per ciascuna tool call: esecuzione via `runTimeTools`, narrowing di `result.content` (`Array.isArray` + controllo `block.type === "text"`, necessario perché l'SDK MCP tipizza `content` in modo permissivo/`unknown` essendo un'unione di forme diverse), estrazione di `block.text`, costruzione del messaggio `{ role: "tool", content, name }`, accumulo in `toolResultMessages: ChatMessage[]`
  - ricostruzione dell'array messaggi: `[...messages, res, ...toolResultMessages]` (messaggi originali + messaggio assistant con la tool call, che va reincluso perché il modello deve "ricordare" di averla richiesta + risultati dei tool)
  - seconda chiamata a `chat()` con l'array ricostruito, stampa di `response.content` (risposta finale in linguaggio naturale)
  - ramo `else` per il caso in cui il modello risponde direttamente senza `tool_calls`
- **Testato con successo end-to-end**: "che ore sono?" → il modello chiama `get_time` → riceve il risultato reale → risponde in linguaggio naturale ("Sono le 12:14:21 del 15 luglio 2026.")
- **Gestione errore (RF5)** — `try/catch` mirati sui tre punti di fallimento del loop, ciascuno con messaggio leggibile e `return` per interrompere `main()` in modo pulito (niente stack trace grezzo):
  - prima chiamata a `chat()` (verso Ollama)
  - `runTimeTools` (esecuzione del tool) — narrowing di `error: unknown` con `instanceof Error` per accedere a `.message` in sicurezza
  - seconda chiamata a `chat()` (dopo l'esecuzione del tool)
  - Testato simulando un fallimento (`throw` temporaneo in `runTimeTools`): messaggio d'errore leggibile confermato, nessun crash
- **Logging delle tool call (requisito di trasparenza, sezione 5)** — oggetto strutturato loggato su console per ogni tool call, sia in caso di successo (`status: "OK"`) che di fallimento (`status: "ERROR"`), con `timestamp` (`new Date().toISOString()`), `tool`, `args`, `result`. Scelta consapevole: solo console per ora, non su file — la persistenza su file JSON prevista in sezione 7 riguarda lo *stato* (es. promemoria in M3), non i log; introdurre la scrittura su file per i log è rimandato a quando Atlas diventerà un processo persistente/conversazionale (v2), dove analizzare i log *dopo* l'esecuzione avrà più valore
- **Commit effettuato** a fine sessione (loop tool-calling end-to-end + gestione errore + logging)
- **Criteri di accettazione v1 (M1-M4, sezione 9): tutti soddisfatti** ✅, incluso "so spiegare a parole mie perché il modello ha chiamato quel tool" (discusso a voce: incrocio tra descrizione del tool esposta via MCP e riconoscimento da parte del modello che la propria conoscenza statica non basta a rispondere; comportamento appreso durante il training per il function calling, non hardcoded lato orchestratore)

### M3 — In corso 🔄

Da sezione 8: aggiungere 2-3 tool reali (meteo, promemoria con persistenza su file, `web_search` via Brave API). Per `web_search`, includere nel system prompt un'istruzione esplicita su quando usarlo (informazioni attuali, prezzi, notizie, o incertezza sulla propria conoscenza) — a differenza di `get_time`, qui il confine "serve il tool o no" è più sfumato, quindi la sola `description` del tool potrebbe non bastare a guidare bene la decisione del modello.

**Ordine scelto per i tre tool**: difficoltà crescente — meteo → promemoria → `web_search`. Motivazione: meteo introduce solo la chiamata API esterna; promemoria aggiunge la persistenza su file JSON e un server con più tool; `web_search` combina API esterna con il problema più sottile di guidare la decisione del modello via system prompt. L'ordine risolve anche il punto del routing multi-client in modo naturale, incontrandolo già al secondo tool invece che rimandarlo al più complesso dei tre.

**Fatto in sessione precedente — tool meteo (`weatherServer.ts`):**
- API scelta: **Open-Meteo** — nessuna API key richiesta, HTTP GET puro, coerente con l'approccio a basso attrito già seguito nel progetto
- Nuovo `src/mcpServers/weatherServer.ts`, stesso scheletro di `timeServer.ts` (stesso pattern `main()` async + `main().catch()` con `process.exit(1)`, stesso log su `console.error`)
- Tool `get_weather` con un parametro obbligatorio (`city: string`, con `.describe()`), primo tool del progetto con input — a differenza di `get_time` che non aveva parametri
- **Flusso a due chiamate HTTP asincrone in sequenza**, la seconda dipendente dal risultato della prima (concetto nuovo rispetto a `get_time`):
  1. Geocoding (`geocoding-api.open-meteo.com/v1/search`, parametri `name`, `count=1`, `language=it`) — nome città → `{ latitude, longitude, name }`
  2. Forecast (`api.open-meteo.com/v1/forecast`, parametro `current=temperature_2m,wind_speed_10m,relative_humidity_2m`) — coordinate → meteo attuale
- **Prima introduzione di validazione runtime con Zod sulle risposte di un'API esterna** (`GeocodingResponseSchema`, `WeatherResponseSchema`, con `z.object`/`z.array`/`.optional()`), con tipi derivati tramite `z.infer` invece di interfacce scritte a mano. Scelta deliberata, diversa dal pattern `as ResponseBody` usato in M2 per Ollama: motivata dal fatto che qui i dati arrivano da un servizio esterno non controllato dal progetto, mentre Ollama gira in locale ed è un fornitore conosciuto/affidabile
- `results` reso `.optional()` nello schema di geocoding (può mancare se la città non viene trovata), `current` invece obbligatorio nello schema forecast (se le coordinate sono valide, ci si aspetta sempre presente)
- **Gestione errori per propagazione**, coerente con la strategia già stabilita in M2: nessun `try/catch` locale nel tool — `fetch` lancia già da sola in caso di fallimento di rete, va solo controllato esplicitamente `.ok` per gli errori HTTP applicativi (dato che `fetch` non tratta uno status 4xx/5xx come eccezione). Tre punti di `throw` espliciti: geocoding fallito (HTTP), città non trovata (risultati vuoti), forecast fallito (HTTP). Le eccezioni risalgono fino al `try/catch` lato orchestratore (lo stesso già scritto per `runTimeTools` in M2, esteso e riusato per il client meteo)
- `registerTool` usato al posto del deprecato `.tool()` (verificato: `.tool()` esiste ancora in `@modelcontextprotocol/sdk` v1.29.0 ma è deprecato a favore di `registerTool`)
- Nessuna nuova dipendenza npm: `fetch` nativo (Node 18+), `zod` e `@modelcontextprotocol/sdk` già installati da M2
- Return del tool: stesso formato `{ content: [{ type: "text" as const, text: ... }] }` di `timeServer.ts` — `as const` necessario perché l'SDK MCP si aspetta un union di stringhe letterali (`"text" | "image" | ...`) per il campo `type`, non `string` generico; non ricreato un enum/union locale perché il tipo è già di proprietà dell'SDK, non del progetto

**Fatto in questa sessione — test, `weatherClient.ts`, routing multi-client, fix system prompt:**

- **`weatherServer.ts` testato con successo via MCP Inspector** (nota pratica: con Inspector v0.15, il comando/argomenti vanno impostati a mano nella UI — `npx` come Command, `tsx src/mcpServers/weatherServer.ts` come Arguments — lanciato dalla root del progetto). Tre casi verificati:
  1. **Discovery**: schema esposto correttamente, parametro `city` visibile con la sua `.describe()`
  2. **Successo**: `city: "milano"` → flusso completo geocoding → forecast → dati plausibili restituiti
  3. **Errore gestito**: città inventata (`"Xyzabc123"`) → errore pulito "Città non trovata", nessun crash — a differenza di un tentativo con `city` vuoto, che viene bloccato prima ancora a livello di validazione dello schema Zod/MCP (`Invalid input: expected string, received undefined`), utile per capire la differenza tra errore di validazione input (a monte, non esegue il tool) ed errore applicativo (dentro il tool)
- **`weatherClient.ts` scritto** da Simone, stesso pattern di `timeClient.ts`: `connectWeatherClient()`, `getWeatherTools()`, `runWeatherTools()`, client MCP dedicato `"atlas-weather-client"`
- **`toolRouter.ts` creato** — nuovo modulo con la responsabilità di orchestrare "quali client esistono" e "quale funzione usare dato il nome di un tool", separata dai singoli client MCP e da `index.ts`:
  - `type RunToolFn = typeof runTimeTools` — la forma della funzione (parametri + ritorno) usata per tipizzare il valore della mappa; scelto `typeof` (intera firma) invece di `ReturnType<typeof runTimeTools>` (solo il tipo di ritorno), perché il valore della mappa dev'essere la funzione stessa, chiamabile con `(name, args)`
  - `connectAllClients(): Promise<void>` — connette `timeClient` e `weatherClient` in parallelo con `Promise.all`. **Elenco client volutamente hardcoded**: la "dinamicità" di questa milestone riguarda il routing nome-tool → funzione (punto 2 del problema), non la scoperta automatica di quali client esistono nel progetto (punto 1, che resta una scelta esplicita dello sviluppatore) — distinzione chiarita esplicitamente in sessione. Una configurazione dinamica dei client (tipo file di config con path dei server MCP) è stata considerata ma giudicata over-engineering per lo scopo di apprendimento con 2-3 tool locali
  - `getAllTools(): Promise<Tool[]>` — unisce con spread operator gli array `Tool[]` di `getTimeTools()` e `getWeatherTools()` (lanciate in parallelo via `Promise.all` + destructuring), per fornire a `convertToOllama()` l'elenco completo degli schemi di tutti i client
  - `buildToolMap(): Promise<Record<string, RunToolFn>>` — per ciascun client, scorre l'array di `Tool[]` ottenuto e popola la mappa `mappa[tool.name] = runXTools` (`for...of`, coerente con l'approccio "tratta come lista fin da subito" già usato per `tool_calls` in M2). Il vantaggio pratico verificato a voce: se in futuro `weatherServer.ts` esponesse un secondo tool, `buildToolMap()` non richiederebbe nessuna modifica
  - Vincolo implicito annotato: `buildToolMap()`/`getAllTools()` presuppongono che i client siano già connessi (devono quindi essere chiamate dopo `connectAllClients()`)
- **`index.ts` aggiornato per usare il routing dinamico**:
  - `connectAllClients()` e `buildToolMap()` chiamate una sola volta all'avvio di `main()` (la mappa non cambia durante l'esecuzione, quindi non ha senso ricostruirla ad ogni tool call)
  - `getAllTools()` sostituisce la vecchia `getTimeTools()` diretta, per costruire `ollamaTools` con lo schema di **tutti** i tool disponibili
  - Dentro il `for` sui `tool_calls`, la chiamata hardcoded a `runTimeTools(...)` sostituita con lookup dinamico: `const runFn = toolMap[tool.function.name]`, seguito da chiamata `await runFn(...)`
  - **Nuovo caso di errore gestito (coerente con RF5)**: se `tool.function.name` non è presente in `toolMap` (`runFn` è `undefined`), `throw new Error("Tool sconosciuto: " + tool.function.name)` **prima** di provare a invocare la funzione — l'eccezione risale al `try/catch` già esistente nel `for`, riusando gratuitamente il logging strutturato (`status: "ERROR"`) già scritto in M2, senza duplicare nulla
- **`Role` tipizzato esplicitamente** in `IChatInterface.ts`: campo `role` di `ChatMessage` cambiato da `string` generico a union type `"user" | "assistant" | "system" | "tool"` (i quattro valori individuati scorrendo il codice esistente), estratto come `type Role` a parte. Conseguenza pratica: un oggetto letterale tipo `{ role: "tool", ... }` costruito senza annotare il tipo della variabile viene ora inferito da TypeScript come `role: string`, non compatibile con `ChatMessage` — risolto annotando esplicitamente il tipo della variabile (es. `let el: ChatMessage = {...}` o `as ChatMessage`) invece di allargare di nuovo il tipo di `Role`
- **Bug reale scoperto e risolto in fase di test end-to-end**: dopo l'esecuzione del tool, la seconda chiamata a `chat()` completava correttamente (verificato con log di debug temporanei prima/dopo la chiamata), ma `response.content` risultava una stringa vuota (`""`). Ispezionando l'intera risposta (non solo `.content`) è emerso che il modello (`qwen3:14b`, reasoning) aveva scritto l'intera risposta naturale dentro il campo `thinking` invece che in `content` — comportamento coerente con l'osservazione non bloccante già annotata a fine M2 (campo `thinking` non tipizzato), qui manifestatosi concretamente
  - **Fix**: introdotto il primo **system prompt** del progetto, come primo elemento dell'array `messages` (`role: "system"`), con un'istruzione esplicita che dice al modello di scrivere sempre la risposta finale nel campo di risposta normale dopo aver ricevuto un risultato da un tool, non solo nel ragionamento interno
  - **Verificato via test**: dopo l'aggiunta del system prompt, `content` contiene correttamente la risposta in linguaggio naturale (es. "Sono le 12:39 del 17 luglio 2026."), con `thinking` che torna a contenere solo il ragionamento
  - Nota onesta annotata in sessione: non è una garanzia assoluta con modelli reasoning, ma è la leva corretta; lo stesso meccanismo di system prompt tornerà utile per `web_search` (già previsto in sezione 8 delle specifiche)
- **Testato con successo end-to-end**: routing dinamico verificato sul percorso `get_time` (richiesta → `toolMap["get_time"]` → `runTimeTools` → risposta naturale corretta in `content`). Verifica esplicita del percorso `get_weather` tramite lo stesso meccanismo di routing rimasta da fare come primo passo della prossima sessione

**Rifinitura identificata ma deliberatamente rimandata:**
- **Le connessioni MCP (`timeClient`/`weatherClient`) non vengono mai chiuse esplicitamente** — ogni `StdioClientTransport` lancia un processo figlio che resta vivo a fine `main()`, impedendo al terminale di tornare al prompt da solo (richiede conferma manuale di terminazione). Discusso esplicitamente: la soluzione dipende dalla piega architetturale futura del progetto (processo singolo "lancia ed esegui" vs processo persistente/conversazionale previsto in v2) — non un bug bloccante per l'obiettivo di questa sessione, rimandato a quando si deciderà quella direzione

**Non ancora fatto (prossimi step M3):**
- Verifica esplicita del routing su `get_weather` (cambiare a mano il messaggio utente in `index.ts` e testare)
- Rimuovere i `console.log` di debug temporanei usati per diagnosticare il bug di `content` vuoto
- Rendere il messaggio utente iniziale non più hardcoded (oggi `"che ore sono?"` fisso in `index.ts`)
- Poi, in ordine: tool promemoria (persistenza su file), poi `web_search` via Brave API
- Aggiornare eventualmente `Role`/tipizzazioni se emergeranno altri valori con i prossimi tool

Rifiniture non bloccanti rimaste in sospeso da M2 (ancora valide): valutare se aggiungere `thinking?` a `ChatMessage`/`AssistantMessage` e `id` a `ToolCall`/messaggi tool (utile se in futuro un tool restituirà più blocchi di contenuto, o se serviranno più tool call parallele dello stesso tool).

### M4–M7 — Non iniziate (M4, memoria conversazionale breve, è in parte già implicita nel loop attuale che passa la cronologia completa a ogni chiamata — da formalizzare quando si affronterà esplicitamente)
