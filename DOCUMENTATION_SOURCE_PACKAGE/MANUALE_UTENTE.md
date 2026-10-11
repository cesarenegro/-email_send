# MAIL-K (Precision Outbound) — Manuale Utente Ufficiale

**Versione:** 1.4.0  
**Data rilascio:** 11 Ottobre 2026  
**Ambiente:** Produzione ([https://mailk.arkai.dev](https://mailk.arkai.dev))  
**Proprietà:** ARKITECNA / Cesare Negro  
**Formato testo plain:** [Scarica MANUALE_UTENTE.txt](/downloads/MANUALE_UTENTE.txt)  

---

## Indice dei Capitoli
1. [Introduzione e Principi Operativi di MAIL-K](#capitolo-01-introduzione-e-principi-operativi-di-mail-k)
2. [Accesso, Sicurezza e Social Login](#capitolo-02-accesso-sicurezza-e-social-login)
3. [Il Cruscotto Operativo Hub](#capitolo-03-il-cruscotto-operativo-hub)
4. [Modulo 1 — Campagne Outbound a Spedizione Scaglionata](#capitolo-04-modulo-1--campagne-outbound)
5. [Modulo 2 — Newsletter Editoriali Programmate](#capitolo-05-modulo-2--newsletter-editoriali)
6. [Modulo 3 — B2B Lead Intelligence & Ricerca Mercato](#capitolo-06-modulo-3--b2b-lead-intelligence)
7. [Monitoraggio Bounce & Diagnostica IMAP Hostinger](#capitolo-07-monitoraggio-bounce--imap)
8. [Configurazione Mittente, SMTP Relay e Impostazioni Server](#capitolo-08-configurazione-mittente--smtp)
9. [Motore di Schedulazione, Fusi Orari e Deliverability](#capitolo-09-motore-di-schedulazione--fusi-orari)
10. [Risoluzione dei Problemi (Troubleshooting)](#capitolo-10-risoluzione-dei-problemi)

---

### Capitolo 01: Introduzione e Principi Operativi di MAIL-K
MAIL-K è un'applicazione web interna ad alta precisione ideata da ARKITECNA per gestire contatti commerciali B2B outbound, newsletter editoriali e generazione prospect qualificati.

> [!IMPORTANT]
> **Filosofia "Precision Outbound":** MAIL-K abolisce categoricamente l'uso di tracking pixel invisibili e redirect links. Questa scelta architetturale garantisce che le email risultino genuine al 100%, superando indenni i filtri anti-spam di Google Workspace e Microsoft 365.

---

### Capitolo 02: Accesso, Sicurezza e Social Login
- **URL protetto:** `/login` oppure cliccando su "ACCEDI" nella landing page.
- **Social SSO con 1 click:**
  - **Google OAuth** (Pulsante verde salvia `#92C775`)
  - **Facebook Login** (Pulsante blu Meta `#1877F2`)
  - **LinkedIn OIDC** (Pulsante blu scuro `#0A66C2`)
- **Isolamento dati:** Tutti i dati sono isolati a livello di database tramite PostgreSQL Row Level Security (RLS).

---

### Capitolo 03: Il Cruscotto Operativo Hub
Dalla vista principale (`/` e `/campaigns`), l'operatore accede alle tre aree monumentali:
1. **Email Massive:** Invii outbound con intervallo garantito e anti-burst.
2. **Newsletter Editoriali:** Liste iscritti e comunicazioni di valore.
3. **B2B Lead Intelligence:** Ricerca prospect mirati (pacchetti M, XL, AD-HOC).

---

### Capitolo 04: Modulo 1 — Campagne Outbound
1. **Wizard in 4 passi:**
   - **Step 1 Info:** Nome campagna, fuso orario di destinazione, intervallo (minimo 60s, default 240s) e cap giornaliero (default 80).
   - **Step 2 Template:** HTML paste area con sostituzione segnaposto `{{companyName}}`, `{{azienda}}`, `{{email}}`.
   - **Step 3 CSV:** Caricamento file, mappatura colonne e deduplicazione automatica.
   - **Step 4 Schedulazione:** Riepilogo e attivazione.
2. **Stati Campagna:** `Bozza`, `Attiva`, `In Pausa`, `Completata`.
3. **Pulsante "Invia Adesso":** Forza l'invio immediato del prossimo lead in coda per test rapido.

---

### Capitolo 05: Modulo 2 — Newsletter Editoriali
Tabelle e worker separati (`public.newsletters`, `public.newsletter_subscribers`) con blocco atomico PostgreSQL `FOR UPDATE SKIP LOCKED`. Gli invii non interferiscono con le campagne commerciali.

---

### Capitolo 06: Modulo 3 — B2B Lead Intelligence
- **Ricerca M ($19 USD):** Automatica (Tavily + OpenAI), tetto budget API $5.00 USD.
- **Ricerca XL ($49 USD):** Automatica approfondita multi-step, budget API fino a $15.00 USD.
- **Ricerca AD-HOC ($89 USD):** Assegnata a operatore umano specializzato, verifica 100% dei dati e consegna con **SLA 24 ore**.
- **Esportazione:** File Excel nativo `.xlsx` con foglio contatti e foglio fonti, oppure CSV protetto contro la Formula Injection.

---

### Capitolo 07: Monitoraggio Bounce & IMAP Hostinger
- **Modalità Read-Only Assoluta:** Connessione sulla porta 993 SSL con comando `EXAMINE` e `BODY.PEEK[]`. Nessuna email viene marcata come letta (`\Seen`) o cancellata.
- **Riconoscimento DSN RFC 3464:** Estrazione automatica dell'indirizzo rimbalzato e aggiornamento stato lead a `failed`.

---

### Capitolo 08: Configurazione Mittente & SMTP
Accessibile da `/settings`:
- Nome mittente e email di spedizione (Hostinger).
- Indirizzo `Reply-To`.
- Test connessione SMTP porta 465 SSL.
- Invio email di prova immediato.
- Test connessione IMAP porta 993 SSL.

---

### Capitolo 09: Motore di Schedulazione & Fusi Orari
- Invocazione ogni minuto da parte di Vercel Cron su `/api/cron/send`.
- Rispetto della finestra temporale: **Lunedì - Venerdì, ore 09:00 - 18:00** nel fuso orario configurato (Europe/Rome, America/New York, Asia/Makassar).

---

### Capitolo 10: Risoluzione dei Problemi
Guida passo-passo alla diagnosi di:
- Errori di autenticazione social (URI di reindirizzamento in Supabase).
- Errori credenziali SMTP/IMAP Hostinger.
- Campagne in pausa o fuori orario lavorativo.
- Validazione file CSV UTF-8.
