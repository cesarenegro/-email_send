'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface FaqItem {
  id: string;
  category: 'campaigns' | 'newsletters' | 'leadResearch' | 'smtpImap' | 'deliverability' | 'auth';
  questionIt: string;
  questionEn: string;
  answerIt: string;
  answerEn: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    "id": "faq-camp-1",
    "category": "campaigns",
    "questionIt": "Con quale frequenza e ritmo vengono spedite le email di una campagna outbound?",
    "questionEn": "How frequently and at what pace are campaign outbound emails dispatched?",
    "answerIt": "MAIL-K invia rigorosamente 1 singola email per ciclo di cron, applicando una dilazione temporale controllata (staggered sending). L'intervallo predefinito raccomandato è di 240 secondi (4 minuti), con un minimo di sicurezza configurabile di 60 secondi. Inoltre, è attivo un cap giornaliero di sicurezza (default 80 email al giorno per campagna) per replicare perfettamente la cadenza di scrittura umana e proteggere il dominio.",
    "answerEn": "MAIL-K strictly transmits 1 single email per cron cycle using deliberate staggered sending. The recommended default interval is 240 seconds (4 minutes), with a configurable safety minimum of 60 seconds. A daily safety cap (default 80 emails/day per campaign) is also enforced to mirror natural human behavior and protect domain reputation."
  },
  {
    "id": "faq-camp-2",
    "category": "campaigns",
    "questionIt": "Come importare una lista di lead da CSV evitando errori di codifica o contatti duplicati?",
    "questionEn": "How do I import a CSV lead list while preventing encoding errors and duplicates?",
    "answerIt": "Dalla scheda della campagna puoi caricare qualsiasi file CSV (supporta separatori virgola e punto e virgola, con codifica UTF-8). Il sistema esegue una deduplica automatica basata sull'indirizzo email e permette di mappare i campi standard: email (obbligatorio), nome, cognome, azienda, note e fuso orario di destinazione.",
    "answerEn": "Within any campaign view, upload any CSV file (supporting comma or semicolon delimiters in UTF-8 encoding). The system automatically deduplicates records by email address and maps key attributes: email (required), first name, last name, company, notes, and recipient timezone."
  },
  {
    "id": "faq-camp-3",
    "category": "campaigns",
    "questionIt": "Come funziona la personalizzazione dei tag {{companyName}}, {{azienda}}, {{nome}} ed {{email}}?",
    "questionEn": "How does dynamic personalization for tags like {{companyName}}, {{azienda}}, {{nome}}, and {{email}} work?",
    "answerIt": "Nell'oggetto e nel corpo del messaggio puoi inserire segnaposto dinamici tra doppie parentesi graffe. Prima di ogni spedizione, il motore di templating sostituisce i tag con i dati effettivi del destinatario. Se un tag critico non è valorizzato nel record, MAIL-K blocca preventivamente l'invio di quel lead per evitare errori imbarazzanti con placeholder vuoti.",
    "answerEn": "You can insert dynamic double-brace placeholders into the subject and email body. Prior to each dispatch, the templating engine replaces them with actual lead data. If an essential placeholder is missing for a lead, MAIL-K safely aborts sending that specific message to prevent sending blank tags."
  },
  {
    "id": "faq-camp-4",
    "category": "campaigns",
    "questionIt": "Cosa accade quando metto in pausa una campagna attiva? Gli invii programmati vengono persi?",
    "questionEn": "What happens when I pause an active campaign? Are pending dispatches lost?",
    "answerIt": "Nessun dato viene mai perso. Quando metti in pausa una campagna, lo scheduler cron ignora temporaneamente i suoi lead: i messaggi già inviati rimangono registrati con data e ora, mentre i lead rimanenti rimangono congelati in stato 'pending'. Alla ripresa, il flusso riparte esattamente dal punto in cui era stato sospeso.",
    "answerEn": "No data is ever lost. Pausing a campaign causes the background cron scheduler to skip its queue: sent messages remain permanently recorded, while remaining leads remain safely queued in 'pending' status. When resumed, dispatch continues seamlessly from where it stopped."
  },
  {
    "id": "faq-camp-5",
    "category": "campaigns",
    "questionIt": "Come posso forzare un invio immediato di test (Send Now)?",
    "questionEn": "How can I trigger an immediate manual send (Send Now)?",
    "answerIt": "Accanto a ciascuna campagna attiva è presente il pulsante 'Invia Ora'. Cliccandolo, MAIL-K seleziona istantaneamente il primo lead disponibile in stato 'pending', compone il messaggio personalizzato e lo recapita subito tramite il relay SMTP, senza attendere il successivo ciclo automatico del cron.",
    "answerEn": "Each active campaign features a 'Send Now' button. Clicking it causes MAIL-K to immediately claim the next pending lead, render the personalized template, and transmit it through the SMTP relay without waiting for the next cron cycle."
  },
  {
    "id": "faq-news-1",
    "category": "newsletters",
    "questionIt": "In cosa si differenzia il modulo Newsletter dalle Campagne Outbound commerciali?",
    "questionEn": "How does the Newsletters module differ from commercial Outbound Campaigns?",
    "answerIt": "Le Campagne Outbound sono sequenze di prospezione 1-to-1 dirette a nuovi contatti professionali con cadenza fortemente dilatata. Le Newsletter Editoriali sono comunicazioni di valore per iscritti consolidati. Nel database, le newsletter dispongono di tabelle isolate (public.newsletters e public.newsletter_subscribers) e di un proprio gestore di lock atomico indipendente.",
    "answerEn": "Outbound Campaigns are staggered, 1-to-1 prospecting sequences sent to new professional contacts. Editorial Newsletters are structured announcements or digests sent to verified subscriber lists. Architecturally, newsletters use isolated database tables and a dedicated atomic lock mechanism so neither flow disrupts the other."
  },
  {
    "id": "faq-news-2",
    "category": "newsletters",
    "questionIt": "Posso pianificare una data e un orario preciso per la spedizione di una newsletter?",
    "questionEn": "Can I schedule an exact dispatch date and time for an editorial newsletter?",
    "answerIt": "Sì. In fase di creazione o modifica della newsletter puoi impostare lo stato su 'Pianificata' (scheduled) e indicare data e ora nel tuo fuso orario di riferimento. Lo scheduler cron verificherà la data stabilita e avvierà la sequenza al momento opportuno nel rispetto della finestra lavorativa.",
    "answerEn": "Yes. When authoring a newsletter, select the 'Scheduled' status and define your preferred release date and time in your operational timezone. The background scheduler evaluates the release time and begins dispatching subscribers in accordance with business hours."
  },
  {
    "id": "faq-news-3",
    "category": "newsletters",
    "questionIt": "Quali formati grafici e layout HTML sono supportati per le newsletter?",
    "questionEn": "Which visual styling and HTML layouts are supported for newsletters?",
    "answerIt": "Puoi comporre sia in testo semplice (plain-text) ad altissima leggibilità, sia con codice HTML inline compatibile con i principali client (Apple Mail, Microsoft Outlook desktop/mobile, Gmail). L'anteprima editoriale permette di verificare resa visiva, pesi tipografici e leggibilità prima della spedizione.",
    "answerEn": "You can write in clean high-contrast plain-text or using inline HTML email templates compatible across all major clients (Apple Mail, Microsoft Outlook desktop/mobile, Gmail). An integrated live preview lets you verify typography and formatting prior to sending."
  },
  {
    "id": "faq-news-4",
    "category": "newsletters",
    "questionIt": "Come vengono gestite le iscrizioni e le cancellazioni (opt-out) nelle newsletter?",
    "questionEn": "How are subscriber additions and opt-out requests managed for newsletters?",
    "answerIt": "Ogni newsletter traccia con precisione lo stato di ciascun iscritto (pending, sending, sent, failed). Nelle comunicazioni editoriali è possibile includere un piè di pagina con le istruzioni di cancellazione per garantire la piena conformità GDPR e tutelare la reputazione del mittente.",
    "answerEn": "Every newsletter accurately records subscriber statuses (pending, sending, sent, failed). Editorial templates support footer opt-out instructions to ensure full GDPR compliance and protect sender reputation."
  },
  {
    "id": "faq-lead-1",
    "category": "leadResearch",
    "questionIt": "Qual è la differenza tra i pacchetti di Ricerca Leads M, XL e AD-HOC?",
    "questionEn": "What is the difference between Lead Research tiers M, XL, and AD-HOC?",
    "answerIt": "I pacchetti M ($19 USD) e XL ($49 USD) sono automatici e utilizzano query mirate su Tavily Search con estrazione strutturata tramite modelli OpenAI (con budget di costo API vincolati a $5 per M e $15 per XL). Il pacchetto AD-HOC ($89 USD) è gestito interamente da analisti umani qualificati con verifica telefonica/web manuale al 100% e consegna con SLA rigoroso di 24 ore.",
    "answerEn": "Tiers M ($19 USD) and XL ($49 USD) are automated, leveraging targeted Tavily web search and OpenAI structured models (with strict API cost caps of $5 for M and $15 for XL). Tier AD-HOC ($89 USD) is conducted by human intelligence analysts with 100% manual phone/web verification and a strict 24-hour delivery SLA."
  },
  {
    "id": "faq-lead-2",
    "category": "leadResearch",
    "questionIt": "Cosa significa il principio 'Zero Dati Inventati' di MAIL-K?",
    "questionEn": "What does MAIL-K's 'Zero Invented Data' principle mean?",
    "answerIt": "La maggior parte dei software AI commette allucinazioni inventando email o fatturati non esistenti quando non trova fonti certe. MAIL-K vieta rigorosamente questo comportamento: se un attributo aziendale o un contatto non è comprovato da una fonte web verificata estratta durante la ricerca, il campo viene lasciato esplicitamente nullo (null). Ricevi solo dati reali e riscontrabili.",
    "answerEn": "Most AI tools hallucinate non-existent emails or revenue numbers when real evidence is missing. MAIL-K strictly enforces a zero-fabrication protocol: if an attribute or contact is not backed by verifiable web evidence during search, the field remains strictly null. You receive only genuine, defensible data."
  },
  {
    "id": "faq-lead-3",
    "category": "leadResearch",
    "questionIt": "In che formato posso scaricare le liste di lead individuate?",
    "questionEn": "In what format can I export discovered lead lists?",
    "answerIt": "Puoi esportare i dati in formato Excel nativo (.xlsx) con celle stilizzate, filtri automatici su ogni colonna e un foglio di lavoro dedicato con l'elenco di tutte le fonti web analizzate, oppure in formato CSV con codifica UTF-8 BOM e protezione attiva contro la Formula Injection.",
    "answerEn": "You can export data as a native Excel workbook (.xlsx) with styled headers, automatic column filters, and a dedicated worksheet cataloging all analyzed web sources, or as a UTF-8 BOM CSV protected against spreadsheet formula injection."
  },
  {
    "id": "faq-lead-4",
    "category": "leadResearch",
    "questionIt": "Come posso importare i lead trovati direttamente in una campagna outbound?",
    "questionEn": "How can I import discovered leads directly into an outbound campaign?",
    "answerIt": "Una volta completata la ricerca e scaricato il file CSV, basta aprire la campagna desiderata e cliccare su 'Importa CSV'. Le colonne vengono collegate automaticamente e i contatti sono pronti per la sequenza di invio con un singolo click.",
    "answerEn": "Once research finishes and you export the CSV file, open your target campaign and click 'Import CSV'. The columns map automatically, making the contacts immediately ready for scheduled dispatch in a single click."
  },
  {
    "id": "faq-lead-5",
    "category": "leadResearch",
    "questionIt": "Quali filtri geografici o di settore posso applicare nella ricerca lead?",
    "questionEn": "Which geographic or industry filters can I use during lead research?",
    "answerIt": "Il motore di ricerca supporta qualsiasi lingua e localizzazione geografica: puoi specificare paese, regione, città o codici postali, combinandoli con categorie merceologiche verticali (es. 'Studi di Architettura a Londra', 'Studi Notarili a Roma', 'Produttori di Arredo Lusso in Brianza').",
    "answerEn": "The research engine supports global queries and localized geographic targeting: specify country, region, city, or postal codes, combined with precise vertical industries (e.g., 'Architectural studios in London', 'Corporate law firms in Milan', 'Luxury yacht builders in Germany')."
  },
  {
    "id": "faq-smtp-1",
    "category": "smtpImap",
    "questionIt": "Quali parametri richiede Gestor Mail per funzionare correttamente con MAIL-K?",
    "questionEn": "Which parameters does Gestor Mail require to operate with MAIL-K?",
    "answerIt": "Gestor Mail richiede l'utilizzo della porta SMTP 465 con cifratura sicura SSL/TLS per l'invio delle email. Per il monitoraggio automatico dei rimbalzi, richiede la connessione IMAP sulla porta sicura 993 SSL. Entrambe le impostazioni sono configurabili dalla sezione /settings della console.",
    "answerEn": "Gestor Mail requires SMTP port 465 over SSL/TLS for outbound mail dispatch. For automated bounce monitoring, it requires IMAP port 993 over SSL. Both configurations can be tested and verified centrally within the /settings page."
  },
  {
    "id": "faq-smtp-2",
    "category": "smtpImap",
    "questionIt": "Come funziona il monitoraggio dei rimbalzi (Bounce) via IMAP in sola lettura?",
    "questionEn": "How does read-only IMAP bounce monitoring operate with Gestor Mail?",
    "answerIt": "MAIL-K accede alla casella Gestor Mail in modalità rigorosamente protetta Read-Only attraverso il comando IMAP EXAMINE e il prelievo degli header con BODY.PEEK[]. Nessuna email personale viene mai marcata come letta o eliminata. Il sistema analizza i messaggi DSN (RFC 3464), estrae l'indirizzo non recapitabile e contrassegna il lead corrispondente come 'failed'.",
    "answerEn": "MAIL-K accesses your Gestor Mail mailbox in strict read-only mode using IMAP EXAMINE and header inspection via BODY.PEEK[]. No personal message is ever marked as read, moved, or deleted. The system inspects RFC 3464 DSN failure reports, extracts bounced recipient addresses, and flags the corresponding lead as 'failed'."
  },
  {
    "id": "faq-smtp-3",
    "category": "smtpImap",
    "questionIt": "Posso inviare con un alias o un nome personalizzato diverso dall'indirizzo principale di Gestor Mail?",
    "questionEn": "Can I send using an alias or customized sender identity through Gestor Mail?",
    "answerIt": "Sì. Puoi autenticarti con l'account principale di Gestor Mail e specificare un nome mittente (es. 'Stefano Martini | ARKITECNA') e un indirizzo mittente o Reply-To personalizzato. Le impostazioni possono essere configurate sia a livello di singolo utente sia come fallback globale.",
    "answerEn": "Yes. You can authenticate using your primary Gestor Mail mailbox credentials while designating a customized sender name (e.g. 'Stefano Martini | ARKITECNA') and a customized Reply-To address. Preferences can be set per user profile or as global application fallbacks."
  },
  {
    "id": "faq-smtp-4",
    "category": "smtpImap",
    "questionIt": "Come posso collaudare le credenziali SMTP ed IMAP prima di avviare gli invii?",
    "questionEn": "How can I test SMTP and IMAP credentials before launching campaigns?",
    "answerIt": "Nella pagina Impostazioni (/settings) sono presenti tre strumenti diagnostici in tempo reale: 'Collaudo SMTP' per testare l'handshake crittografico, 'Verifica Connessione IMAP' per controllare la lettura della casella e 'Invia Email di Test' per ricevere un messaggio reale sulla tua casella personale.",
    "answerEn": "The Settings page (/settings) provides three real-time diagnostic tools: 'Test SMTP' to verify cryptographic handshake, 'Test IMAP Connection' to validate read-only inbox access, and 'Send Test Email' to transmit a live verification message directly to your personal mailbox."
  },
  {
    "id": "faq-smtp-5",
    "category": "smtpImap",
    "questionIt": "Cosa fare se il server Gestor Mail segnala un errore di autenticazione o quota?",
    "questionEn": "What should I do if Gestor Mail reports an authentication or quota error?",
    "answerIt": "Verifica innanzitutto che la password inserita nella sezione Impostazioni sia esatta e che l'account non abbia abilitato blocchi di sicurezza IP. Inoltre, assicurati che la casella non abbia superato la quota disco e che il limite di invii orari di Gestor Mail sia allineato con la cadenza impostata in MAIL-K.",
    "answerEn": "First verify that the password saved in Settings is current and that IP connection limits are not blocking authentication. Also ensure that the mailbox has not reached its storage quota and that Gestor Mail outbound rate limits match your MAIL-K pacing settings."
  },
  {
    "id": "faq-deliv-1",
    "category": "deliverability",
    "questionIt": "In cosa si differenzia MAIL-K da un normale software di newsletter o da un CRM?",
    "questionEn": "How does MAIL-K differ from regular newsletter software or a CRM?",
    "answerIt": "I mailer tradizionali inviano a pacchetti massivi (burst) da IP condivisi sovraffollati, venendo regolarmente etichettati come promozioni o spam. MAIL-K è un motore atelier di precisione che invia le email una alla volta da un relay dedicato Gestor Mail, simulando il comportamento naturale umano e azzerando i pattern sospetti.",
    "answerEn": "Traditional mailers send burst blasts from shared, overcrowded IP pools, frequently getting flagged as spam or promotions. MAIL-K is a precision atelier engine that dispatches emails strictly one by one through your dedicated Gestor Mail relay, replicating authentic human behavior and eliminating algorithmic footprints."
  },
  {
    "id": "faq-deliv-2",
    "category": "deliverability",
    "questionIt": "Perché MAIL-K non utilizza tracking pixel o link di reindirizzamento?",
    "questionEn": "Why does MAIL-K not use tracking pixels or redirect links?",
    "answerIt": "I pixel spia (1x1 gif) e i domini di reindirizzamento sono il primo indicatore analizzato dai filtri di Google Workspace, Microsoft Defender e Barracuda. Eliminando deliberatamente questi elementi di tracciamento, l'email risulta autentica e atterra nella casella principale del destinatario esattamente come un'email scritta a mano.",
    "answerEn": "Tracking pixels (1x1 invisible GIFs) and domain redirect URLs are immediately flagged by modern spam filters like Google Workspace, Microsoft Defender, and Barracuda. By intentionally omitting tracking mechanisms, your message lands directly in the recipient's primary inbox just like a hand-typed message."
  },
  {
    "id": "faq-deliv-3",
    "category": "deliverability",
    "questionIt": "Come gestisce MAIL-K i fusi orari dei destinatari internazionali?",
    "questionEn": "How does MAIL-K handle timezones for international prospects?",
    "answerIt": "Ogni lead possiede un attributo di fuso orario (es. Europe/Rome, America/New_York, Asia/Tokyo). Prima di ogni invio, il motore calcola l'ora locale del destinatario: se è fuori dall'intervallo lavorativo (09:00 - 18:00 lun-ven), l'invio viene posticipato alla mattina lavorativa successiva del fuso del prospect.",
    "answerEn": "Each contact stores a timezone attribute (e.g. Europe/Rome, America/New_York, Asia/Tokyo). Before dispatching, the engine computes the recipient's local time: if outside standard business hours (09:00 - 18:00 Mon-Fri), dispatch is deferred to the next business morning in the prospect's timezone."
  },
  {
    "id": "faq-deliv-4",
    "category": "deliverability",
    "questionIt": "Come configurare i record DNS (SPF, DKIM, DMARC) per garantire il 100% di recapito?",
    "questionEn": "How do I configure DNS records (SPF, DKIM, DMARC) for 100% delivery?",
    "answerIt": "Nel pannello di gestione del tuo dominio devi impostare: record SPF che autorizza i server Gestor Mail, record DKIM a 2048-bit per la firma crittografica di ogni email e record DMARC con policy di monitoraggio. Quando questi tre record sono allineati, i filtri antispam riconoscono il tuo dominio come certificato.",
    "answerEn": "In your DNS management console, set up: an SPF record authorizing Gestor Mail servers, a 2048-bit DKIM record to cryptographically sign every email, and a DMARC policy record. When these three records align, receiving mail servers recognize your domain as verified and trustworthy."
  },
  {
    "id": "faq-deliv-5",
    "category": "deliverability",
    "questionIt": "Cosa accade fuori dall'orario lavorativo o durante il fine settimana?",
    "questionEn": "What happens outside business hours or during weekends?",
    "answerIt": "Inviare email commerciali di notte o nel fine settimana aumenta del 400% il rischio di essere contrassegnati come spam. MAIL-K rispetta automaticamente la finestra lavorativa (lunedì-venerdì, ore 09:00 - 18:00): nei giorni festivi o nelle ore notturne, il cron va in pausa e programma automaticamente il rilascio alla mattina del primo giorno lavorativo utile.",
    "answerEn": "Sending commercial prospecting emails at night or during weekends increases spam complaint rates by 400%. MAIL-K automatically enforces business hours (Monday-Friday, 09:00 - 18:00): during weekends and evenings, the scheduler suspends dispatches and resumes on the next business morning."
  },
  {
    "id": "faq-auth-1",
    "category": "auth",
    "questionIt": "Quali modalità di accesso sono supportate per la console operativa?",
    "questionEn": "Which authentication methods are supported for the operating console?",
    "answerIt": "Puoi accedere con credenziali email e password aziendale, oppure con un singolo click tramite Single Sign-On (Google Workspace, Facebook Login o LinkedIn OIDC). Tutti i token di sessione sono gestiti con standard crittografici conformi a OAuth 2.0 e JWT.",
    "answerEn": "You can sign in with your corporate email and password, or via 1-click Single Sign-On using Google Workspace, Facebook Login, or LinkedIn OIDC. All session tokens are secured following OAuth 2.0 and JWT standards."
  },
  {
    "id": "faq-auth-2",
    "category": "auth",
    "questionIt": "I miei lead, le mie campagne e le mie email sono protetti e riservati?",
    "questionEn": "Are my leads, campaigns, and email templates protected and confidential?",
    "answerIt": "Sì. Il database PostgreSQL su Supabase applica le policy di sicurezza a livello di riga (Row Level Security - RLS). Ogni utente ha accesso rigorosamente e solo ai propri record: è tecnicamente impossibile che un altro account veda o modifichi le tue campagne, i tuoi lead o i tuoi template.",
    "answerEn": "Yes. The underlying Supabase PostgreSQL database enforces strict Row Level Security (RLS) policies. Every user can only read and modify their own records: it is mathematically impossible for another user to view or modify your campaigns, leads, or templates."
  },
  {
    "id": "faq-auth-3",
    "category": "auth",
    "questionIt": "Come posso reimpostare la password se perdo le credenziali d'accesso?",
    "questionEn": "How can I reset my password if I lose my login credentials?",
    "answerIt": "Nella schermata di login (/login), clicca su 'Password dimenticata?'. Inserisci l'email del tuo account e riceverai un link di ripristino sicuro che ti permetterà di impostare una nuova password crittografata in totale autonomia.",
    "answerEn": "On the login page (/login), click 'Forgot password?'. Enter your account email address to receive a secure recovery link allowing you to safely set a new encrypted password."
  }
];

export default function FaqPage() {
  const { t, locale } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_DATA[0].id);

  const categories = [
    { key: 'all', label: t.faqPage.categories.all },
    { key: 'campaigns', label: t.faqPage.categories.campaigns },
    { key: 'newsletters', label: t.faqPage.categories.newsletters },
    { key: 'leadResearch', label: t.faqPage.categories.leadResearch },
    { key: 'smtpImap', label: t.faqPage.categories.smtpImap },
    { key: 'deliverability', label: t.faqPage.categories.deliverability },
    { key: 'auth', label: t.faqPage.categories.auth },
  ];

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const question = locale === 'en' ? item.questionEn : item.questionIt;
      const answer = locale === 'en' ? item.answerEn : item.answerIt;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || question.toLowerCase().includes(query) || answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, locale]);

  const toggleAccordion = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#1b1c1a] font-body-lg antialiased selection:bg-[#5cb855]/20 selection:text-[#036e13]">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-40 bg-[#fbf9f6]/90 backdrop-blur-md border-b border-[#eae8e5]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-20 max-w-[1440px] mx-auto px-6 sm:px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-xs border border-[#e5e5e0]">
                <img src="/icon.png" alt="MAIL-K" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-md text-xl tracking-wider text-[#1b1c1a] uppercase font-bold">
                  MAIL-K
                </span>
                <span className="font-label-sm text-[10px] tracking-widest text-[#036e13] font-bold uppercase -mt-0.5">
                  SUPPORT & FAQ
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="transparent" />
            <Link
              href="/guida"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c5e63] hover:text-[#036e13] transition-colors px-3 py-2 rounded-lg hover:bg-black/5"
            >
              <span>{t.navigation.userGuide}</span>
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center justify-center bg-[#5cb855] hover:bg-[#036e13] text-white font-label-md text-xs uppercase px-4 py-2 rounded-lg shadow-xs transition-all font-semibold tracking-wider"
            >
              {t.faqPage.backToApp}
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1100px] mx-auto px-6 pt-32 pb-24">
        {/* HERO SECTION */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 bg-[#5cb855]/15 text-[#036e13] text-xs font-bold uppercase tracking-wider rounded-full mb-3 border border-[#5cb855]/30">
            {t.faqPage.badge}
          </span>
          <h1 className="font-headline-xl text-3xl sm:text-4xl font-bold text-[#1b1c1a] mb-4">
            {t.faqPage.title}
          </h1>
          <p className="font-body-md text-sm sm:text-base text-[#5c5e63] leading-relaxed">
            {t.faqPage.subtitle}
          </p>

          {/* SEARCH BAR */}
          <div className="mt-8 relative max-w-lg mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.faqPage.searchPlaceholder}
              className="w-full h-12 pl-11 pr-4 bg-white border border-[#eae8e5] rounded-xl shadow-xs text-sm text-[#1b1c1a] placeholder-[#6f7a6b] focus:outline-none focus:border-[#5cb855] focus:ring-2 focus:ring-[#5cb855]/20 transition-all"
            />
            <svg
              className="w-5 h-5 absolute left-3.5 top-3.5 text-[#6f7a6b]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-xs text-[#6f7a6b] hover:text-[#1b1c1a]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-[#1b1c1a] text-white shadow-xs'
                  : 'bg-white text-[#5c5e63] border border-[#eae8e5] hover:border-[#1b1c1a]/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQS ACCORDION LIST */}
        <div className="space-y-3.5 max-w-3xl mx-auto">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#eae8e5] p-12 text-center text-[#5c5e63]">
              <p className="text-sm font-medium">Nessuna domanda trovata per i criteri specificati.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs text-[#036e13] font-semibold underline"
              >
                Ripristina tutti i filtri
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              const question = locale === 'en' ? faq.questionEn : faq.questionIt;
              const answer = locale === 'en' ? faq.answerEn : faq.answerIt;

              return (
                <div
                  key={faq.id}
                  className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                    isOpen ? 'border-[#5cb855]/60 shadow-md ring-1 ring-[#5cb855]/20' : 'border-[#eae8e5] hover:border-[#eae8e5]/80 shadow-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  >
                    <span className="font-semibold text-sm sm:text-base text-[#1b1c1a] leading-snug">
                      {question}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs transition-transform duration-200 ${
                        isOpen ? 'bg-[#5cb855] text-white rotate-180' : 'bg-[#f5f3f0] text-[#5c5e63]'
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-[#5c5e63] leading-relaxed border-t border-[#eae8e5]/40 animate-in fade-in duration-200">
                      {answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM HELP / CONTACT BOX */}
        <div className="mt-16 max-w-2xl mx-auto bg-white rounded-2xl border border-[#eae8e5] p-8 text-center shadow-sm relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#5cb855]/10 rounded-full blur-2xl pointer-events-none" />
          <h3 className="font-headline-md text-lg font-bold text-[#1b1c1a] mb-2">
            {t.faqPage.contactTitle}
          </h3>
          <p className="text-xs sm:text-sm text-[#5c5e63] mb-5 leading-relaxed">
            {t.faqPage.contactSub}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-[#1b1c1a] hover:bg-[#036e13] text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
            >
              {t.faqPage.contactAction}
            </Link>
            <Link
              href="/guida"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-[#f5f3f0] hover:bg-[#e8e6e3] text-[#1b1c1a] text-xs font-semibold rounded-lg transition-all"
            >
              {t.userGuidePage.title}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
