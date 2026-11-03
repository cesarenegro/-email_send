# SESSION HANDOVER — MAIL-K → ecosistema KONTA (tappe M0 + M1)

**Created:** 2026-10-11 13:38 +08:00
**Last modified:** 2026-11-03 19:45 +08:00
**Local timezone:** Asia/Makassar (+08:00)
**Agent:** Claude Fable 5.1 (sessione avviata dal coordinatore KONTA)
**Repository:** `cesarenegro/-email_send`
**Branch di lavoro:** `konta-ecosystem` (creato da `main` @ `fbfe022`; SOLO commit locali, NESSUN push)
**Produzione:** `main` resta in produzione su https://mailk.arkai.dev con il progetto Supabase di Mail-K: non toccato.

---

## 1. Stato attuale del codebase (branch `konta-ecosystem`)

Mail-K usa l'account KONTA (progetto Supabase condiviso con KONTA PRO e K-CRM) e uno spazio di lavoro per organizzazione:

- **Schema:** `supabase/migrations/20261103120000_mailk_konta_01_tenant.sql` (9 tabelle `mail_*`, RLS, policy per verbo, RPC di claim, helper) e `20261103120100_mailk_konta_02_storage.sql` (bucket `mail-images` per organizzazione). Applicate **solo al DB Docker locale di K-CRM** con `node scripts/konta/apply-mailk-migration.mjs <file>`.
- **Auth:** `lib/konta/session.ts` (`requireTenant`, verifica sessione come K-CRM), `lib/konta/workspace.ts` (cookie `mailk_org`, localStorage `konta_mailk_active_org_id`), `app/api/workspace` (lista membership, scelta, reset), `middleware.ts` (sessione → `/workspace` se manca l'organizzazione), `app/login` + `app/login/pro` (email+password, OTP via email opzionale, link "Accedi con account KONTA PRO"), `app/workspace` (scelta organizzazione; auto-selezione se una sola).
- **Impostazioni mittente per organizzazione:** `app/settings` + `app/api/settings` (PUT solo O/A, verifica SMTP reale prima del salvataggio), `test-smtp`, `send-test`, `test-imap`; segreti cifrati con `lib/crypto/secret-box.ts` (copia da K-CRM, chiave `KCRM_SECRET_ENCRYPTION_KEY`, `key_version` 1).
- **Invio:** `lib/email/transporter.ts` (`resolveOrganizationTransport`, nessun ripiego su variabili d'ambiente), dispatcher campagne/newsletter su `mail_*`, cron `app/api/cron/send` **una email per organizzazione per esecuzione** (max 10 organizzazioni, 45 s, newsletter prima della campagna; registro in `mail_cron_runs`).
- **Bounce:** IMAP per organizzazione (`mail_sender_settings.imap_*`, ripiego sulle credenziali SMTP), registro `mail_bounces`, `cron/bounces` itera le organizzazioni con IMAP (non pianificato in `vercel.json`).
- **Lead Research:** NON migrato (tabelle `lead_research_*` assenti su KONTA); route in 503 `FEATURE_DISABLED` salvo `LEAD_RESEARCH_ENABLED=true`; voce di menu e card nascoste.
- **Rimossi:** OAuth Google/Facebook/LinkedIn, registrazione e reset password (gli account nascono in KONTA PRO), `LoginModal`, `Navbar`, onboarding self-service (`OnboardingController`, `AccountSetupWalkthrough`, `api/settings/onboarding`), `api/smtp/connections*`, `lib/crypto/encryption.ts`, pagina di collaudo `app/downloads/phase3-browser-audit` (dati finti nel sorgente).
- **Documenti:** `docs/KONTA_AUDIT_M0.md` (audit + esito dei due bug), `SETTINGS.TXT` aggiornato, `.env.example` con i nuovi nomi.

## 2. Verifiche eseguite (2026-11-03)

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck base `main` | `npx tsc --noEmit` | exit 0 |
| Migrazione 01 sul DB locale | `node scripts/konta/apply-mailk-migration.mjs` | exit 0, 9 tabelle |
| Migrazione 02 (storage) | `node scripts/konta/apply-mailk-migration.mjs supabase/migrations/20261103120100_mailk_konta_02_storage.sql` | exit 0, bucket + 4 policy |
| RLS/policy/grant/anon/search_path/isolamento | `node scripts/konta/verify-mailk-rls.mjs` | exit 0, tutti i controlli superati (anon 42501 su ogni tabella, nessun FOR ALL, ciphertext non leggibile da authenticated) |
| Isolamento con utenti reali (seed K-CRM) | `node scripts/konta/test-tenant-isolation.mjs` | exit 0: owner-a → org `4c914aba…`, owner-b → org `d4346bee…`, due campagne di prova con `organization_id` diversi, scritture cross-tenant rifiutate (42501), pulizia completa |
| Typecheck branch | `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | exit 0 (al primo tentativo Next si è fermato con l'avviso di sicurezza "upgrade Next.js"; il secondo tentativo ha completato la build) |
| Browser locale (porta 3200) | login `owner-a@test.local` → `/workspace` (2 organizzazioni) → hub con sidebar "Alfa Impianti Srl / Titolare"; `/settings` salva identità (200), SMTP fittizio rifiutato dalla verifica reale (400); campagna creata (201, `organization_id` di Alfa) e cancellata (200); logout; login `owner-b@test.local` → "Beta Consulting Sas" → campagna creata/cancellata nella sua org; GET della campagna di A da B → 404 | OK |
| Cron e accessi anonimi | `GET /api/cron/send` con Bearer → 200 idle; senza → 401; `/api/campaigns` senza sessione → 401; `/campaigns` → 307 `/login` | OK |
| Stato DB locale a fine collaudo | query `pg` su tutte le `mail_*` e sul bucket | 0 righe, 0 oggetti |

**NON VERIFICATE:** invio SMTP reale (`MAILK_TEST_EMAIL_TO` assente in `.env.local` e nessuna casella reale per le organizzazioni di prova: `send-test` e dispatcher esercitati solo nel ramo di errore "casella non configurata"); IMAP reale; OTP via email nel browser (Mailpit disponibile ma non provato); caricamento immagini nel bucket `mail-images` dalle form; `npm run lint` globale (gli errori restanti sono pre-esistenti in `components/CampaignForm.tsx` e nel modulo Lead Research, non toccati).

## 3. Ambiente locale

- `.env.local` riscritto con i valori dello stack Docker di K-CRM (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`); il file precedente è salvato in `.env.local.mailk-legacy-backup` (entrambi ignorati da git). Le vecchie variabili `SMTP_*` restano nel file ma non sono più lette.
- `KCRM_SECRET_ENCRYPTION_KEY` non impostata in locale: il secret-box usa la chiave di sviluppo derivata (avviso a console). In produzione è obbligatoria.
- `.claude/launch.json` (non committato): `mailk-dev-konta-local-3200` → `npm run dev -- --port 3200`.

## 4. Cosa resta

- **M2 — brand/UI:** restyling completo secondo la regola del proprietario (le schermate nuove login/workspace/impostazioni sono già nello stile "pulito, poche informazioni"); hub e sidebar conservano testi legacy (quota 80/giorno fissa, "GESTOR MAIL", badge DKIM) da rivedere.
- **M3 — ponte K-CRM:** segmenti in uscita, consensi e bounce in entrata, esiti nella scheda cliente. Richieste verso K-CRM: (1) endpoint o RPC di lettura segmento `GET /api/v1/organizations/{orgId}/segments/{id}/members` con `{ email, company_name, person_id, company_id, consent_marketing }`; (2) formato del segmento = lista di destinatari con id CRM e flag consenso; (3) webhook K-CRM → Mail-K per revoca consenso (`consent.revoked`) e Mail-K → K-CRM per esiti (`mail.sent`, `mail.bounced`, `mail.failed`) firmati con il secret in `crm_webhook_subscriptions`; (4) capacità `crm.mailk` in `crm_capability_grants` per mostrare Mail-K nel CRM.
- **M4 — commerciale:** decidere il destino di Lead Research (tabelle non migrate), prezzi e `crm_product_access` per Mail-K.
- **Pulizia tecnica:** rimuovere gli script legacy `scripts/*.mjs|ts` legati al vecchio progetto; `CampaignSchema.partial()` in PATCH reimposta i default dei campi omessi (comportamento pre-esistente, oggi innocuo perché il form invia tutto); convenzione `middleware` → `proxy` (Next 16 lo segnala come deprecato); aggiornamento di sicurezza Next.js segnalato dalla build.

## 5. Decisioni del proprietario (risposte del 2026-11-03)

| # | Tema | Decisione |
|---|---|---|
| 1 | Dominio | Resta `mailk.arkai.dev`, con le variabili del progetto KONTA al passaggio |
| 2 | Dati storici | Nessuna migrazione: le tabelle `mail_*` nascono vuote |
| 3 | Cron invio | Ogni minuto, una email per organizzazione per esecuzione. Richiede il piano Vercel Pro (Hobby: un cron al giorno, deploy rifiutato se più frequente). Più il tasto **Invia/Ricevi** manuale |
| 4 | Cron rimbalzi | Non pianificato: lettura manuale col tasto **Invia/Ricevi** |
| 5 | Migrazioni cloud | Le applica chi fa il go-live di K-CRM, insieme al bundle cloud |
| 6 | Chiave di cifratura | Stessa `KCRM_SECRET_ENCRYPTION_KEY` di K-CRM |
| 7 | Aggiornamento Next.js | Rimandato |
| 8 | Lead Research | Spento fino a M4 |
| 9 | Script legacy | Eliminati (restano solo `verify-logic.ts`, `test-phase3-release.mjs`, `test-import-security.mjs` e `scripts/konta/`) |
| 10 | Collaudo invio reale | Destinatario `cesare@arkitecna.com` (`MAILK_TEST_EMAIL_TO`); la casella SMTP reale la inserisce il proprietario in Impostazioni |
| 11 | Push | Autorizzato: solo il branch `konta-ecosystem`, nessun merge su `main` |
| 12 | Ordine delle tappe | Prima le verifiche mancanti, poi M3 (ponte K-CRM), poi M2 (restyling) |

## 5-bis. Aggiornamento 2026-11-03 pomeriggio

- **Tasto Invia/Ricevi** nell'intestazione (`components/konta/SendReceiveButton.tsx`, `POST /api/mail/send-receive`): invia l'email dovuta dell'organizzazione con le stesse regole del cron (`lib/email/org-runner.ts`, condiviso con `/api/cron/send`) e legge i rimbalzi IMAP. Provato in locale: "Niente da inviare".
- **Accesso con link via email:** l'email arriva (Mailpit locale), il link porta a `/workspace` in un solo passaggio. Il modello d'email locale non contiene il codice a 6 cifre: la schermata ora dice "apri il link oppure inserisci il codice".
- **Bucket immagini:** `node scripts/konta/test-storage-isolation.mjs` exit 0 (upload solo nella propria organizzazione, URL pubblico 200, SVG rifiutato, pulizia completa).
- **Test logici rimasti:** `npx tsx scripts/verify-logic.ts` exit 0 (28 controlli), `node scripts/test-phase3-release.mjs` exit 0.
- **Invio reale:** verificato più tardi (vedi 5-quinquies).

## 5-ter. M3 — ponte K-CRM, lato Mail-K (2026-11-03)

- **Migrazione 03** `supabase/migrations/20261103140000_mailk_konta_03_crm_bridge.sql` (applicata solo in locale): `crm_segment_id` su campagne e newsletter, `crm_person_id` e `source` ('manual' | 'csv' | 'crm_segment') su destinatari e iscritti. Nessuna FK verso `crm_*`.
- **Segmenti in uscita:** `lib/konta/kcrm-client.ts` chiama l'API di K-CRM (`KCRM_API_URL`) inoltrando solo i cookie di sessione `sb-*` dell'utente: K-CRM verifica sessione e membership e calcola i destinatari (consensi, revoche, duplicati). Route `GET /api/crm/segments`, `POST /api/crm/import-segment`; pannello "Importa da segmento K-CRM" accanto all'import CSV di campagne e newsletter.
- **Consensi in entrata:** prima di ogni invio i dispatcher leggono `crm_consents` (sola lettura). Revocato → destinatario "failed" con motivo; lettura impossibile → nessun invio, nuovo tentativo dopo 15 minuti.
- **Verificato in locale** (K-CRM avviato su 3110 senza modificarne i file): lista segmenti 200 (vuota), segmento inesistente 404 da K-CRM, campagna inesistente 404, pannello visibile; `checkConsent` su indirizzo senza eventi → `allowed`; RLS 0; tsc 0.
- **Verificato con dati K-CRM reali** (creazione autorizzata dal proprietario il 2026-11-03), vedi 5-sexies.
- **Richieste a K-CRM (ancora aperte):** (1) endpoint per ricevere gli esiti Mail-K nella scheda cliente (`mail.sent`, `mail.bounced`, `mail.failed` con `crm_person_id`), oppure una RPC dedicata; (2) evento di disiscrizione dal link nelle email → `record_consent` revoked (Mail-K oggi non ha un link di disiscrizione); (3) capacità `crm.mailk` per mostrare Mail-K nel CRM.

## 5-quater. M2 — primo passaggio di pulizia (2026-11-03)

- **Hub** riscritto (`app/page.tsx` + `components/konta/Hub.tsx`): solo dati letti dal database dell'organizzazione (inviate ed errori di oggi, in coda, rimbalzi 30 giorni, prossimo invio, campagne e newsletter in corso con avanzamento). Rimossi `HubLiveView` e `DashboardLiveView`, che mostravano indicatori non sostenuti da dati (allineamento SPF/DKIM/DMARC "100%", placement "100%", quota fissa 80).
- **Sidebar**: tolti il riquadro SMTP con quota fissa 80/giorno e il selettore lingua duplicato. **Intestazione**: titolo della sezione, Invia/Ricevi, lingua; tolte le icone di ricerca e notifiche che portavano ad altre pagine.
- Provato in locale con una campagna di prova (2 destinatari, in pausa) poi cancellata.
- **Resta per M2:** pagine elenco e dettaglio di campagne e newsletter, wizard guidato, FAQ e guida, landing pubblica, testi i18n legacy ("Atelier", "Operating Console", "Precision Outbound").

## 5-quinquies. Invio reale verificato (2026-11-03)

Casella inserita dal proprietario in Impostazioni sull'organizzazione locale "Alfa Impianti Srl": `info@arkai.dev` su `mail.arkai.dev:465`, IMAP sullo stesso host. Password SMTP e IMAP salvate cifrate (`v1.`, `key_version` 1).

| Prova | Esito |
|---|---|
| `POST /api/settings/test-smtp` | 200, connessione verificata |
| `POST /api/settings/send-test` → `cesare@arkitecna.com` | 200, inviata da `info@arkai.dev`, Message-ID assegnato |
| `POST /api/settings/test-imap` | 200, casella in sola lettura, 140 messaggi |
| Campagna di prova (1 destinatario `cesare@arkitecna.com`) avviata + tasto Invia/Ricevi | inviata (`status: sent`, Message-ID); IMAP: 65 avvisi di rimbalzo riconosciuti, 0 destinatari aggiornati (nessuno di questa organizzazione) |

Campagna, log e registro cron di prova cancellati; la casella resta configurata in locale. Ricezione nella casella di `cesare@arkitecna.com` confermata dal proprietario il 2026-11-03.

## 5-sexies. Ponte K-CRM verificato con dati reali (2026-11-03)

Dati creati tramite l'API di K-CRM nell'organizzazione locale "Alfa Impianti Srl" (`4c914aba…`), con indirizzi non recapitabili `@example.invalid` e provenienza `mailk-bridge-test`: persone "Prova Ponte Uno" e "Prova Ponte Due", segmento "Prova ponte Mail-K" (consenso marketing obbligatorio). **Restano nel DB locale** (2 persone, 4 eventi di consenso append-only, 1 segmento) come base per le prove future di M3.

| Prova | Esito |
|---|---|
| Valutazione del segmento in K-CRM | Persona 1 destinataria; Persona 2 esclusa ("Consenso marketing revocato") |
| `GET /api/crm/segments` da Mail-K | 200, "Prova ponte Mail-K" |
| Import nella campagna | 200: 1 importato, 1 escluso da K-CRM; riga con `crm_person_id` e `source = crm_segment` |
| Secondo import nella stessa campagna | 0 importati, 1 già presente (nessun duplicato) |
| Import nella newsletter | 200: 1 importato con nome dalla persona K-CRM |
| Revoca del consenso di Persona 1 in K-CRM, poi Invia/Ricevi | newsletter: iscritto "failed", "Consenso revocato in K-CRM", nessun Message-ID; campagna: destinatario "failed", "Consenso marketing revocato in K-CRM", nessun Message-ID |

Campagna, newsletter, log e registro cron di prova di Mail-K cancellati; K-CRM avviato su 3110 solo per la prova e poi fermato, nessun suo file modificato.

**Osservazioni:** la lentezza di Invia/Ricevi è stata risolta (vedi 5-septies). Una newsletter i cui iscritti sono tutti bloccati finisce in stato "sent" (stato "completata" ereditato da prima).

## 5-septies. Invia/Ricevi veloce: lettura IMAP incrementale (2026-11-03)

- **Migrazione 04** `supabase/migrations/20261103160000_mailk_konta_04_imap_cursor.sql` (applicata solo in locale): `imap_uid_validity`, `imap_last_uid`, `imap_synced_at` su `mail_sender_settings`, scritte solo dal server.
- `lib/email/imap-bounce-client.ts`: con UIDVALIDITY invariata legge solo i messaggi con UID oltre il segnalibro (massimo 500 per lettura); la prima lettura, o dopo un cambio di casella, esamina gli ultimi 100 e salva il segnalibro. La lettura limitata a una campagna non usa né sposta il segnalibro. Cambiare host o utente IMAP in Impostazioni azzera il segnalibro.

| Misura (casella reale `info@arkai.dev`, nulla da inviare) | Tempo |
|---|---|
| Prima della modifica | 23,7 s (100 messaggi, 67 avvisi rianalizzati) |
| Prima pressione dopo la modifica (salva il segnalibro) | 24,2 s |
| Pressioni successive senza posta nuova | 3,8 s |
| Segnalibro arretrato di 3 in locale (simula 3 messaggi nuovi) | 4,8 s, 3 messaggi esaminati, 3 avvisi riconosciuti |

I 3,8 s residui sono connessione e accesso IMAP più le query di invio.

## 5-octies. Migrazioni sul cloud KONTA: APPLICATE (2026-11-03)

Il proprietario ha chiesto di procedere con la migrazione al cloud (`yyzqtaqpbudnkgbvymrf`). Stato:
- Prerequisiti verificati dal runbook K-CRM: le migrazioni K-CRM sono state applicate al cloud il 2026-11-02 (helper `crm_is_active_member` / `crm_member_role` presenti).
- Il connettore Supabase di questa sessione non vede il progetto KONTA. La password `SUPABASE_DB_PASSWORD` nel `.env.local` di K-CRM è rifiutata dal pooler (probabilmente quella precedente alla rotazione del 2026-11-02). **Nessuna istruzione eseguita sul cloud.**
- Due percorsi pronti, stesso contenuto:
  1. `node scripts/konta/cloud-apply-mailk.mjs --env-file .env.local --check` poi `--apply`, dopo che il proprietario inserisce `MAILK_CLOUD_DB_PASSWORD` (password attuale del database) nel `.env.local` di Mail-K. Controlli in lettura, 4 migrazioni in una sola transazione, controlli successivi (RLS, anon, segreti, search_path, bucket, impronta delle policy non Mail-K invariata) e ROLLBACK automatico se un controllo fallisce.
  2. SQL Editor del progetto: `supabase/cloud/mailk_20_apply_bundle.sql` (manifest SHA256 in `mailk_20_apply_bundle.manifest.json`), poi `supabase/cloud/mailk_30_postapply_checks.sql` (ogni riga OK). Pacchetto rieseguibile: riapplicato in locale senza errori, controlli 7/7 OK.
- **Esito:** il proprietario ha eseguito `supabase/cloud/mailk_20_apply_bundle.sql` dall'SQL Editor del progetto `yyzqtaqpbudnkgbvymrf` (nessun errore; ultimo risultato: 3 righe `mail_admin_set_policies`) e poi `supabase/cloud/mailk_30_postapply_checks.sql`: **7/7 OK** (9 tabelle `mail_*`, RLS su tutte, nessun FOR ALL, anon senza privilegi, segreti non leggibili da authenticated, search_path fissato, bucket `mail-images` pubblico).
- **Non verificato dal cloud:** impronta delle policy non Mail-K prima/dopo (controllo disponibile solo nello script `cloud-apply-mailk.mjs`, non usato) e advisor Supabase.
- **Da fare:** registrare le 4 versioni nel registro migrazioni dalla repo KONTA PRO collegata:
  `supabase migration repair --status applied 20261103120000 20261103120100 20261103140000 20261103160000`;
  impostare `KCRM_SECRET_ENCRYPTION_KEY` (stessa di K-CRM), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `KCRM_API_URL` nel progetto Vercel di Mail-K al momento del passaggio. Fino ad allora `mailk.arkai.dev` resta sul vecchio progetto.

## 6. Istruzioni per riprendere

```bash
git checkout konta-ecosystem
node scripts/konta/verify-mailk-rls.mjs
node scripts/konta/test-tenant-isolation.mjs
npm run dev -- --port 3200
```
Login locale: `owner-a@test.local` / `owner-b@test.local` (seed K-CRM, password nel seed di K-CRM). Per l'invio reale impostare in `/settings` una casella SMTP vera di un'organizzazione e `MAILK_TEST_EMAIL_TO` in `.env.local`.
