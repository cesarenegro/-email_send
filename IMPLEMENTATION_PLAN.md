# PIANO DI IMPLEMENTAZIONE: Risoluzione Bug Critici SMTP & Autenticazione OAuth

**Creato:** 2026-10-14 19:10 +08:00  
**Stato:** In Approvazione  
**Autore:** Antigravity AI  

---

## 1. Analisi Dettagliata dei 2 Bug

### 🔴 Bug 1: Impossibilità di Configurare SMTP su `/settings`
- **Problema riscontrato:** Nella schermata `app/settings/page.tsx`, i parametri SMTP (`smtpHost`, `smtpPort`, `smtpUser`) sono campi di solo testo statici (`<p className="font-semibold">{smtpHost}</p>`). Non esiste alcun campo di input né per l'Host, la Porta, lo Username, né soprattutto per la **Password SMTP**.
- **Effetto collaterale:** Quando l'utente clicca su "Test Connessione" o "Invia Email di Test", il backend interroga `smtp_connections` per l'utente corrente; non trovando alcuna casella configurata, restituisce l'errore:
  > *"Nessuna configurazione SMTP verificata trovata per questo account utente. L'invio è bloccato per garantire l'isolamento della casella mittente. Configura e verifica una casella SMTP personale prima di inviare."*
- **Soluzione:** Implementare in `/settings` la console completa di gestione SMTP:
  1. Elenco caselle connesse e verificate (con badge stato, protocollo, test live ed eliminazione).
  2. Form di configurazione guidata con:
     - **Preset rapidi**: Hostinger, Google Workspace / Gmail (con istruzioni App Password), Aruba, Microsoft 365, Personalizzato.
     - **Rilevamento automatico** parametri via `/api/smtp/detect` (inserendo l'email compila automaticamente host e porta).
     - **Campi modificabili**: Host, Porta (465 SSL / 587 TLS), Protocollo di sicurezza, Username, Password (con mostra/nascondi protetto), Nome Mittente, Reply-To.
     - **Pulsante "Verifica e Salva Casella SMTP"**: collauda la connessione live e salva in `smtp_connections` con crittografia AES-256-GCM.
  3. Aggiunta endpoint `DELETE` in `/api/smtp/connections/[id]/route.ts` per consentire la rimozione pulita di vecchie configurazioni.

---

### 🔴 Bug 2: Doppio Login e Loop di Reindirizzamento OAuth (Google / Facebook / Email)
- **Problema riscontrato ("devo loggarmi 2 volte per accedere"):**
  1. In `app/auth/callback/route.ts`, dopo che Supabase completa `exchangeCodeForSession(code)` o `verifyOtp`, i cookie di sessione vengono scritti su `cookieStore` di Next.js.
  2. Tuttavia, la route esegue poi `return NextResponse.redirect(...)` istanziando una **nuova Response** che in Next.js App Router (Route Handlers) **non include gli header `Set-Cookie`** appena generati!
  3. Il browser segue il redirect 307 verso `/` senza cookie di sessione.
  4. Il `middleware.ts` intercetta la richiesta a `/`, non trova il cookie di autenticazione (`user === null`) e reindirizza immediatamente l'utente a `/landing` o `/login`.
  5. L'utente si ritrova quindi alla schermata di login iniziale ed è costretto a rifare il login una seconda volta per accedere.
  6. Inoltre, nei pulsanti social della CTA finale in `app/landing/page.tsx`, il click apre un modale anziché avviare direttamente il flusso OAuth con Google/Facebook con un solo click.
  7. In `components/LoginModal.tsx` riga 98 è ancora presente un residuo del vecchio dominio `https://emailbulk.vercel.app`.
- **Soluzione:**
  1. Riscrivere `app/auth/callback/route.ts` secondo lo standard ufficiale Supabase SSR per Next.js App Router: l'oggetto `NextResponse.redirect()` viene istanziato all'inizio e passato a `setAll`, in modo che ogni cookie di autenticazione venga applicato direttamente a `response.cookies.set(...)`.
  2. Garantire che la risposta di redirect contenga fisicamente gli header `Set-Cookie` verso il browser.
  3. In `app/landing/page.tsx`, rendere i bottoni Social ("Accedi con Google", "Accedi con Facebook", "Accedi con LinkedIn") attivi con 1 click diretto all'OAuth provider.
  4. Bonificare qualsiasi riferimento residuo a `emailbulk.vercel.app` a favore di `https://mailk.arkai.dev`.

---

## 2. Piano di Lavoro e Task List

### Fase 1: Fix Autenticazione & Reindirizzamento OAuth (Zero Doppio Login)
- [x] **app/auth/callback/route.ts**: Riscrivere il Route Handler collegando `response.cookies.set()` al callback `setAll` di `createServerClient`, assicurando che `exchangeCodeForSession` scriva direttamente gli header `Set-Cookie` sulla risposta 307.
- [x] **app/landing/page.tsx**: Connettere i pulsanti OAuth Google, Facebook e LinkedIn della CTA direttamente a `handleOAuth(provider)` con fallback visuale di caricamento.
- [x] **components/LoginModal.tsx**: Aggiornare il fallback URL di reindirizzamento al dominio canonico `https://mailk.arkai.dev`.

### Fase 2: Backend Gestione Connessioni SMTP
- [x] **app/api/smtp/connections/[id]/route.ts**: Creare endpoint `DELETE` sicuro con controllo di tenant isolation (`user_id = user.id`) per eliminare caselle SMTP non più desiderate.
- [x] **app/api/settings/route.ts**: Esporre la lista delle connessioni utente o la connessione predefinita attiva per il pannello settings.

### Fase 3: Frontend `/settings` - Console Completa Configurazione SMTP
- [x] **app/settings/page.tsx**:
  - Sostituire il box statico "Server Hostinger SMTP SSL" con una vera suite di configurazione SMTP:
    - Tab / Selettore: **Caselle Collegate** vs **Aggiungi/Modifica Casella SMTP**.
    - Preset veloci: *Hostinger*, *Google Workspace / Gmail*, *Aruba*, *Microsoft 365*, *Custom*.
    - Auto-detection host/porta al cambio dell'email mittente.
    - Campi input: Host, Porta, Toggle SSL/TLS, Username/Email, Password (con icona Mostra/Nascondi), Nome Mittente, Reply-To.
    - Pulsante "Verifica e Salva Configurazione SMTP" con feedback visivo verde/rosso immediato.
    - Lista delle caselle verificate con opzione "Invia email di prova" su quella casella ed "Elimina".
- [x] **lib/i18n/locales/it.ts** & **en.ts**: Aggiornare e completare i testi descrittivi e di feedback per i nuovi controlli interattivi di `/settings`.

### Fase 4: Collaudo & Build
- [x] Eseguire `npx tsc --noEmit` per verificare l'integrità dei tipi TypeScript.
- [x] Eseguire `npm run build` per verificare che non vi siano regressioni nei percorsi statici o dinamici.
- [x] Collaudare via browser locale il flusso di login e la configurazione SMTP.
- [x] Aggiornare `SETTINGS.TXT` e `IMPLEMENTATION_PLAN.md`.
