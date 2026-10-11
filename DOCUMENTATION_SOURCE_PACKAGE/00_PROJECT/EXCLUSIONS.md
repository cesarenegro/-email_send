# ESCLUSIONI E DELIMITAZIONE DEL PERIMETRO DI RELEASE (MAIL-K)

In conformità con il documento originario `ARKITECNA_MAILER_AG_BUILD_INSTRUCTIONS.md` e con il protocollo `E:\###ISTRUZIONI_CODER_MANUALE_UTENTE per ag.md`, le seguenti funzionalità sono **deliberatamente escluse** dal perimetro di MAIL-K per garantire la massima semplicità, affidabilità e deliverability:

1. **Nessun Tracking Pixel o Link Redirector:**
   - MAIL-K non inserisce pixel invisibili di tracciamento apertura (1x1 gif) né riscrive i link con redirect di tracking. Questo preserva la reputazione dell'IP e del dominio evitando filtri anti-spam severi e quarantena DNS.
2. **Nessun CRM / Sales Pipeline:**
   - Non sono presenti deal, stadi di trattativa, note di contatto, task o calendari di vendita. L'applicazione è un motore specialistico di precision dispatching.
3. **Nessun Warm-up Automatico di Caselle:**
   - L'applicazione presuppone che la casella SMTP (Hostinger) sia già attiva e correttamente configurata con record DNS SPF, DKIM e DMARC.
4. **Nessun Invio Massivo Istantaneo a Raffica:**
   - È vietata per architettura la spedizione contemporanea di decine o centinaia di email. Il motore impone tassativamente **1 singola email per invocazione cron** a intervalli calcolati (default 240 secondi).
5. **Nessun Editor Drag & Drop Grafico:**
   - Non è presente un builder visivo tipo Mailchimp. Il template HTML viene preparato esternamente (es. da agenzia o tool dedicato) e incollato nel sorgente, con pieno controllo del codice e del peso HTML (<150 KB raccomandato).
6. **Nessun Multi-Mailbox o Rotazione Caselle SMTP:**
   - Ogni spedizione outbound impiega la casella configurata per l'utente/progetto (Hostinger SMTP Relay).
