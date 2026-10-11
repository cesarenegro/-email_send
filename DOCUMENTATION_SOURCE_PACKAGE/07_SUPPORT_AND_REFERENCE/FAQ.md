# DOMANDE FREQUENTI (FAQ) — MAIL-K PRECISION OUTBOUND

### 1. In cosa si differenzia MAIL-K da un normale software di newsletter o da un CRM?
MAIL-K è un motore specialistico di **Precision Outbound Dispatching**. Non è un CRM e non è un sistema di invio massivo a raffica. È progettato per inviare email B2B personalizzate una alla volta (staggered sending) attraverso una casella SMTP dedicata (Hostinger), replicando il comportamento umano e azzerando i rischi di finire in blacklist o cartella spam.

### 2. Perché non ci sono tracking pixel o link di reindirizzamento?
I pixel invisibili (immagini 1x1) e i domini di reindirizzamento dei link sono il primo fattore rilevato dai filtri anti-spam moderni (Google Workspace, Microsoft 365, Barracuda). L'assenza deliberata di tracking garantisce la massima deliverability assoluta: la tua email arriva nella posta in arrivo principale del destinatario esattamente come se l'avessi scritta a mano dal tuo client di posta.

### 3. Con quale frequenza vengono spedite le email?
Il sistema elabora rigorosamente **1 singola email per invocazione**. L'intervallo minimo configurabile è di 60 secondi, con un valore predefinito consigliato di 240 secondi (4 minuti). Inoltre, per proteggere la reputazione del dominio, è impostato un tetto massimo giornaliero di sicurezza (default 80 email al giorno per campagna).

### 4. Cosa succede nei fine settimana o fuori dall'orario lavorativo?
MAIL-K integra il motore temporale Luxon con supporto completo per i fusi orari (es. Europa/Roma, America/New York, Asia/Makassar). Le email vengono inviate esclusivamente dal lunedì al venerdì, all'interno della finestra oraria stabilita (es. 09:00 - 18:00 nel fuso orario di destinazione). Al di fuori di questa finestra, il cron riprogramma automaticamente il prossimo invio alla mattina del primo giorno lavorativo utile.

### 5. Come funziona il monitoraggio dei Bounce via IMAP?
MAIL-K si collega alla tua casella Hostinger via protocollo IMAP protetto (porta 993 SSL). L'accesso è **rigorosamente in sola lettura**: utilizza il comando `EXAMINE` e scarica i messaggi con `BODY.PEEK[]`. Questo garantisce che nessuna email venga contrassegnata come letta (`\Seen`) o cancellata. Il sistema riconosce i rapporti DSN di mancato recapito (RFC 3464), individua l'indirizzo non valido e aggiorna istantaneamente lo stato del lead su "failed", preservando lo storico degli errori.

### 6. Come funziona il modulo B2B Lead Intelligence?
Il modulo permette di richiedere liste di lead altamente qualificati inserendo un brief in linguaggio naturale (settore, città, requisiti). Sono disponibili tre pacchetti:
- **Ricerca M ($19 USD):** Automatica, combina OpenAI e Tavily con un budget API server limitato a $5.00 USD.
- **Ricerca XL ($49 USD):** Automatica avanzata con esplorazione multi-step, budget API fino a $15.00 USD.
- **Ricerca AD-HOC ($89 USD):** Assegnata a un team umano specializzato, con verifica manuale al 100% di ogni dato e consegna garantita entro 24 ore (SLA).
I risultati possono essere esportati in un foglio di calcolo Excel (`.xlsx`) reale o CSV protetto.

### 7. Come accedo alla piattaforma?
Puoi accedere inserendo le tue credenziali email e password fornite da ARKITECNA, oppure con un singolo click utilizzando il tuo account Google, Facebook o LinkedIn tramite l'autenticazione sicura OAuth / OIDC.
