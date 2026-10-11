'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Chapter {
  id: string;
  titleIt: string;
  titleEn: string;
  badge: string;
  contentIt: React.ReactNode;
  contentEn: React.ReactNode;
}

export default function UserGuidePage() {
  const { t, locale } = useTranslation();
  const [activeSection, setActiveSection] = useState('cap-1');

  const chapters: Chapter[] = [
    {
      id: 'cap-1',
      titleIt: '1. Introduzione & Principi Operativi',
      titleEn: '1. Introduction & Operating Principles',
      badge: 'Architettura',
      contentIt: (
        <div className="space-y-4">
          <p>
            <strong>MAIL-K</strong> è un motore specialistico di <em>Precision Outbound Dispatching</em> sviluppato internamente per ARKITECNA. A differenza dei software massivi commerciali, MAIL-K invia email B2B autentiche, scaglionate nel tempo, per raggiungere la casella principale del destinatario e preservare la reputazione del dominio.
          </p>
          <div className="p-4 bg-[#f5f3f0] rounded-xl border border-[#eae8e5] text-xs space-y-2">
            <div className="font-bold text-[#036e13] uppercase tracking-wider flex items-center gap-1.5">
              <span>✓</span> Zero Tracking Pixels & Zero Link Redirects
            </div>
            <p className="text-[#5c5e63]">
              I filtri anti-spam moderni (Google Workspace, Microsoft 365) penalizzano le email che contengono pixel invisibili di apertura o link riscritti. MAIL-K spedisce email 100% genuine dal tuo server SMTP Hostinger, identiche a quelle scritte a mano da un client di posta.
            </p>
          </div>
          <ul className="list-disc pl-5 text-sm text-[#5c5e63] space-y-1.5">
            <li><strong>Invio rigorosamente scaglionato:</strong> 1 sola email per ciclo di cron (default 240 secondi).</li>
            <li><strong>Cap giornaliero di sicurezza:</strong> limite di default a 80 email/giorno per campagna.</li>
            <li><strong>Finestra lavorativa automatica:</strong> invii attivi solo lunedì-venerdì, ore 09:00 - 18:00 nel fuso orario target.</li>
          </ul>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            <strong>MAIL-K</strong> is an internal high-precision <em>B2B Outbound Dispatching Engine</em> developed for ARKITECNA. Unlike mass-market bulk tools, MAIL-K sends authentic, staggered emails to ensure primary inbox delivery while safeguarding domain reputation.
          </p>
          <div className="p-4 bg-[#f5f3f0] rounded-xl border border-[#eae8e5] text-xs space-y-2">
            <div className="font-bold text-[#036e13] uppercase tracking-wider flex items-center gap-1.5">
              <span>✓</span> Zero Tracking Pixels & Zero Link Redirects
            </div>
            <p className="text-[#5c5e63]">
              Modern spam filters (Google Workspace, Microsoft 365) penalize emails containing tracking pixels or rewritten URLs. MAIL-K dispatches 100% genuine emails directly through your Hostinger SMTP, indistinguishable from hand-typed messages.
            </p>
          </div>
          <ul className="list-disc pl-5 text-sm text-[#5c5e63] space-y-1.5">
            <li><strong>Strict Staggered Dispatch:</strong> 1 single email per cron cycle (default 240 seconds).</li>
            <li><strong>Daily Safety Cap:</strong> Default limit of 80 emails/day per campaign.</li>
            <li><strong>Automated Business Hours:</strong> Sending active only Monday-Friday, 09:00 - 18:00 in the target timezone.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'cap-2',
      titleIt: '2. Accesso & Social Login (SSO)',
      titleEn: '2. Access & Social Login (SSO)',
      badge: 'Sicurezza',
      contentIt: (
        <div className="space-y-4">
          <p>
            L'accesso alla console operativa avviene all'indirizzo <code>/login</code> o cliccando su "ACCEDI" nella landing page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
            <div className="p-3 bg-white rounded-xl border border-[#eae8e5] text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#92C775] inline-block mb-1"></span>
              <div className="text-xs font-bold text-[#1b1c1a]">Google OAuth</div>
              <p className="text-[11px] text-[#5c5e63] mt-1">Accesso 1-click tramite Google Workspace</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#eae8e5] text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] inline-block mb-1"></span>
              <div className="text-xs font-bold text-[#1b1c1a]">Facebook Login</div>
              <p className="text-[11px] text-[#5c5e63] mt-1">Autenticazione rapida tramite profilo Meta</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#eae8e5] text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2] inline-block mb-1"></span>
              <div className="text-xs font-bold text-[#1b1c1a]">LinkedIn OIDC</div>
              <p className="text-[11px] text-[#5c5e63] mt-1">OpenID Connect per profili manageriali B2B</p>
            </div>
          </div>
          <p className="text-xs text-[#5c5e63]">
            Tutti i dati dell'account sono isolati a livello di database tramite PostgreSQL Row Level Security (RLS). Nessun altro utente può visualizzare le tue campagne o i tuoi lead.
          </p>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            Access the operating console at <code>/login</code> or by clicking "SIGN IN" on the landing page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
            <div className="p-3 bg-white rounded-xl border border-[#eae8e5] text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#92C775] inline-block mb-1"></span>
              <div className="text-xs font-bold text-[#1b1c1a]">Google OAuth</div>
              <p className="text-[11px] text-[#5c5e63] mt-1">1-click sign-in with Google Workspace</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#eae8e5] text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] inline-block mb-1"></span>
              <div className="text-xs font-bold text-[#1b1c1a]">Facebook Login</div>
              <p className="text-[11px] text-[#5c5e63] mt-1">Instant verification via Meta profile</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#eae8e5] text-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0A66C2] inline-block mb-1"></span>
              <div className="text-xs font-bold text-[#1b1c1a]">LinkedIn OIDC</div>
              <p className="text-[11px] text-[#5c5e63] mt-1">OpenID Connect for executive B2B profiles</p>
            </div>
          </div>
          <p className="text-xs text-[#5c5e63]">
            All account records are isolated at the database level using PostgreSQL Row Level Security (RLS). No other operator can access your campaigns or lead records.
          </p>
        </div>
      ),
    },
    {
      id: 'cap-3',
      titleIt: '3. Campagne Outbound a Spedizione Scaglionata',
      titleEn: '3. Staggered Outbound Campaigns',
      badge: 'Modulo 1',
      contentIt: (
        <div className="space-y-4">
          <p>
            Il modulo Campagne (<code>/campaigns</code>) consente di creare sequenze outbound partendo da un elenco CSV di contatti e da un template HTML.
          </p>
          <div className="space-y-2">
            <div className="font-semibold text-xs text-[#1b1c1a]">Procedura di Creazione (Wizard in 4 Passi):</div>
            <ol className="list-decimal pl-5 text-sm text-[#5c5e63] space-y-1.5">
              <li><strong>Info Campagna:</strong> Inserisci il nome, seleziona il fuso orario locale (default <em>Europe/Rome</em>), imposta l'intervallo tra invii (default 240 secondi) e il limite giornaliero (default 80).</li>
              <li><strong>Template HTML:</strong> Incolla il codice HTML del messaggio e inserisci l'oggetto. Usa i segnaposto dinamici <code>{`{{companyName}}`}</code> o <code>{`{{azienda}}`}</code> e <code>{`{{email}}`}</code>.</li>
              <li><strong>Caricamento CSV:</strong> Carica il file CSV e mappa le colonne. Il sistema effettua in automatico la deduplicazione evitando contatti doppi.</li>
              <li><strong>Riepilogo e Attivazione:</strong> Verifica i parametri e attiva la campagna. Il cron inizierà a inviare un'email ogni intervallo prestabilito.</li>
            </ol>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
            <strong>Pulsante "Invia Adesso":</strong> Dalla schermata di dettaglio puoi inviare immediatamente il primo lead in coda per collaudare la consegna senza attendere il ciclo di cron.
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            The Campaigns engine (<code>/campaigns</code>) enables creation of outbound sequences from CSV lists and custom HTML templates.
          </p>
          <div className="space-y-2">
            <div className="font-semibold text-xs text-[#1b1c1a]">Creation Flow (4-Step Wizard):</div>
            <ol className="list-decimal pl-5 text-sm text-[#5c5e63] space-y-1.5">
              <li><strong>Campaign Details:</strong> Set name, local timezone (default <em>Europe/Rome</em>), send interval (default 240s), and daily limit (default 80).</li>
              <li><strong>HTML Template:</strong> Paste the HTML email markup and subject line. Insert dynamic tags <code>{`{{companyName}}`}</code> or <code>{`{{azienda}}`}</code> and <code>{`{{email}}`}</code>.</li>
              <li><strong>CSV Import:</strong> Upload your CSV and map columns. Automatic deduplication prevents duplicate dispatches.</li>
              <li><strong>Review & Activate:</strong> Confirm and launch. The background scheduler dispatches one lead per slot.</li>
            </ol>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
            <strong>"Send Now" Action:</strong> Inside campaign details, you can manually trigger the next pending lead immediately for verification without waiting for cron.
          </div>
        </div>
      ),
    },
    {
      id: 'cap-4',
      titleIt: '4. Newsletter Editoriali Programmate',
      titleEn: '4. Scheduled Brand Newsletters',
      badge: 'Modulo 2',
      contentIt: (
        <div className="space-y-4">
          <p>
            Il modulo Newsletter (<code>/newsletters</code>) gestisce pubblicazioni periodiche, aggiornamenti istituzionali e annunci commerciali verso liste di iscritti.
          </p>
          <ul className="list-disc pl-5 text-sm text-[#5c5e63] space-y-1.5">
            <li><strong>Worker Indipendente:</strong> Opera su tabelle dedicate (<code>newsletters</code> e <code>newsletter_subscribers</code>) con lock atomico <code>FOR UPDATE SKIP LOCKED</code>.</li>
            <li><strong>Nessun Conflitto:</strong> Le newsletter non rallentano né interrompono le campagne outbound commerciali attive.</li>
            <li><strong>Stati Monitorati:</strong> Bozza, Programmata, In Spedizione, Inviata, In Pausa.</li>
          </ul>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            The Newsletters module (<code>/newsletters</code>) manages regular editorial broadcasts, announcements, and stakeholder publications.
          </p>
          <ul className="list-disc pl-5 text-sm text-[#5c5e63] space-y-1.5">
            <li><strong>Independent Worker:</strong> Utilizes dedicated tables (<code>newsletters</code> and <code>newsletter_subscribers</code>) with atomic <code>FOR UPDATE SKIP LOCKED</code>.</li>
            <li><strong>Zero Contention:</strong> Newsletter runs never block or delay commercial outbound campaigns.</li>
            <li><strong>Tracked States:</strong> Draft, Scheduled, Sending, Sent, Paused.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'cap-5',
      titleIt: '5. B2B Lead Intelligence (M, XL, AD-HOC)',
      titleEn: '5. B2B Lead Intelligence (M, XL, AD-HOC)',
      badge: 'Modulo 3',
      contentIt: (
        <div className="space-y-4">
          <p>
            Il modulo <strong>Lead Intelligence</strong> (<code>/lead-research</code>) permette di reperire elenchi profilati di prospect aziendali fornendo un semplice brief in italiano.
          </p>
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs text-left border border-[#eae8e5] rounded-xl overflow-hidden">
              <thead className="bg-[#f5f3f0] text-[#1b1c1a] font-bold">
                <tr>
                  <th className="p-3">Pacchetto</th>
                  <th className="p-3">Prezzo</th>
                  <th className="p-3">Metodologia</th>
                  <th className="p-3">Budget Server</th>
                  <th className="p-3">SLA Consegna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae8e5] text-[#5c5e63]">
                <tr>
                  <td className="p-3 font-semibold text-[#1b1c1a]">Ricerca M</td>
                  <td className="p-3 font-bold text-[#036e13]">$19 USD</td>
                  <td className="p-3">Automatica (Tavily + OpenAI)</td>
                  <td className="p-3">$5.00 USD (5.000.000 µUSD)</td>
                  <td className="p-3">Istantanea</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#1b1c1a]">Ricerca XL</td>
                  <td className="p-3 font-bold text-[#036e13]">$49 USD</td>
                  <td className="p-3">Automatica multi-step avanzata</td>
                  <td className="p-3">$15.00 USD (15.000.000 µUSD)</td>
                  <td className="p-3">Multi-step</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#1b1c1a]">Ricerca AD-HOC</td>
                  <td className="p-3 font-bold text-[#036e13]">$89 USD</td>
                  <td className="p-3">Team Umano Specializzato</td>
                  <td className="p-3">Verifica manuale 100%</td>
                  <td className="p-3 font-bold text-[#1b1c1a]">Entro 24 ore</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#5c5e63]">
            <strong>Esportazione XLSX e CSV:</strong> Tutti i risultati possono essere scaricati in un foglio di calcolo Excel con fonti verificate o in CSV protetto contro la Formula Injection.
          </p>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            The <strong>Lead Intelligence</strong> engine (<code>/lead-research</code>) finds targeted business contacts and accounts based on a plain-language brief.
          </p>
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs text-left border border-[#eae8e5] rounded-xl overflow-hidden">
              <thead className="bg-[#f5f3f0] text-[#1b1c1a] font-bold">
                <tr>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Methodology</th>
                  <th className="p-3">Server Budget</th>
                  <th className="p-3">Delivery SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae8e5] text-[#5c5e63]">
                <tr>
                  <td className="p-3 font-semibold text-[#1b1c1a]">Research M</td>
                  <td className="p-3 font-bold text-[#036e13]">$19 USD</td>
                  <td className="p-3">Automated (Tavily + OpenAI)</td>
                  <td className="p-3">$5.00 USD (5,000,000 µUSD)</td>
                  <td className="p-3">Real-time</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#1b1c1a]">Research XL</td>
                  <td className="p-3 font-bold text-[#036e13]">$49 USD</td>
                  <td className="p-3">Deep multi-step automated</td>
                  <td className="p-3">$15.00 USD (15,000,000 µUSD)</td>
                  <td className="p-3">Multi-step</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#1b1c1a]">Research AD-HOC</td>
                  <td className="p-3 font-bold text-[#036e13]">$89 USD</td>
                  <td className="p-3">Specialized Human Staff</td>
                  <td className="p-3">100% manual validation</td>
                  <td className="p-3 font-bold text-[#1b1c1a]">Within 24 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#5c5e63]">
            <strong>XLSX & CSV Export:</strong> All leads can be exported as a native Excel sheet with audit source links or sanitized CSV with formula injection protection.
          </p>
        </div>
      ),
    },
    {
      id: 'cap-6',
      titleIt: '6. Monitoraggio Bounce & IMAP Hostinger',
      titleEn: '6. Bounce Tracking & Hostinger IMAP',
      badge: 'Diagnostica',
      contentIt: (
        <div className="space-y-4">
          <p>
            MAIL-K dialoga con la casella Hostinger (<code>imap.hostinger.com:993</code>) per individuare automaticamente le email non recapitate.
          </p>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <div className="font-bold uppercase tracking-wider">Garanzia di Sicurezza Read-Only:</div>
            <p>
              L'accesso avviene tramite il comando di basso livello <code>EXAMINE</code> e il download con <code>BODY.PEEK[]</code>. Nessuna email viene mai contrassegnata come letta (<code>\Seen</code>), spostata o eliminata. La tua posta in arrivo rimane incontaminata.
            </p>
          </div>
          <p className="text-xs text-[#5c5e63]">
            Il parser RFC 3464 individua i messaggi di errore da MAILER-DAEMON o postmaster, estrae l'indirizzo email non valido e imposta lo stato su <strong>"failed"</strong> nella campagna, registrando la motivazione nel log eventi.
          </p>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            MAIL-K connects to your Hostinger mailbox (<code>imap.hostinger.com:993</code>) to monitor undelivered bounce notifications automatically.
          </p>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <div className="font-bold uppercase tracking-wider">Strict Read-Only Guarantee:</div>
            <p>
              Connection is established with low-level <code>EXAMINE</code> mode and <code>BODY.PEEK[]</code>. No email is ever marked as read (<code>\Seen</code>), moved, or deleted. Your inbox remains untouched.
            </p>
          </div>
          <p className="text-xs text-[#5c5e63]">
            The RFC 3464 parser scans MAILER-DAEMON and postmaster notifications, isolates the failed address, and flags the lead as <strong>"failed"</strong> in the campaign log.
          </p>
        </div>
      ),
    },
    {
      id: 'cap-7',
      titleIt: '7. Risoluzione Problemi & FAQ',
      titleEn: '7. Troubleshooting & FAQ',
      badge: 'Supporto',
      contentIt: (
        <div className="space-y-4">
          <p>
            Se riscontri anomalie durante la configurazione o l'invio, consulta i controlli raccomandati:
          </p>
          <ul className="list-disc pl-5 text-sm text-[#5c5e63] space-y-2">
            <li><strong>Le email non partono:</strong> Verifica che la campagna sia in stato "Attiva" e non "In Pausa". Controlla l'orario locale (se sono le 20:00 o è weekend, il sistema è in pausa programmata per deliverability).</li>
            <li><strong>Errore SMTP/IMAP:</strong> Dalla pagina <code>/settings</code> esegui "Verifica Connessione SMTP" e "Verifica Connessione IMAP" per confermare le credenziali di Hostinger.</li>
            <li><strong>Caricamento CSV:</strong> Assicurati che il file sia salvato in formato UTF-8 e che la colonna delle email sia priva di caratteri speciali anomali.</li>
          </ul>
          <div className="pt-2">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#036e13] hover:underline"
            >
              <span>Consulta l'archivio completo delle Domande Frequenti (FAQ) →</span>
            </Link>
          </div>
        </div>
      ),
      contentEn: (
        <div className="space-y-4">
          <p>
            If you encounter unexpected behavior during setup or sending, check these common diagnostic steps:
          </p>
          <ul className="list-disc pl-5 text-sm text-[#5c5e63] space-y-2">
            <li><strong>Emails are not sending:</strong> Verify campaign state is "Active" (not "Paused"). Check current local time (if outside 09:00 - 18:00 or on weekends, sending is paused by design).</li>
            <li><strong>SMTP/IMAP Authentication Error:</strong> Go to <code>/settings</code> and click "Verify SMTP Connection" and "Verify IMAP Connection" to validate credentials.</li>
            <li><strong>CSV Upload Errors:</strong> Ensure the CSV file is UTF-8 encoded with valid email syntax in the mapped email column.</li>
          </ul>
          <div className="pt-2">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#036e13] hover:underline"
            >
              <span>Read the comprehensive Frequently Asked Questions (FAQ) →</span>
            </Link>
          </div>
        </div>
      ),
    },
  ];

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
                  USER MANUAL
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageSwitcher variant="transparent" />
            <Link
              href="/faq"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c5e63] hover:text-[#036e13] transition-colors px-3 py-2 rounded-lg hover:bg-black/5"
            >
              <span>FAQ</span>
            </Link>
            <a
              href="/downloads/MANUALE_UTENTE.txt"
              download="MANUALE_UTENTE.txt"
              className="inline-flex items-center justify-center gap-1.5 bg-white border border-[#eae8e5] hover:border-[#1b1c1a]/40 text-[#1b1c1a] font-label-md text-xs px-3.5 py-2 rounded-lg shadow-xs transition-all font-semibold"
            >
              <span>⬇</span>
              <span className="hidden md:inline">{t.userGuidePage.downloadManualButton}</span>
              <span className="md:hidden">.TXT</span>
            </a>
            <Link
              href="/campaigns"
              className="inline-flex items-center justify-center bg-[#5cb855] hover:bg-[#036e13] text-white font-label-md text-xs uppercase px-4 py-2 rounded-lg shadow-xs transition-all font-semibold tracking-wider"
            >
              {t.userGuidePage.backToApp}
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER WITH 2 COLUMNS */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-28 pb-24">
        {/* TOP TITLE BANNER */}
        <div className="mb-10 pb-6 border-b border-[#eae8e5]">
          <span className="inline-block px-3 py-1 bg-[#5cb855]/15 text-[#036e13] text-xs font-bold uppercase tracking-wider rounded-full mb-3 border border-[#5cb855]/30">
            {t.userGuidePage.badge}
          </span>
          <h1 className="font-headline-xl text-3xl sm:text-4xl font-bold text-[#1b1c1a] mb-2">
            {t.userGuidePage.title}
          </h1>
          <p className="font-body-md text-sm text-[#5c5e63]">
            {t.userGuidePage.subtitle} • <span className="font-medium text-[#1b1c1a]">{t.userGuidePage.lastUpdated}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* STICKY TABLE OF CONTENTS SIDEBAR (4 COLUMNS) */}
          <aside className="lg:col-span-4 sticky top-28 bg-white rounded-2xl border border-[#eae8e5] p-5 shadow-xs">
            <h3 className="font-headline-sm text-xs uppercase tracking-widest text-[#6f7a6b] font-bold mb-4">
              {t.userGuidePage.tableOfContents}
            </h3>
            <nav className="space-y-1.5">
              {chapters.map((ch) => {
                const isActive = activeSection === ch.id;
                const title = locale === 'en' ? ch.titleEn : ch.titleIt;

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(ch.id);
                      document.getElementById(ch.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#1b1c1a] text-white shadow-xs'
                        : 'text-[#5c5e63] hover:bg-[#f5f3f0] hover:text-[#1b1c1a]'
                    }`}
                  >
                    <span className="truncate pr-2">{title}</span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        isActive ? 'bg-[#5cb855] text-white' : 'bg-[#f5f3f0] text-[#6f7a6b]'
                      }`}
                    >
                      {ch.badge}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 pt-5 border-t border-[#eae8e5]">
              <a
                href="/downloads/MANUALE_UTENTE.txt"
                download="MANUALE_UTENTE.txt"
                className="w-full h-10 px-3 bg-[#5cb855]/15 hover:bg-[#5cb855]/25 text-[#036e13] border border-[#5cb855]/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span>⬇</span>
                <span>{t.userGuidePage.downloadManualButton}</span>
              </a>
            </div>
          </aside>

          {/* MAIN CONTENT AREA (8 COLUMNS) */}
          <section className="lg:col-span-8 space-y-10">
            {chapters.map((ch) => {
              const title = locale === 'en' ? ch.titleEn : ch.titleIt;
              const content = locale === 'en' ? ch.contentEn : ch.contentIt;

              return (
                <article
                  key={ch.id}
                  id={ch.id}
                  className="bg-white rounded-2xl border border-[#eae8e5] p-6 sm:p-8 shadow-xs scroll-mt-28"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-0.5 bg-[#5cb855]/15 text-[#036e13] font-bold text-[10px] uppercase rounded-full tracking-wider border border-[#5cb855]/30">
                      {ch.badge}
                    </span>
                  </div>
                  <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-[#1b1c1a] mb-5">
                    {title}
                  </h2>
                  <div className="font-body-md text-sm text-[#1b1c1a] leading-relaxed">
                    {content}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
