# MAIL-K — Audit M0 per l'ingresso nell'ecosistema KONTA

**Created:** 2026-11-03 14:10 +08:00
**Last modified:** 2026-11-03 14:10 +08:00
**Local timezone:** Asia/Makassar (+08:00)
**Riferimento:** `E:\Projects\KONTA MASTER\KONTA K-CRM\ANALISI CONCORRENZA\K-CRM_03_PROPOSTA_GAP_MAILK_AI_DASHBOARD.md` §1 (tappe M0–M4)
**Stato del repo auditato:** branch `main`, commit `fbfe022` (in produzione su https://mailk.arkai.dev)

---

## 1. Cosa c'è (stato di `main` a `fbfe022`)

### 1.1 Stack
Next.js 16.4.0 (App Router, Turbopack), React 19.3, TypeScript 5, Tailwind 4, `@supabase/ssr` 0.12 + `@supabase/supabase-js` 2.117, nodemailer 10, imapflow 2, mailparser 3, luxon 3, zod 4, pg 8. Deploy Vercel, cron Vercel ogni minuto su `/api/cron/send` (`vercel.json`). Typecheck di base: `npx tsc --noEmit` → exit 0.

### 1.2 Pagine (`app/*`)
| Rotta | Tipo | Dipende da |
|---|---|---|
| `/` | server, hub con contatori | `campaigns`, `newsletters`, `email_logs`, `campaign_leads` filtrati per `user_id` |
| `/campaigns`, `/campaigns/new`, `/campaigns/[id]` | server + client | `campaigns`, `campaign_leads` (RLS per `user_id`) |
| `/newsletters`, `/newsletters/new`, `/newsletters/[id]` | server + client | `newsletters`, `newsletter_subscribers` |
| `/settings` | client (938 righe) | `/api/settings`, `/api/smtp/connections*`, `/api/smtp/verify`, `/api/smtp/detect` |
| `/lead-research` | client | `/api/lead-research*` (tabelle `lead_research_*`, Tavily + OpenAI) |
| `/login` | client (753 righe) | Supabase Auth proprio: email+password, sign-up, reset password, OAuth Google/Facebook/LinkedIn |
| `/landing`, `/faq`, `/guida` | pubbliche | nessuna tabella; la landing apriva `LoginModal` (OAuth) |
| `/downloads/phase3-browser-audit` | pubblica (matcher middleware) | pagina di collaudo con dati fittizi nel sorgente (email del proprietario, host SMTP finto) |
| `/auth/callback` | route handler | scambio PKCE / verifica OTP |

### 1.3 Route API (`app/api/**`)
- Campagne: `campaigns` (GET/POST), `campaigns/[id]` (GET/PATCH/DELETE), `[id]/start|pause|resume|send-now|leads|import|sync-bounces`.
- Newsletter: `newsletters` (GET/POST), `newsletters/[id]` (GET/PATCH/DELETE), `[id]/start|pause|send-now|subscribers`.
- Impostazioni: `settings` (GET/POST su `user_settings` + `app_settings`), `settings/send-test`, `settings/test-smtp`, `settings/test-imap` (IMAP da variabili d'ambiente), `settings/onboarding`.
- SMTP per utente: `smtp/connections` (GET/POST con verifica live e cifratura), `smtp/connections/[id]` (DELETE), `smtp/verify`, `smtp/detect`.
- Bounce: `bounces/sync`, `campaigns/[id]/sync-bounces` (IMAP globale da `IMAP_*`/`SMTP_*`).
- Cron: `cron/send` (pianificato), `cron/bounces` e `cron/lead-research` (non pianificati in `vercel.json`).
- Lead Research: `lead-research` (GET/POST), `[id]` (GET), `[id]/start|cancel|export`, `staff/lead-research/[id]`.
- Import: `email-import/parse`, `email-import/parse-pdf`, `leads/parse-file`.

### 1.4 Tabelle (`supabase/migrations/001…011`, `all_migrations.sql` = snapshot 001–006)
`campaigns` (+`user_id`, `smtp_connection_id`), `campaign_leads`, `email_logs`, `app_settings` (chiave/valore globale), `user_settings` (identità mittente per utente, con default hard-coded dell'amministratore), `newsletters`, `newsletter_subscribers`, `lead_research_jobs|results|messages|usage`, `smtp_connections` (password cifrata AES-256-GCM con chiave derivata da `SMTP_ENCRYPTION_KEY` o, in ripiego, dalla service-role key), vista `user_smtp_connections_view`, bucket Storage `newsletter-images` con cartelle `{user_id}/…`.
RPC: `claim_next_campaign_lead`, `claim_next_newsletter_subscriber` (solo `service_role`), `reserve/reconcile_lead_research_budget`. Policy: miste, con `FOR ALL` per `service_role` e per i lead; isolamento per `auth.uid() = user_id`.

### 1.5 Variabili d'ambiente lette dal codice
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_HOST|PORT|SECURE|USER|PASS|FROM_NAME|FROM_EMAIL|REPLY_TO` (casella "amministratore"), `IMAP_HOST|PORT|SECURE|USER|PASS`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL|APP_NAME`, `OPENAI_API_KEY`, `TAVILY_API_KEY`, `LEAD_RESEARCH_OPENAI_MODEL`, `SMTP_ENCRYPTION_KEY`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `LIVE_ORIGIN`, `ADMIN_EMAIL|ADMIN_PASSWORD`, `SUPABASE_PROJECT_REF|SUPABASE_DB_PASSWORD` (solo script).

### 1.6 Autenticazione oggi
Progetto Supabase proprio (`cayceyagmorwlbmmvyoc`). Login email+password, registrazione self-service, reset password, OAuth Google / Facebook / LinkedIn OIDC. Middleware con `createServerClient` + `auth.getUser()`; rotte pubbliche `/login`, `/landing`, `/faq`, `/guida`, `/downloads/*`. L'utente `cesare@arkitecna.com` è trattato come "amministratore primario" in 9 punti del codice (ripiego SMTP di ambiente, modifica globale di `app_settings`, onboarding saltato, valori di default della sidebar).

### 1.7 Configurazione SMTP oggi
Per utente: tabella `smtp_connections` (più caselle per utente, verificate con handshake, password cifrata). Le campagne e le newsletter referenziano `smtp_connection_id`; in assenza, ripiego sulla casella di ambiente SOLO per l'amministratore primario con `allowAdminFallback`. IMAP per i bounce: unico, da variabili d'ambiente.

---

## 2. Cosa dipende dal progetto Supabase attuale
- Tutte le tabelle del §1.4 e il bucket `newsletter-images` (vive solo lì; nessuna migrazione dei dati storici è prevista: decisione del proprietario).
- Gli utenti di `auth.users` (OAuth e email) e i metadati `user_metadata.onboarding_completed`.
- Le chiavi: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e la cifratura delle password SMTP (chiave derivata dalla service-role key quando `SMTP_ENCRYPTION_KEY` manca: le password cifrate NON sono trasportabili su un altro progetto).
- Gli script `scripts/*.mjs|ts` (audit live, test SMTP/IMAP, `apply-migrations.ts` con `SUPABASE_PROJECT_REF`): tutti legati al vecchio progetto.

## 3. Cosa va reso per-organizzazione (tappa M1)
| Oggi (per utente) | Domani (per organizzazione KONTA) |
|---|---|
| `campaigns.user_id` | `mail_campaigns.organization_id` (+ `created_by`) |
| `campaign_leads` via campagna | `mail_campaign_leads.organization_id` |
| `email_logs` via campagna | `mail_email_logs.organization_id` (campagne e newsletter) |
| `newsletters.user_id`, `newsletter_subscribers` | `mail_newsletters`, `mail_newsletter_subscribers` con `organization_id` |
| `user_settings` + `app_settings` + `smtp_connections` (N per utente) | `mail_sender_settings`: una riga per organizzazione (identità, SMTP cifrato, IMAP cifrato, fuso, finestra) |
| bounce via IMAP globale | IMAP dell'organizzazione (`mail_sender_settings.imap_*`) + registro `mail_bounces` |
| bucket `{user_id}/…` | bucket `mail-images` con cartelle `{organization_id}/…` |
| cron: una email per esecuzione | cron: una email per organizzazione per esecuzione |
| ruoli: nessuno (proprietario = utente) | ruoli KONTA via `crm_member_role`: O/A/M/S/K scrivono; O/A gestiscono le credenziali; R legge |
| Lead Research (`lead_research_*`) | NON migrato in M1 (modulo a pagamento, tappa M4); disattivato se `LEAD_RESEARCH_ENABLED` ≠ `true` |

---

## 4. Verifica dei due bug di `IMPLEMENTATION_PLAN.md` (commit `fbfe022`)

### Bug 1 — Console SMTP in `/settings`
**Esito: CHIUSO nel codice.** `app/settings/page.tsx` a `fbfe022` contiene preset provider (Hostinger, Gmail, Aruba, Microsoft 365, personalizzato), rilevamento automatico via `/api/smtp/detect`, campi host/porta/utente/password con mostra/nascondi, salvataggio con verifica live via `POST /api/smtp/connections` (riga 243) e cancellazione via `DELETE /api/smtp/connections/[id]` (riga 310). Il backend verifica l'handshake prima di salvare e cifra la password.
**Prova in locale:** non eseguita contro il progetto Supabase di Mail-K (vincolo: nessuna operazione su quel progetto); la verifica è di lettura del codice. In M1 la console è sostituita dalle impostazioni mittente per organizzazione.

### Bug 2 — Doppio login OAuth
**Esito: CHIUSO nel codice.** `app/auth/callback/route.ts` a `fbfe022` crea `NextResponse.redirect(...)` PRIMA di istanziare il client e scrive ogni cookie in `setAll` su `response.cookies.set(...)`: gli header `Set-Cookie` viaggiano sulla stessa risposta 307. Il middleware esclude `/auth` dal matcher, quindi non intercetta il callback. I pulsanti social della landing avviano direttamente `signInWithOAuth` e il dominio residuo `emailbulk.vercel.app` non compare più nel `LoginModal`.
**Prova in locale:** NON VERIFICATA a runtime (i provider OAuth non sono configurati in locale e il login OAuth è rimosso in M1: l'identità arriva dal progetto KONTA).

---

## 5. Decisioni prese nella tappa M1 (vedi `SESSION_HANDOVER.md`)
- Nessun dato finto nel sorgente: eliminata la pagina di collaudo `app/downloads/phase3-browser-audit` (email del proprietario e host SMTP fittizi nel codice, pubblica dal middleware).
- Eliminati `LoginModal`, `Navbar` (inutilizzato), `OnboardingController` + `AccountSetupWalkthrough` (onboarding self-service: gli account nascono in KONTA PRO), `api/settings/onboarding`, `api/smtp/connections*`, `lib/crypto/encryption.ts` (sostituito da `lib/crypto/secret-box.ts`, chiave `KCRM_SECRET_ENCRYPTION_KEY`).
- Gli script legacy in `scripts/*.mjs|ts` restano nel repo ma sono legati al vecchio progetto: da rimuovere o riscrivere dopo la decisione sul dominio/migrazione (vedi handover).
