# ARKITECNA MAILER (V1)

Applicazione web interna per **ARKITECNA** per l'invio scaglionato e controllato di campagne email outbound da un'unica casella SMTP Hostinger (`smtp.hostinger.com:465`).

---

## 1. Funzionalità Principali

- **Flusso essenziale:** Import CSV $\to$ Incolla template HTML $\to$ Personalizzazione azienda $\to$ Invio scaglionato SMTP.
- **Invio Anti-Burst:** Rigorosamente **massimo 1 email per esecuzione cron a livello globale**.
- **Acquisizione Atomica Lead:** Procedura memorizzata PostgreSQL con lock `FOR UPDATE SKIP LOCKED` (`claim_next_campaign_lead`) per eliminare ogni rischio di invii duplicati anche in caso di cron concorrenti.
- **Finestra Oraria e Giorni:** Invio dal Lunedì al Venerdì dalle 09:00 alle 18:00 (fuso orario `Europe/Rome`).
- **Segnaposto Supportati:** `{{companyName}}`, `{{azienda}}`, `{{email}}` sia nell'oggetto che nel corpo HTML.
- **Anteprima Sandboxed:** Visualizzazione immediata dell'HTML compilato in `iframe` isolato (`sandbox=""`).
- **Nessun Tracciamento Invasivo:** Nessun pixel spia, nessun redirect di link, nessun tracker di apertura/click, nessun CRM superfluo.

---

## 2. Requisiti di Sistema

- **Node.js:** v18.18+ (testato su Node v24+)
- **NPM:** v9+
- **Supabase:** Progetto PostgreSQL attivo con estensione `pgcrypto`
- **Casella Postale Hostinger:** SMTP abilitato con porta 465 (SSL)

---

## 3. Variabili d'Ambiente

Copia `.env.example` in `.env.local` (oppure configura le variabili su Vercel):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tuo-anon-key
SUPABASE_SERVICE_ROLE_KEY=tuo-service-role-key

# Hostinger SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=cesare@arkitecna.com
SMTP_PASS=la-tua-password-smtp
SMTP_FROM_NAME=Stefano Martini | ARKITECNA
SMTP_FROM_EMAIL=cesare@arkitecna.com

# Vercel Cron Secret
CRON_SECRET=stringa-segreta-casuale-32-caratteri

# Nome Applicazione
NEXT_PUBLIC_APP_NAME=ARKITECNA MAILER
```

> **NOTA DI SICUREZZA:** Il file `PASSWORD.TXT` è presente nella root del progetto per annotare le credenziali in locale ed è rigorosamente escluso da Git (`.gitignore`). Non committare mai chiavi private o password.

---

## 4. Installazione Database (Supabase)

1. Accedi alla dashboard del tuo progetto su [Supabase](https://supabase.com).
2. Apri il **SQL Editor**.
3. Apri il file [`supabase/all_migrations.sql`](file:///e:/Projects/@EMAIL%20BULK/supabase/all_migrations.sql), incolla l'intero script ed eseguilo (*Run*).
4. Lo script creerà:
   - Tabella `public.campaigns`
   - Tabella `public.campaign_leads` (con vincolo `UNIQUE(campaign_id, email)`)
   - Tabella `public.email_logs`
   - Trigger `set_updated_at`
   - Funzione atomica `public.claim_next_campaign_lead`

---

## 5. Creazione Utente Amministratore (Supabase Auth)

1. Nella dashboard di Supabase, vai in **Authentication** $\to$ **Users**.
2. Clicca su **Add User** $\to$ **Create user**.
3. Inserisci l'email desiderata (es. `cesare@arkitecna.com`) e imposta una password sicura.
4. Assicurati che l'utente sia confermato (*Auto Confirm User* abilitato).

---

## 6. Avvio in Locale

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

L'applicazione sarà accessibile su `http://localhost:3000`.

---

## 7. Configurazione SMTP Hostinger

1. Accedi a Hostinger cPanel / hPanel $\to$ **Email**.
2. Verifica i parametri:
   - Server SMTP: `smtp.hostinger.com`
   - Porta: `465` (SSL)
   - Utente: il tuo indirizzo email completo (`cesare@arkitecna.com`)
   - Password: la password della casella creata su Hostinger.
3. Nella web app, visita la sezione **Settings** (`/settings`) e clicca su **TEST SMTP CONNECTION** per verificare l'handshake.
4. Utilizza **SEND TEST EMAIL** per inviare un'email reale di collaudo.

---

## 8. Distribuzione su Vercel & Vercel Cron

1. Collega la repository GitHub `https://github.com/cesarenegro/-email_send` al tuo account Vercel.
2. Inserisci tutte le variabili d'ambiente nella sezione **Settings $\to$ Environment Variables** di Vercel.
3. Il file `vercel.json` incluso attiva automaticamente la chiamata schedulata ogni minuto:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/send",
         "schedule": "* * * * *"
       }
     ]
   }
   ```
4. Su Vercel, la variabile `CRON_SECRET` viene inoltrata automaticamente nelle intestazioni come `Authorization: Bearer <CRON_SECRET>`.

---

## 9. Flusso Operativo della Campagna

1. **Nuova Campagna:** Clicca su `Nuova Campagna` e imposta il nome (es. *Mobili Italia*).
2. **Personalizzazione Template:**
   - Inserisci l'oggetto: `Render per {{azienda}}`
   - Incolla il codice HTML preparato esternamente (vedi esempio in `examples/email-example.html`).
3. **Importazione CSV:**
   - Carica il file `.csv` (es. `examples/leads-example.csv`).
   - Mappa le colonne per `Azienda` ed `Email`.
   - L'app convalida i contatti, rimuove gli spazi, mette le email in minuscolo ed esclude i duplicati.
4. **Pianificazione:**
   - Imposta la finestra (default `09:00 - 18:00`), l'intervallo tra invii (default `240` secondi / 4 min) e il limite giornaliero (default `80`).
5. **Avvio:** Clicca **AVVIA CAMPAGNA**.
6. **Controlli:**
   - Clicca **METTI IN PAUSA** in qualsiasi momento per sospendere temporaneamente.
   - Clicca **RIPRENDI** per ripartire progressivamente senza invii a valanga retroattivi.
   - Al termine dei contatti, la campagna passa automaticamente in stato **COMPLETED**.
