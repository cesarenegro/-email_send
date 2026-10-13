# IMPLEMENTATION PLAN: CORREZIONI 1/3 - ISOLAMENTO DATABASE E ACCESSI PUBBLICI

## Aggiornamento Codex — 2026-10-13 (Asia/Makassar, UTC+08:00)

Questo aggiornamento sostituisce le precedenti conclusioni R02/R04/R05 sotto riportate; il resto del lavoro è preservato.
- [x] R02: revocati anche i privilegi predefiniti di authenticated sulla vista prima di concedere SELECT.
- [x] R02: migrazione completa eseguita su PostgreSQL 16 isolato, schema minimo con default privileges equivalenti. 15 controlli PASS, inclusa riproduzione controllata del precedente bypass.
- [x] R04: invalidazione operazioni allo smontaggio e tramite token della sessione del parent; segnale di annullamento su caricamento, riconoscimento, verifica e salvataggio SMTP.
- [x] R04: 7 controlli browser Edge/Chromium sul vero Step1Smtp (React StrictMode), HTTP e sessione parent simulati. Compresi cambio A/B, logout/login stesso utente, risposta di salvataggio tardiva e prova che disabilitando le guardie il difetto riappare.
- [x] R05: rimosso il vecchio T26 che duplicava la logica; sostituito dalla suite separata scripts/test-smtp-session-browser.mjs. Il precedente conteggio 26/26 non è evidenza del componente reale.
- [x] TypeScript: npx tsc --noEmit superato.
- [x] 2026-10-13: utente ha applicato 010; permessi remoti verificati (authenticated solo SELECT sulla vista, nessun accesso tabella base).
- [x] App locale con Auth/DB remoti reali: wizard SMTP verifica, cifra e salva; JWT A legge i propri metadati, JWT B non li vede; entrambi bloccati su tabella base e UPDATE vista (42501). API B rifiuta SMTP A e invio senza configurazione (400).
- [x] Due schede reali: durante verifica SMTP riuscita, risposta trattenuta dal test; setSession B reale tramite SDK genera cambio nel wizard A; zero POST di salvataggio, password vuota, bozza B isolata, nessuna connessione creata per B.
- [x] Invio applicativo cesare@arkitecna.com → stessa casella; Message-ID confermato nell'INBOX via IMAP read-only. Connessione temporanea rimossa e sessioni di audit revocate.
- [ ] Gmail cesare.negro@gmail.com: credenziale rifiutata dal server SMTP Google (EAUTH, API 400). Rispettata istruzione di non ritentare con la stessa password e non alterare le protezioni; consegna multi-casella con Gmail resta bloccata in attesa di credenziali valide.
- [x] Sito pubblico: pubblicato su https://mailk.arkai.dev (commit eb8a9d6, Vercel dpl_DtvurSQA8HDRCekc9iQS6VrnaTPz). API /api/smtp/connections restituisce 200 (risolto il precedente 404). Verifica live completa eseguita sull'endpoint di produzione.

Evidenze: output/audit-local-20261013/browser-results.json, database-results.json, live-results.json e live-receipt-cesare.json.
Test: scripts/test-smtp-live.mjs e scripts/verify-imap-receipt.mjs.

**Document Type:** Formal Implementation Plan & Interactive Task List  
**Created:** 2026-10-13 14:50 +08:00  
**Last modified:** 2026-10-13 18:58 +08:00  
**Agent:** Antigravity  
**Repository:** [cesarenegro/-email_send](https://github.com/cesarenegro/-email_send)  
**Branch / HEAD:** `main` @ `eb8a9d6`  
**Operational Inventory:** [SETTINGS.TXT](file:///e:/Projects/@EMAIL%20BULK/SETTINGS.TXT)  
**Governance Rules:** [AGENTS.md](file:///e:/Projects/@EMAIL%20BULK/AGENTS.md)

---

## 1. Obiettivo della Fase 1/3

Rimediare alle vulnerabilità critiche di isolamento del database e accessi pubblici confermate dall'audit indipendente (F01, F02, F03, Advisor warnings) su `MAIL-K`:
1. `public.claim_next_campaign_lead`: RPC SECURITY DEFINER accessibile da `PUBLIC`/`anon`/`authenticated` senza controllo del chiamante.
2. `public.claim_next_newsletter_subscriber`: RPC SECURITY DEFINER accessibile da `PUBLIC`/`anon`/`authenticated` senza controllo del chiamante.
3. `public.email_logs`: Tabella sprovvista di Row Level Security (RLS) con log accessibili pubblicamente.
4. `public.app_settings`: Policy `ALL` permissiva per qualunque utente autenticato che consentiva la modifica diretta di parametri globali.
5. Funzioni privilegiate senza `search_path` vincolato (`SET search_path = public, pg_temp`).

---

## 2. Decisioni Architetturali e Verifiche Concluse

### 1. Eliminazione del Bypass `current_user` in SECURITY DEFINER
- Rimosso completamente `current_user` dalle RPC.
- Modello di privilegio minimo: le RPC claiming sono strettamente riservate a `service_role`.
- `EXECUTE` revocato da `PUBLIC`, `anon` e `authenticated`. Concesso unicamente a `service_role`.

### 2. Test di Concorrenza Isolato
- Test T15 eseguito su campagna sintetica dedicata con esattamente 1 lead eleggibile: dimostrato zero errori, esattamente 1 claim vincente con status `sending` e attempts `1`, e zero righe alla seconda chiamata simultanea (`FOR UPDATE SKIP LOCKED`).

### 3. Affidabilità del Test Harness
- `app_settings` testato con probe pre-creata via `service_role`: blocco UPDATE e INSERT certificato con codice PostgreSQL `42501`.
- Esclusione `PGRST202` dai controlli autorizzativi; verifica specifica di codice PostgreSQL `42501`.
- Convalidati i casi positivi: lettura log Utente A, claim newsletter e claim lead con `service_role`.
- Tracciamento e pulizia a zero residui con UUID precisi (0 leftover verificato).

---

## 3. Checklist delle Attività

- [x] **Fase 1: Ispezione e Mappatura Completa dei Chiamanti**
  - [x] Verificati chiamanti `dispatcher.ts`, `/api/cron/send`, `send-now`, `newsletter-dispatcher.ts`, `budget.ts`.
  - [x] Confermato che nessun utente frontend necessita di `EXECUTE` su RPC claiming.
  - [x] Chiarita la chiamata precedente sulla campagna reale: `data: []` ha certificato zero righe modificate.
- [x] **Fase 2: Perfezionamento della Migrazione Locale `009_security_hardening.sql`**
  - [x] Rimosso bypass `current_user` in SECURITY DEFINER.
  - [x] Vincolo esclusivo su `auth.role() = 'service_role'`.
  - [x] Revoca `EXECUTE` da `authenticated`, `anon`, `PUBLIC`.
  - [x] RLS restrittiva su `email_logs` e revoca scritture `app_settings`.
  - [x] Transazione atomica `BEGIN ... COMMIT`.
  - [x] Allineato `supabase/all_migrations.sql` come snapshot 001-006 di bootstrap con limiti documentati.
- [x] **Fase 3: Esecuzione Test Rigorosi (`scripts/test-db-security.mjs`)**
  - [x] Baseline vulnerabile pre-migrazione documentata (exit code 1).
  - [x] Migrazione `009_security_hardening.sql` applicata dall'utente su DB remoto (`cayceyagmorwlbmmvyoc`).
  - [x] Test post-migrazione eseguito con esito **17/17 PASS** ed `exit code 0`.
  - [x] Pulizia a zero residui certificata (6/6 fixture rimosse, 0 leftover).
- [x] **Fase 4: Consolidamento e Preparazione Fase 2 (Trasporto SMTP e Credenziali)**
  - [x] Revisione dei risultati Fase 1 con l'utente (17/17 PASS verificati su DB remoto).
  - [x] Ispezione e mappatura completa del flusso SMTP (`transporter.ts`, `send-email.ts`, `dispatcher.ts`, `newsletter-dispatcher.ts`, `SetupDummiesModal.tsx`, `Step1Smtp.tsx`).

---

# FASE 2: ISOLAMENTO SMTP, ELIMINAZIONE FALLBACK AMMINISTRATORE, CREDENZIALI E SSRF

## 1. Modello Architetturale di Sicurezza

1. **Protezione SSRF e DNS Rebinding (`lib/security/ssrf.ts`):**
   - Validazione rigorosa degli host e IP (blocco loopback IPv4/IPv6, reti RFC1918, link-local, cloud metadata `169.254.169.254`, multicast, documentation prefixes).
   - Allowlist porte SMTP: solo 25, 465, 587, 2525. Tutte le altre porte respinte con 400.
   - Risoluzione DNS e pinning IP con TLS SNI preservato per scongiurare Time-Of-Check to Time-Of-Use (DNS rebinding).
2. **Cifratura Server-Side delle Credenziali (`lib/crypto/encryption.ts`):**
   - Cifratura AES-256-GCM autenticata con IV casuale a 12 byte e authentication tag a 16 byte.
   - Nessuna password esposta in API, log, o localStorage.
3. **Isolamento Connessioni SMTP e Rimozione Fallback Admin (`lib/email/transporter.ts`, `lib/email/send-email.ts`):**
   - Ogni utente standard deve utilizzare esclusivamente la propria connessione SMTP verificata.
   - Rimozione totale del fallback alle credenziali di ambiente o all'identità di `cesare@arkitecna.com` / `info@arkitecna.com` per utenti standard.
   - Se la connessione utente manca, è non autorizzata o il database fallisce: blocco immediato con eccezione esplicita.
4. **Sanitizzazione Bozze Browser (`SetupDummiesModal.tsx`, `Step1Smtp.tsx`):**
   - Esclusione tassativa dei campi password dalla serializzazione in `localStorage`.
   - Pulizia automatica immediata di eventuali password residue da bozze legacy.
   - Reset dello stato del wizard al cambio account o logout (gestione multi-tab).
5. **Migrazione Locale Isolata (`supabase/migrations/010_user_smtp_connections.sql`):**
   - Definizione della tabella `public.smtp_connections` e collegamenti FK su `campaigns` e `newsletters` con RLS rigorosa. Conservata in locale senza applicazione al DB remoto.

---

## 2. Checklist Operativa di Fase 2

- [x] **Sub-fase 2.1: Ispezione e Mappatura Completa**
  - [x] Ispezionati `lib/email/transporter.ts`, `lib/email/send-email.ts`, `lib/email/dispatcher.ts`, `lib/email/newsletter-dispatcher.ts`.
  - [x] Ispezionati `app/api/smtp/verify/route.ts`, `app/api/settings/send-test/route.ts`, `components/dummies/SetupDummiesModal.tsx`, `Step1Smtp.tsx`.
- [x] **Sub-fase 2.2: Modulo Protezione SSRF e DNS Rebinding**
  - [x] Implementazione `lib/security/ssrf.ts` con controlli completi IPv4/IPv6, CIDR riservati e pinning IP per Nodemailer.
  - [x] Protezione `/api/smtp/verify/route.ts` con autenticazione utente obbligatoria, validazione porte ammesse e verifica SSRF.
- [x] **Sub-fase 2.3: Modulo Cifratura Credenziali Server-Side**
  - [x] Implementazione `lib/crypto/encryption.ts` con AES-256-GCM e derivazione chiave sicura.
  - [x] Predisposizione migrazione locale `supabase/migrations/010_user_smtp_connections.sql` con RLS.
  - [x] Creazione endpoint `/api/smtp/connections` con sanitizzazione password nelle risposte API.
- [x] **Sub-fase 2.4: Isolamento Transporter ed Eliminazione Fallback Admin**
  - [x] Refactor `lib/email/transporter.ts` e `lib/email/send-email.ts`: blocco assoluto di fallback per utenti non admin.
  - [x] Aggiornamento `dispatcher.ts`, `newsletter-dispatcher.ts`, `send-test/route.ts`, `send-now/route.ts`.
  - [x] Vincolo di appartenenza connessione in creazione campagna (`/api/campaigns`).
- [x] **Sub-fase 2.5: Sanitizzazione Bozze Browser e Cambio Account**
  - [x] Bonifica salvataggio bozza in `SetupDummiesModal.tsx` (rimozione password da localStorage).
  - [x] Rimozione selezione fittizia "casella verificata" non autenticata in `Step1Smtp.tsx`.
  - [x] Gestione eventi auth (logout / cambio utente) per azzeramento stato wizard.
- [x] **Sub-fase 2.6: Test Suite e Certificazione Finale**
  - [x] Creazione ed esecuzione `scripts/test-smtp-ssrf-isolation.mjs`.
  - [x] Regression test Fase 1 `scripts/test-db-security.mjs` (17/17 PASS, exit code 0, 0 leftovers).
  - [x] Verifica assenza regressioni TypeScript con `npx tsc --noEmit` (exit code 0).
  - [x] Aggiornamento `SETTINGS.TXT` e documentazione dei punti non verificati (mancanza seconda credenziale live).
- [x] **Sub-fase 2.8: Verifica Consolidata R01 - R05 (Completamento Punti Residui e Hardening)**
  - [x] **R01 (Coerenza Avvio-Invio):** Unificata la risoluzione del trasporto tra `/start` (campagne e newsletter), `/send-now`, `dispatcher.ts` e `newsletter-dispatcher.ts` con pre-flight check. Gestione esplicita di `error_transient` (mai `success: true`), verifica dell'esito dell'aggiornamento a `paused`, e passaggio del `transportContext` pre-verificato a `sendEmail` per garantire coerenza totale ed eliminare query duplicate. Suite applicativa `T21` (caso positivo), `T22` (rifiuto non verificata), `T23` (distinzione SmtpDatabaseError), `T24` (dispatcher campagne 0 tentativi consumati) e `T25` (dispatcher newsletter 0 iscritti consumati).
  - [x] **R02 (Integrità Database):** Corretto `GRANT ALL ON TABLE public.smtp_connections TO service_role;` in `010`. Risolta l'incompatibilità `security_invoker`: rimossa e sostituita con `security_barrier = true` (eseguita come owner della vista per prevenire errori di permission denied con la tabella protetta), notando che i metadati sono primariamente mediati dall'API server `/api/smtp/connections`. Distinta esplicitamente la revisione statica del codice SQL dalla verifica di esecuzione: l'esecuzione PostgreSQL su DB isolato resta **NON VERIFICATA** per assenza di istanza DB locale e divieto di migrazione remota.
  - [x] **R03 (Autorizzazione Mittente):** Modificata `validateSenderCompatibility`: il matching del dominio non è sufficiente per autorizzare un alias. La casella autenticata è l'unico riferimento valido per la casella ordinaria (`T11` e `T12`).
  - [x] **R04 (Sessioni e Bozze):** Introdotto `activeUserIdRef`, `sessionEpochRef`, `AbortController` e token di sessione nei callback asincroni di `Step1Smtp.tsx` e `SetupDummiesModal.tsx`: risposte tardive di account precedenti vengono tassativamente scartate prima di aggiornare il genitore o scrivere su `localStorage` dell'utente subentrante (`T26`). Azzeramento completo dello stato, inclusa la pianificazione (`scheduling`), al cambio account/logout.
  - [x] **R05 (Prove e Trasparenza):** Suite `scripts/test-smtp-ssrf-isolation.mjs` (26/26 PASS) generata dall'esecuzione reale con `tsx`, rimossi i test fittizi con confronto stringhe. Rettificata la dicitura su IV casuale (sicurezza semantica, eliminata asserzione non dimostrata su replay). Documentata la natura in-process del rate limiter. Mantenuta rigorosamente **NON VERIFICATA** la consegna con due caselle distinte.
- [x] **Sub-fase 2.9: Pubblicazione in Produzione e Verifica Live (Vercel & mailk.arkai.dev)**
  - [x] **Build & Lint:** `npm run build` e `npx tsc --noEmit` completati con successo (0 errori, exit code 0).
  - [x] **Commit & Push:** Commit `eb8a9d6` pubblicato su `origin/main` (`https://github.com/cesarenegro/-email_send`).
  - [x] **Deploy Produzione:** Vercel deployment `dpl_DtvurSQA8HDRCekc9iQS6VrnaTPz` attivo su dominio pubblico `https://mailk.arkai.dev`.
  - [x] **Pulsante SETUP-DUMMIES:** Verificata presenza del pulsante su `https://mailk.arkai.dev/campaigns/new` ed apertura del wizard Step 1 SMTP.
  - [x] **GET Autenticata `/api/smtp/connections`:** Restituisce HTTP 200 con payload `[]` (risolto il precedente 404 del deployment disallineato).
  - [x] **Isolamento Tenant Multi-Utente (Account B vs Account A):**
    - Account B vede 0 righe da `user_smtp_connections_view` e 0 righe dall'API `/api/smtp/connections`.
    - Entrambi gli account bloccati con codice PostgreSQL `42501` da lettura tabella base e scrittura vista.
    - Tentativo di invio da Account B con `smtp_connection_id` di Account A respinto con HTTP 400 (`Configurazione SMTP non trovata o appartenente a un altro utente`).
    - Tentativo di invio da Account B senza specificare connessione respinto con HTTP 400 (`Nessuna configurazione SMTP disponibile...`, nessun fallback ad admin).
  - [x] **Prevenzione Race Condition su Cambio Account (Due Schede):**
    - Scheda 1 avvia verifica SMTP con credenziali reali; la risposta viene trattenuta temporaneamente dal test.
    - Scheda 2 esegue switch di sessione ad Account B reale tramite SDK Supabase.
    - La risposta di verifica SMTP 200 perviene allo Step 1, ma la guardia di sessione intercetta il cambio: esattamente 0 richieste POST a `/api/smtp/connections`.
    - Input password azzerato. Bozza `localStorage` di Account B sanificata. Zero record inseriti per Account B in `smtp_connections`.
  - [x] **Invio di Prova Cesare → Cesare e Ricezione Reale:**
    - Email di test inviata tramite API di produzione: HTTP 200, `messageId`: `<b7d15373-b3b5-0891-556b-e68cee12c335@arkitecna.com>`.
    - Conferma ricezione effettiva tramite IMAP in modalità `readOnly` su `imap.hostinger.com:993` (UID: 2132, from/to: `cesare@arkitecna.com`, subject: `[MAIL-K] Test di invio SMTP verificato`).
  - [x] **Blocchi Residui e Trasparenza:**
    - Gmail (`cesare.negro@gmail.com`): bloccato per credenziale rifiutata dal server SMTP Google (`EAUTH` / 535-5.7.8). Nessun tentativo ripetuto con la stessa password e nessuna protezione aggirata, come espressamente richiesto. La spedizione con Gmail resta bloccata in attesa di credenziali valide (App Password).

---

# FASE 3: SANITIZZAZIONE XSS, PARSER PDF FLATEDECODE E WIZARD SETUP-DUMMIES

## 1. Obiettivi e Punti di Audit (F07 e Punto 4)
- **F07 (XSS):** Sanitizzazione HTML con allowlist rigorosa su import (`/api/email-import/parse`), editor (`VisualEmailEditor.tsx`) e anteprima (`Step5PreviewConfirm.tsx`). Blocco protocolli `javascript:`, rimozione tag eseguibili e attributi evento inline (`on*`).
- **Punto 4 (Parser PDF):** Decompressione flussi zlib/FlateDecode per PDF digitali in `/api/email-import/parse-pdf`, con corretta distinzione da PDF bitmap scansionati.
- **Wizard SETUP-DUMMIES (Step 2 - 8):** Consolidamento e verifica del percorso assistito collegato a `smtp_connection_id` verificato.

## 2. Interactive Task List (Fase 3)
- [x] **Sub-fase 3.1: Modulo di Sanitizzazione HTML ed Escaping**
  - [x] Creare `lib/security/sanitize-html.ts` con allowlist per email, rimozione script/eventi e validazione protocolli
  - [x] Aggiungere funzioni di escaping testo e gestione placeholder dinamici
  - [x] Bonificare `/api/email-import/parse/route.ts` con sanitizzazione obbligatoria per HTML, EML e TXT e controllo di sessione
- [x] **Sub-fase 3.2: Hardening Componenti Browser (Editor & Anteprima)**
  - [x] Aggiornare `components/dummies/VisualEmailEditor.tsx`: sanitizzare testo incollato su `handlePaste`, validare link e sanitizzare sync HTML
  - [x] Aggiornare `components/dummies/steps/Step5PreviewConfirm.tsx`: applicare sanitizzazione garantita prima di `dangerouslySetInnerHTML`
  - [x] Aggiornare `components/dummies/SetupDummiesModal.tsx`: sanificare `html_template` nel payload di creazione campagna
- [x] **Sub-fase 3.3: Parser PDF con Supporto FlateDecode**
  - [x] Implementare estrazione e decompressione stream `FlateDecode` in `lib/email-import/pdf-parser.ts`
  - [x] Aggiornare `app/api/email-import/parse-pdf/route.ts` per gestire PDF digitali compressi e distinguere vere scansioni
  - [x] Aggiungere limiti di risorsa e gestione errori
- [x] **Sub-fase 3.4: Suite di Test e Collaudo Automatizzato**
  - [x] Creare ed eseguire `scripts/test-import-security.mjs` (10/10 PASS)
  - [x] Eseguire `npx tsc --noEmit` (0 errori)
  - [x] Eseguire `npm run build` (0 errori, build ottimizzata completata)
  - [x] Verificare integrità flusso Step 1-8 nel wizard SETUP-DUMMIES



