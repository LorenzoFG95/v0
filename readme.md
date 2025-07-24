# BancaDati - Piattaforma di Ricerca e Gestione Appalti Pubblici
## Panoramica del Progetto
BancaDati è una piattaforma web moderna per la ricerca, il monitoraggio e la gestione di gare d'appalto pubbliche in formato OCDS (Open Contracting Data Standard). L'applicazione consente agli utenti di esplorare le gare d'appalto, filtrarle in base a vari criteri, salvare i preferiti e visualizzare informazioni dettagliate su ciascuna gara.

## Tecnologie Utilizzate
- Frontend : Next.js, React, TypeScript, Tailwind CSS
- Backend : Supabase (PostgreSQL, Auth, Storage)
- Autenticazione : Supabase Auth
- Stile : Componenti UI personalizzati basati su shadcn/ui
- Deployment : Vercel (implicito dalla struttura del progetto)
## Architettura del Progetto
### Struttura delle Cartelle
```
├── app/                  # Struttura 
delle pagine Next.js (App Router)
│   ├── api/              # API routes
│   ├── auth/             # Pagine di 
autenticazione
│   ├── gare/             # Pagine di 
dettaglio gare
│   ├── preferiti/        # Pagina dei 
preferiti
│   ├── profile/          # Pagina del 
profilo utente
│   └── page.tsx          # Homepage/
Dashboard
├── components/           # Componenti 
React riutilizzabili
│   ├── auth/             # Componenti 
per l'autenticazione
│   ├── ui/               # Componenti 
UI di base
│   └── ...               # Altri 
componenti specifici
├── lib/                  # Funzioni di 
utilità e tipi
├── public/               # Asset 
statici
├── scripts/              # Script per 
il caricamento e l'elaborazione dei dati
├── styles/               # Stili 
globali
└── utils/                # Utility 
generiche
    └── supabase/         # Client 
    Supabase
```
### Flusso dei Dati
1. I dati delle gare d'appalto vengono caricati nel database Supabase tramite script dedicati
2. L'applicazione Next.js recupera i dati dal database tramite il client Supabase
3. I dati vengono visualizzati nell'interfaccia utente tramite componenti React
4. Le interazioni dell'utente (ricerca, filtri, preferiti) vengono gestite tramite state management e chiamate API
## Funzionalità Principali
### 1. Dashboard e Ricerca Gare
La dashboard principale consente agli utenti di:

- Visualizzare un elenco di gare d'appalto
- Cercare gare per parole chiave
- Filtrare gare per vari criteri:
  - Categoria opera
  - Data di pubblicazione/scadenza
  - Valore economico
  - Criterio di aggiudicazione
  - Regione/Città
  - Tipo di procedura
- Paginare i risultati
### 2. Dettaglio Gare
La pagina di dettaglio di una gara mostra:

- Informazioni generali (titolo, CIG, importo, scadenza)
- Dettagli della stazione appaltante
- Informazioni sulla procedura
- Dettagli tecnici e amministrativi
### 3. Sistema di Autenticazione
L'applicazione include un sistema completo di autenticazione:

- Registrazione utente
- Login
- Gestione profilo
- Recupero password
- Gestione dati aziendali
### 4. Gestione Preferiti
Gli utenti autenticati possono:

- Salvare gare nei preferiti
- Visualizzare l'elenco delle gare preferite
- Rimuovere gare dai preferiti
## Modello Dati
### Tabelle Principali 1. Gara
Contiene le informazioni principali sulle gare d'appalto:

- ID, CIG, CUP
- Descrizione, importo, date
- Collegamenti a ente appaltante, natura, criterio aggiudicazione 2. Lotto
Contiene informazioni sui lotti delle gare:

- ID, codice lotto, CIG
- Descrizione, valore, valuta
- Collegamenti a gara, natura, criterio aggiudicazione 3. Ente Appaltante
Contiene informazioni sulle stazioni appaltanti:

- Codice fiscale, partita IVA
- Denominazione, indirizzo
- Regione, città 4. Utente
Contiene informazioni sugli utenti registrati:

- ID, email
- Nome, cognome, telefono
- Data registrazione 5. Azienda
Contiene informazioni sulle aziende associate agli utenti:

- Codice fiscale, partita IVA
- Ragione sociale, indirizzo
- Collegamenti all'utente creatore
## Processi Principali
### 1. Registrazione e Autenticazione
1. L'utente si registra fornendo email, password e dati personali
2. Supabase Auth crea l'account utente
3. Viene creato un record nella tabella utente
4. L'utente può accedere con le credenziali
5. L'utente può aggiungere informazioni aziendali
### 2. Ricerca e Filtro Gare
1. L'utente accede alla dashboard
2. Imposta i filtri desiderati
3. Il sistema costruisce una query SQL complessa
4. I risultati vengono recuperati e visualizzati
5. L'utente può navigare tra le pagine dei risultati
### 3. Gestione Preferiti
1. L'utente visualizza una gara
2. Clicca sul pulsante preferiti
3. Il sistema salva l'ID della gara nei preferiti dell'utente
4. L'utente può visualizzare tutti i preferiti nella pagina dedicata
### 4. Visualizzazione Dettagli Gara
1. L'utente clicca su una gara
2. Il sistema recupera i dettagli completi della gara
3. I dati vengono visualizzati in una pagina dedicata
## Configurazione e Installazione
### Prerequisiti
- Node.js (versione 18 o superiore)
- npm o pnpm
- Account Supabase
### Configurazione Ambiente
1. Clona il repository
2. Installa le dipendenze:
   ```
   npm install
   ```
3. Crea un file .env.local con le seguenti variabili:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://
   your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-sup
   abase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabas
   e-service-role-key
   ```
### Configurazione Database
1. Accedi all'editor SQL di Supabase
2. Esegui gli script SQL forniti in components/database-setup-guide.tsx :
   - Script 1: Creazione tabelle
   - Script 2: Inserimento dati di lookup
   - Script 3: Inserimento dati di esempio
### Avvio Applicazione
```
npm run dev
```
L'applicazione sarà disponibile all'indirizzo http://localhost:3000 .

## Estensioni e Sviluppi Futuri
- Implementazione di notifiche per nuove gare
- Sistema di abbonamenti per accesso a funzionalità premium
- Integrazione con API esterne per dati aggiuntivi
- Dashboard analitica per statistiche sulle gare
- Sistema di esportazione dati in vari formati
## Conclusioni
BancaDati è una piattaforma completa per la gestione e il monitoraggio delle gare d'appalto pubbliche, con un'interfaccia moderna e funzionalità avanzate di ricerca e filtro. L'architettura basata su Next.js e Supabase garantisce prestazioni elevate e scalabilità, mentre il design responsive assicura un'esperienza utente ottimale su tutti i dispositivi.