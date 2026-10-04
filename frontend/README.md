# Atlas frontend

Interfaccia chat di Atlas, un progetto di apprendimento per collegare un'applicazione AI a un modello Ollama locale.

## Avvio

Prerequisiti: Node.js 22 o successivo, npm e il backend Atlas sulla porta 3001. Per configurare Ollama e il backend, consultare il [README principale](../README.md).

Dalla cartella `frontend`, installare le dipendenze con `npm ci`. Copiare `.env.example` in `.env.local`, con questo contenuto:

```dotenv
BACKEND_URL=http://127.0.0.1:3001
```

Avviare il frontend:

```bash
npm run dev
```

Aprire [http://localhost:3000](http://localhost:3000). Riavviare dopo aver modificato `.env.local`; non aggiungere questo file a Git.

## Funzionamento

- Next.js App Router e React per l'interfaccia; Tailwind CSS e componenti shadcn/ui per lo stile.
- Redux Toolkit per i messaggi, conservati in memoria e persi al ricaricamento.
- `POST /api/chat` inoltra la conversazione al backend usando `BACKEND_URL` sul server. Il browser non chiama direttamente Ollama.
- La chat richiede la risposta completa (`stream: false`), mostra un indicatore di attesa e gestisce gli errori con un banner richiudibile.

Streaming, annullamento, rendering Markdown, persistenza e azione del pulsante “Nuova chat” non sono ancora implementati.

## Verifica

```sh
npm run lint
npm run build
```

La compilazione usa `next/font/google` e può richiedere Internet per scaricare Geist. Il frontend da solo permette di vedere l'interfaccia; per ricevere risposte servono backend e Ollama.
