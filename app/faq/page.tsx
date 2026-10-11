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
    id: 'faq-1',
    category: 'deliverability',
    questionIt: 'In cosa si differenzia MAIL-K da un normale software di newsletter o da un CRM?',
    questionEn: 'How does MAIL-K differ from regular newsletter software or a CRM?',
    answerIt: 'MAIL-K è un motore di precisione progettato per inviare email commerciali B2B una alla volta (staggered sending) tramite una casella SMTP dedicata (Hostinger), replicando il comportamento umano e azzerando i rischi di finire in blacklist o cartella spam. Non è un CRM e non effettua burst sending di massa.',
    answerEn: 'MAIL-K is a precision engine engineered to dispatch B2B outbound emails strictly one by one (staggered sending) through a dedicated SMTP mailbox (Hostinger), mirroring human behavior and eliminating the risk of spam or blacklisting. It is not a CRM and does not perform burst sending.',
  },
  {
    id: 'faq-2',
    category: 'deliverability',
    questionIt: 'Perché MAIL-K non utilizza tracking pixel o link di reindirizzamento?',
    questionEn: 'Why does MAIL-K not use tracking pixels or redirect links?',
    answerIt: 'I pixel invisibili (1x1 gif) e i domini di reindirizzamento sono il primo segnale rilevato dai filtri anti-spam moderni (Google Workspace, Microsoft 365, Barracuda). L\'assenza deliberata di tracking garantisce la massima deliverability: la tua email arriva nella casella principale del prospect esattamente come se l\'avessi scritta a mano dal tuo client di posta.',
    answerEn: 'Invisible tracking pixels (1x1 GIFs) and link redirect domains are the primary triggers flagged by modern spam filters (Google Workspace, Microsoft 365, Barracuda). By intentionally removing tracking elements, MAIL-K guarantees optimal deliverability: your email lands in the recipient’s primary inbox just like a hand-crafted personal email.',
  },
  {
    id: 'faq-3',
    category: 'campaigns',
    questionIt: 'Con quale frequenza vengono spedite le email di una campagna?',
    questionEn: 'How frequently are campaign emails dispatched?',
    answerIt: 'Il sistema invia rigorosamente 1 singola email per ciclo di cron. L\'intervallo minimo configurabile è di 60 secondi, con un valore predefinito raccomandato di 240 secondi (4 minuti). Inoltre, è attivo un cap giornaliero di sicurezza (default 80 email al giorno per campagna).',
    answerEn: 'The system strictly transmits 1 single email per cron cycle. The minimum configurable interval is 60 seconds, with a recommended default of 240 seconds (4 minutes). In addition, an automatic safety cap (default 80 emails/day per campaign) is enforced.',
  },
  {
    id: 'faq-4',
    category: 'deliverability',
    questionIt: 'Cosa accade fuori dall\'orario lavorativo o durante il fine settimana?',
    questionEn: 'What happens outside business hours or during weekends?',
    answerIt: 'MAIL-K rispetta automaticamente la finestra lavorativa (lunedì-venerdì, ore 09:00 - 18:00 nel fuso orario di destinazione). Al di fuori di questa finestra, il cron riprogramma in automatico il prossimo invio alla mattina del primo giorno lavorativo utile, proteggendo la tua reputazione.',
    answerEn: 'MAIL-K automatically enforces business hours (Monday through Friday, 09:00 - 18:00 in the target recipient’s timezone). Outside this window, the cron scheduler reschedules the next dispatch to the morning of the next business day.',
  },
  {
    id: 'faq-5',
    category: 'smtpImap',
    questionIt: 'Come funziona il monitoraggio dei rimbalzi (Bounce) via IMAP Hostinger?',
    questionEn: 'How does IMAP bounce monitoring work with Hostinger?',
    answerIt: 'MAIL-K si collega alla tua casella Hostinger (imap.hostinger.com:993 SSL) in modalità rigorosamente protetta (Read-Only via comando IMAP EXAMINE e BODY.PEEK[]). Nessuna email personale viene mai marcata come letta o cancellata. Il sistema riconosce i rapporti DSN di mancato recapito (RFC 3464) e aggiorna lo stato del lead corrispondente su "failed".',
    answerEn: 'MAIL-K connects to your Hostinger mailbox (imap.hostinger.com:993 SSL) strictly in read-only mode using IMAP EXAMINE and BODY.PEEK[]. No personal email is ever marked as read or deleted. The system inspects DSN delivery reports (RFC 3464) and automatically updates bounced leads to "failed".',
  },
  {
    id: 'faq-6',
    category: 'leadResearch',
    questionIt: 'Qual è la differenza tra i pacchetti di Ricerca Leads M, XL e AD-HOC?',
    questionEn: 'What is the difference between Lead Research tiers M, XL, and AD-HOC?',
    answerIt: 'I pacchetti M ($19 USD) e XL ($49 USD) sono automatici e utilizzano Tavily Search ed estrazione strutturata OpenAI con tetti di spesa API predefiniti ($5 per M, $15 per XL). Il pacchetto AD-HOC ($89 USD) è gestito da un team umano specializzato con verifica manuale al 100% di ogni dato e consegna garantita con SLA di 24 ore.',
    answerEn: 'Tiers M ($19 USD) and XL ($49 USD) are automated, leveraging Tavily Search and OpenAI structured extraction with capped API budgets ($5 for M, $15 for XL). Tier AD-HOC ($89 USD) is conducted by a specialized human research team with 100% manual data verification and a strict 24-hour delivery SLA.',
  },
  {
    id: 'faq-7',
    category: 'leadResearch',
    questionIt: 'In che formato posso scaricare le liste di lead trovate?',
    questionEn: 'In what format can I download discovered lead lists?',
    answerIt: 'Puoi scaricare un foglio di calcolo Excel reale (.xlsx) completo di formattazione, filtri e foglio separato per le fonti web, oppure un file CSV con codifica UTF-8 BOM e protezione attiva contro la Formula Injection.',
    answerEn: 'You can download a native Excel spreadsheet (.xlsx) complete with cell styling, column filters, and a separate web sources worksheet, or a UTF-8 BOM CSV protected against formula injection.',
  },
  {
    id: 'faq-8',
    category: 'newsletters',
    questionIt: 'Le newsletter editoriali interferiscono con le campagne outbound commerciali?',
    questionEn: 'Do editorial newsletters interfere with commercial outbound campaigns?',
    answerIt: 'No. Il modulo Newsletter dispone di tabelle database dedicate e di un processo di lock atomico isolato. Le spedizioni editoriali e le sequenze outbound non si contendono le risorse né rallentano i rispettivi ritmi di invio.',
    answerEn: 'No. The Newsletters engine uses dedicated database tables and isolated atomic lock mechanisms. Editorial mailings and outbound sequences never compete for locks or disrupt each other’s sending pace.',
  },
  {
    id: 'faq-9',
    category: 'auth',
    questionIt: 'Quali modalità di accesso sono supportate per la console operativa?',
    questionEn: 'Which authentication methods are supported for the operating console?',
    answerIt: 'Puoi accedere con credenziali email e password aziendale, oppure con un singolo click tramite Google OAuth, Facebook Login o LinkedIn OIDC. Tutti i dati sono rigorosamente protetti da PostgreSQL Row Level Security (RLS).',
    answerEn: 'You can sign in with your corporate email and password, or via 1-click social SSO using Google OAuth, Facebook Login, or LinkedIn OIDC. All data is strictly isolated using PostgreSQL Row Level Security (RLS).',
  },
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
