# Atlas frontend

Interfaccia chat di Atlas con Next.js, React, Tailwind CSS, componenti shadcn/ui e Redux Toolkit.

## Avvio

Richiede Node.js 22.13+, npm e il backend Atlas. Dalla cartella `frontend`, eseguire `npm ci` e copiare `.env.example` in `.env.local`:

```dotenv
BACKEND_URL=http://127.0.0.1:3001
```

Avviare con `npm run dev` e aprire [http://localhost:3000](http://localhost:3000). Riavviare dopo le modifiche a `.env.local`; non aggiungere il file a Git.

## Conversazioni

- Sidebar fissa su desktop e pannello modale su mobile, con cronologia ordinata per ultimo aggiornamento e caricamento di altre chat a pagine di 50.
- “Nuova chat” apre una schermata vuota. La conversazione viene creata al primo invio; il titolo usa i primi 80 caratteri della domanda.
- Selezionando una conversazione vengono recuperati i messaggi da SQLite. Dopo un refresh è possibile riaprirla dalla sidebar.
- Eliminazione con conferma: rimuove la conversazione e tutti i messaggi.
- Durante invio, apertura o eliminazione le altre operazioni sulle chat sono disabilitate. Il pannello mobile gestisce focus, Escape e chiusura dopo la selezione.

Il browser chiama `/api/conversations`, `/api/conversations/:id` e `/api/conversations/:id/messages` sul BFF Next.js. La Route Handler inoltra le richieste al backend configurato in `BACKEND_URL`, compreso lo stream SSE. Il browser invia solo la nuova domanda; il backend carica la cronologia e salva ogni turno completato in SQLite. Redux contiene i messaggi attualmente visualizzati.

Lo streaming aggiorna una sola bolla, con indicatore di attesa fino al primo testo e scorrimento automatico se si è vicini al fondo. In caso di errore il frontend rilegge la conversazione prima di consentire un nuovo invio: i turni non salvati vengono rimossi dalla vista e possono essere ritentati con “Riprova invio”. Se non è possibile verificare il salvataggio, “Ricarica chat” permette di recuperare lo stato prima di continuare. La vecchia rotta `/api/chat` resta disponibile ma non viene usata dalla chat web.

Annullamento della generazione e rendering Markdown restano da implementare.

## Verifica

```sh
npm run lint
npx tsc --noEmit
npm run build
```

La compilazione usa `next/font/google` e può richiedere Internet per scaricare Geist. Per ricevere risposte reali servono backend e Ollama. Le verifiche browser della cronologia sono state eseguite su desktop e mobile con un backend SQLite temporaneo e un generatore simulato, includendo streaming, riapertura, eliminazione, errori e paginazione.

Su questa macchina la build Turbopack ha incontrato un errore interno avviando il processo CSS. La build è stata verificata con Webpack e certificati di sistema Windows, senza disabilitare TLS:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm run build -- --webpack
```
