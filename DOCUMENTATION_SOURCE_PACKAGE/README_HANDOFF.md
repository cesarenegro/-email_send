# DOCUMENTATION SOURCE PACKAGE — MAIL-K (PRECISION OUTBOUND)

**Versione Pacchetto:** 1.4.0  
**Data Generazione:** 11 Ottobre 2026  
**Autore:** Antigravity (Coder / Documentation Extractor)  
**Destinatario:** Proprietà / Technical Writer / Utenti Finali  
**Protocollo Operativo:** `E:\###ISTRUZIONI_CODER_MANUALE_UTENTE per ag.md`  

---

## 1. Struttura del Pacchetto di Consegna

```text
DOCUMENTATION_SOURCE_PACKAGE/
├── README_HANDOFF.md                   # Questo documento di sintesi e consegna
├── MANUALE_UTENTE.txt                  # DELIVERABLE PRINCIPALE: Testo integrale del Manuale Utente
├── MANUALE_UTENTE.md                   # Versione Markdown con link e callout visivi
├── 00_PROJECT/
│   ├── PROJECT_FACTS.yml               # Parametri macchina e configurazione di release
│   ├── EVIDENCE_LEDGER.csv             # Tracciabilità univoca evidenze di codice (EVD-XXXX)
│   ├── RELEASE_AND_ENVIRONMENT.md      # Specifiche degli ambienti di produzione e sviluppo
│   └── EXCLUSIONS.md                   # Perimetro delimitato ed esclusioni deliberate
├── 01_PRODUCT_DISCOVERY/
│   ├── ROUTE_INVENTORY.csv             # Censimento di tutte le rotte pubbliche e protette
│   └── SCREEN_INVENTORY.csv            # Censimento di tutte le superfici applicative (SCR-XXXX)
├── 04_MERMAID/
│   ├── SYSTEM_NAVIGATION.mmd           # Diagramma di flusso della navigazione globale
│   ├── PIPE-001-invio-scaglionato.mmd  # Pipeline cron, lock PostgreSQL e invio SMTP
│   └── PIPE-002-sync-bounce-imap.mmd   # Pipeline IMAP Read-Only e parsing DSN bounce
├── 05_SCREENSHOTS/
│   ├── SCREENSHOT_MANIFEST.csv         # Registro degli screenshot acquisiti
│   └── desktop/
│       ├── SCR-013-faq-page.png        # Screenshot live pagina FAQ
│       └── SCR-014-guida-page.png      # Screenshot live pagina Guida Utente
└── 07_SUPPORT_AND_REFERENCE/
    └── FAQ.md                          # Domande Frequenti con risposte operative
```

---

## 2. Pagine Integrate Direttamente nel Software Web

1. **`/faq` — Domande Frequenti (FAQ):**
   - Pagina reattiva bilingue con ricerca live istantanea e filtri di categoria.
   - Accessibile sia pubblicamente dalla landing page sia internamente dalla sidebar dell'applicazione.
2. **`/guida` — Guida Utente Interattiva:**
   - Console di consultazione integrata a due colonne con Table of Contents (TOC) sticky laterale.
   - Pulsante di download diretto del manuale ufficiale: `public/downloads/MANUALE_UTENTE.txt`.
