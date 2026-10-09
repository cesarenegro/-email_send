'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, Send, Calendar, Clock, Eye, Code, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import EmailPreview from '@/components/EmailPreview';

const TIMEZONES = [
  { value: 'Europe/Rome', label: 'Europa / Roma (CET/CEST)' },
  { value: 'America/New_York', label: 'America / New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America / Los Angeles (PST/PDT)' },
  { value: 'Asia/Dubai', label: 'Asia / Dubai (GST)' },
  { value: 'Asia/Makassar', label: 'Asia / Bali - Makassar (WITA)' },
];

export default function NewsletterForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [isScheduled, setIsScheduled] = useState(true);
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Default to tomorrow at 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [sendInterval, setSendInterval] = useState(60);

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInsertPlaceholder = (placeholder: string) => {
    setHtmlContent((prev) => prev + placeholder);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!title.trim()) {
      setError('Inserisci il titolo interno della newsletter');
      setLoading(false);
      return;
    }

    if (!subject.trim()) {
      setError("Inserisci l'oggetto dell'email");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        html_content: htmlContent,
        timezone,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        send_interval_seconds: sendInterval,
      };

      const res = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore durante la creazione della newsletter');
      }

      const created = await res.json();
      router.push(`/newsletters/${created.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Errore imprevisto');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-[#D8D2C8] bg-white text-[#666666] hover:text-[#1A1A1E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">Nuova Newsletter</h1>
            <p className="text-xs text-[#666666]">
              Configura i dettagli della newsletter, imposta la programmazione e componi il messaggio.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#1A1A1E] text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Salva e Continua</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info & Scheduling */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#D8D2C8] rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1E] uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              <span>Dettagli Base</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">
                Titolo Interno <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Es. Newsletter Ottobre 2026 - Novità"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              />
              <p className="text-[11px] text-[#666666] mt-1">Visibile solo a te per identificare la newsletter.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">
                Oggetto Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Es. Novità e aggiornamenti importanti per te"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              />
              <p className="text-[11px] text-[#666666] mt-1">L&apos;oggetto effettivo che leggeranno i destinatari.</p>
            </div>
          </div>

          <div className="bg-white border border-[#D8D2C8] rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1E] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Programmazione</span>
            </h2>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isScheduled"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="rounded border-[#D8D2C8] text-[#1A1A1E] focus:ring-0"
              />
              <label htmlFor="isScheduled" className="text-xs font-semibold text-[#1A1A1E] cursor-pointer">
                Pianifica invio automatico a una data specifica
              </label>
            </div>

            {isScheduled && (
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1E]">Data e Ora di Inizio Invio</label>
                <input
                  type="datetime-local"
                  required={isScheduled}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">Fuso Orario</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E]">
                Intervallo tra invii (secondi)
              </label>
              <input
                type="number"
                min="30"
                step="5"
                value={sendInterval}
                onChange={(e) => setSendInterval(Math.max(30, parseInt(e.target.value) || 60))}
                className="mt-1 w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              />
              <p className="text-[11px] text-[#666666] mt-1">
                Cadenza tra un destinatario e il successivo (minimo 30 sec).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: HTML Content & Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#D8D2C8] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 border-b border-[#D8D2C8] flex items-center justify-between bg-[#F7F5F0]/60">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'editor'
                      ? 'bg-white text-[#1A1A1E] shadow-sm border border-[#D8D2C8]'
                      : 'text-[#666666] hover:text-[#1A1A1E]'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Editor HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-white text-[#1A1A1E] shadow-sm border border-[#D8D2C8]'
                      : 'text-[#666666] hover:text-[#1A1A1E]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Anteprima Live</span>
                </button>
              </div>

              {/* Personalization pills */}
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-[#666666] text-[11px] hidden sm:inline">Tag:</span>
                <button
                  type="button"
                  onClick={() => handleInsertPlaceholder('{{email}}')}
                  className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#1A1A1E] font-mono text-[11px] hover:bg-stone-200"
                >
                  &#123;&#123;email&#125;&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertPlaceholder('{{nome}}')}
                  className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[#1A1A1E] font-mono text-[11px] hover:bg-stone-200"
                >
                  &#123;&#123;nome&#125;&#125;
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col min-h-[420px]">
              {activeTab === 'editor' ? (
                <div className="flex-1 flex flex-col">
                  <textarea
                    rows={18}
                    placeholder="Incolla o componi qui il codice HTML della tua newsletter..."
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full flex-1 p-3 border border-[#D8D2C8] rounded-lg font-mono text-xs bg-stone-50/50 text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E] resize-y"
                  />
                  <p className="text-[11px] text-[#666666] mt-2">
                    Suggerimento: puoi incollare template HTML responsive completi. I placeholder come &#123;&#123;email&#125;&#125; e &#123;&#123;nome&#125;&#125; verranno sostituiti per ciascun iscritto.
                  </p>
                </div>
              ) : (
                <div className="flex-1 border border-[#D8D2C8] rounded-lg overflow-hidden bg-white p-2">
                  <EmailPreview
                    htmlTemplate={htmlContent}
                    sampleData={{
                      email: 'mario.rossi@example.com',
                      company_name: 'Mario Rossi',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
