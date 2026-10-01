# Jarvis locale

Il progetto contiene il backend Node.js per un assistente Ollama locale. Il frontend React / Next.js verra creato nella cartella `frontend`, accanto a `backend`.

```text
Jarvis-locale/
  backend/    # API Node.js, tool MCP, configurazione e test
  frontend/   # Da creare
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

Aprire un altro terminale nella cartella principale `Jarvis-locale` e creare il progetto:

```sh
npx create-next-app@latest frontend
```

Il frontend usera la porta 3000 e il backend la porta 3001.

Il contratto API e le istruzioni dettagliate sono in [backend/README.md](backend/README.md). Le specifiche precedenti sono conservate in [backend/specifiche-jarvis-locale.md](backend/specifiche-jarvis-locale.md); i loro percorsi si riferiscono alla cartella backend.
