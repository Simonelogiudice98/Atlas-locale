# Atlas locale

Il progetto contiene il backend Node.js per un assistente Ollama locale. Il frontend React / Next.js è nella cartella `frontend`, accanto a `backend`.

```text
Atlas-locale/
  backend/    # API Node.js, tool MCP, configurazione e test
  frontend/   # Chat Next.js, stato Jotai e BFF
```

## Avvio backend

Eseguire dalla cartella principale:

```sh
cd backend
npm run dev
```

L'API ascolta su `http://127.0.0.1:3001`. Avviare Ollama separatamente per generare risposte. Per la versione terminale usare `npm run dev:cli` dalla cartella `backend`.

Le dipendenze esistenti sono state spostate insieme al backend. Per un nuovo checkout, installarle con `npm ci` nella cartella `backend`.

## Frontend

Aprire un altro terminale nella cartella principale `Atlas-locale` e avviare il frontend:

```sh
cd frontend
npm run dev
```

Il frontend usa la porta 3000 e il backend la porta 3001. Per un nuovo checkout, eseguire `npm ci` nella cartella `frontend`. Configurare `frontend/.env.local` con `BACKEND_URL=http://127.0.0.1:3001` e riavviare il frontend dopo le modifiche alla configurazione.

Il contratto API e le istruzioni dettagliate sono in [backend/README.md](backend/README.md). Le specifiche precedenti sono conservate in [backend/specifiche-atlas-locale.md](backend/specifiche-atlas-locale.md); i loro percorsi si riferiscono alla cartella backend.
