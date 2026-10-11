'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LeadResearchJob, LeadResearchResult, LeadResearchSku } from '@/types/lead-research';

function LeadResearchContent() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const isNewParam = searchParams.get('new') === 'true';

  const [jobs, setJobs] = useState<LeadResearchJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<LeadResearchJob | null>(null);
  const [results, setResults] = useState<LeadResearchResult[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);

  // New Request Form State
  const [showNewModal, setShowNewModal] = useState<boolean>(isNewParam);
  const [brief, setBrief] = useState<string>('');
  const [sku, setSku] = useState<LeadResearchSku>('M');
  const [sector, setSector] = useState<string>('');
  const [territory, setTerritory] = useState<string>('');
  const [exclusions, setExclusions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Table filter
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Fetch jobs list
  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/lead-research');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        if (data.length > 0 && !selectedJob) {
          setSelectedJob(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load lead research jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Fetch results when selected job changes
  useEffect(() => {
    if (!selectedJob) {
      setResults([]);
      return;
    }

    const fetchJobDetails = async () => {
      setIsLoadingResults(true);
      try {
        const res = await fetch(`/api/lead-research/${selectedJob.id}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedJob(data.job);
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Failed to fetch job details:', err);
      } finally {
        setIsLoadingResults(false);
      }
    };

    fetchJobDetails();
  }, [selectedJob?.id]);

  // Handle Create New Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim() || brief.length < 5) {
      setErrorMessage(locale === 'en' ? 'Please describe your search criteria.' : 'Descrivi i requisiti della ricerca.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/lead-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          initial_brief: brief,
          sector: sector || undefined,
          territory: territory || undefined,
          exclusions: exclusions ? exclusions.split(',').map((s) => s.trim()) : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create job');
      }

      const created = await res.json();

      // Start the job immediately
      const startRes = await fetch(`/api/lead-research/${created.id}/start`, {
        method: 'POST',
      });
      const started = startRes.ok ? await startRes.json() : created;

      setShowNewModal(false);
      setBrief('');
      setSector('');
      setTerritory('');
      setExclusions('');
      await fetchJobs();
      setSelectedJob(started);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la creazione');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered results
  const filteredResults = results.filter((r) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.company_name?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative w-full overflow-hidden px-gutter pb-space-xl pt-space-md">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 rounded-full bg-[#5cb855]/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pb-space-lg">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5cb855]" />
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#5c5e63] font-semibold">
              {locale === 'en' ? 'B2B Discovery & Intelligence' : 'Discovery & Intelligence B2B'}
            </span>
            <span className="text-[#a2a59e] text-xs">•</span>
            <span className="font-label-sm text-label-sm text-[#5c5f59] font-medium">MAIL-K Precision</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#1b1c1a] tracking-tight">
            {locale === 'en' ? 'Lead Research' : 'Ricerca Leads'}
          </h1>
          <p className="font-body-lg text-body-lg text-[#3f4a3c] mt-1.5 leading-relaxed">
            {locale === 'en'
              ? 'Find verified companies and contacts supported by primary source URLs. Zero invented data, downloadable in formatted Excel and CSV.'
              : 'Ricerca e validazione mirata di contatti professionali estratti da fonti web pubbliche e verificate. Zero dati inventati, esportazione in Excel (.xlsx) e CSV.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setShowNewModal(true)}
            className="h-10 px-space-lg rounded-lg bg-[#30312f] text-[#f2f0ed] hover:bg-[#5c5e63] transition-all flex items-center gap-2 font-label-md text-label-md shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>{locale === 'en' ? 'New Research Request' : 'Nuova Ricerca Leads'}</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
            {locale === 'en' ? 'Active Jobs' : 'Ricerche Attive'}
          </span>
          <div className="mt-space-sm flex items-center justify-between">
            <span className="font-headline-lg text-headline-lg text-[#1b1c1a]">
              {jobs.filter((j) => ['in_progress', 'accepted', 'human_review'].includes(j.status)).length}
            </span>
            <span className="material-symbols-outlined text-[20px] text-[#5cb855]">sync</span>
          </div>
          <p className="font-label-sm text-label-sm text-[#5c5e63] mt-1">
            {jobs.length} {locale === 'en' ? 'total orders' : 'ordini totali'}
          </p>
        </div>

        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
            {locale === 'en' ? 'Leads Collected' : 'Lead Estratti (Attuale)'}
          </span>
          <div className="mt-space-sm flex items-center justify-between">
            <span className="font-headline-lg text-headline-lg text-[#1b1c1a]">{results.length}</span>
            <span className="material-symbols-outlined text-[20px] text-[#036e13]">groups</span>
          </div>
          <p className="font-label-sm text-label-sm text-[#036e13] font-medium mt-1">
            {locale === 'en' ? '100% sourced with citations' : '100% con fonte primaria'}
          </p>
        </div>

        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
            {locale === 'en' ? 'AD-HOC SLA' : 'SLA Consegna AD-HOC'}
          </span>
          <div className="mt-space-sm flex items-center justify-between">
            <span className="font-headline-lg text-headline-lg text-[#1b1c1a]">24h</span>
            <span className="material-symbols-outlined text-[20px] text-[#036e13]">schedule</span>
          </div>
          <p className="font-label-sm text-label-sm text-[#5c5e63] mt-1">
            {locale === 'en' ? 'Human team verification' : 'Controllo operatore umano'}
          </p>
        </div>

        <div className="bg-[#ffffff] p-space-md rounded-xl border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
            {locale === 'en' ? 'Data Quality Protocol' : 'Protocollo Qualità'}
          </span>
          <div className="mt-space-sm flex items-center justify-between">
            <span className="font-title-sm text-sm text-[#1b1c1a] font-semibold">Zero Invented Data</span>
            <span className="material-symbols-outlined text-[20px] text-[#036e13]">verified_user</span>
          </div>
          <p className="font-label-sm text-label-sm text-[#036e13] font-medium mt-1">
            {locale === 'en' ? 'Null if unverified on source' : 'Null se non presente su fonte'}
          </p>
        </div>
      </div>

      {/* Main Content Layout: Jobs History Sidebar + Active Job Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column: Job Selector List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e0]">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#5c5e63] font-semibold">
              {locale === 'en' ? 'Research Orders' : 'Cronologia Ricerche'}
            </span>
            <span className="font-label-sm text-xs text-[#5c5e63]">{jobs.length}</span>
          </div>

          {isLoadingJobs ? (
            <div className="p-8 text-center text-[#5c5e63] font-label-sm">
              <span className="material-symbols-outlined animate-spin text-2xl mb-2">sync</span>
              <p>{locale === 'en' ? 'Loading orders...' : 'Caricamento ricerche...'}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-[#e5e5e0] text-center">
              <span className="material-symbols-outlined text-3xl text-[#a2a59e] mb-2">search_off</span>
              <p className="font-title-sm text-sm text-[#1b1c1a]">
                {locale === 'en' ? 'No research orders yet' : 'Nessuna ricerca presente'}
              </p>
              <p className="font-body-md text-xs text-[#5c5e63] mt-1">
                {locale === 'en' ? 'Click "+ New Research" to start.' : 'Clicca su "+ Nuova Ricerca" per iniziare.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
              {jobs.map((j) => {
                const isSelected = selectedJob?.id === j.id;
                return (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJob(j)}
                    className={`p-space-md rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-[#1b1c1a] shadow-sm'
                        : 'bg-[#faf8f5] hover:bg-white border-[#e5e5e0]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#e5e5e0] text-[#1b1c1a]">
                        Ricerca {j.sku} • ${(j.price_cents / 100).toFixed(0)} USD
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          j.status === 'completed' || j.status === 'delivered'
                            ? 'bg-[#ecf8eb] text-[#036e13]'
                            : j.status === 'cancelled'
                            ? 'bg-[#fdeeed] text-[#b82525]'
                            : 'bg-[#fff5e6] text-[#b87010]'
                        }`}
                      >
                        {j.status}
                      </span>
                    </div>
                    <p className="font-title-sm text-sm text-[#1b1c1a] mt-2 line-clamp-1">
                      {j.title || j.initial_brief}
                    </p>
                    <p className="font-body-md text-xs text-[#5c5e63] mt-1 line-clamp-2">
                      {j.initial_brief}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#e5e5e0]/60 text-[11px] text-[#5c5e63]">
                      <span>{new Date(j.created_at).toLocaleDateString()}</span>
                      {j.sku === 'AD_HOC' && j.due_at && (
                        <span className="text-[#036e13] font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">alarm</span>
                          SLA: {new Date(j.due_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Job Detail & Results Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {selectedJob ? (
            <>
              {/* Selected Job Status & Action Bar */}
              <div className="p-space-lg rounded-xl bg-white border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md border-b border-[#e5e5e0]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1b1c1a] text-white font-label-sm text-xs font-bold uppercase">
                        Ricerca {selectedJob.sku}
                      </span>
                      <span className="text-xs text-[#5c5e63]">ID: {selectedJob.id.slice(0, 8)}</span>
                      {selectedJob.stop_reason && (
                        <span className="px-2 py-0.5 rounded bg-[#f5f3f0] text-[11px] text-[#5c5e63] font-medium">
                          Motivo: {selectedJob.stop_reason}
                        </span>
                      )}
                    </div>
                    <h2 className="font-headline-md text-xl text-[#1b1c1a] font-bold">
                      {selectedJob.title || selectedJob.initial_brief.slice(0, 50)}
                    </h2>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/lead-research/${selectedJob.id}/export?format=xlsx`}
                      className="h-9 px-3 rounded-lg bg-[#036e13] text-white hover:bg-[#02520e] transition-all flex items-center gap-1.5 font-label-sm text-xs font-semibold shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">table_view</span>
                      <span>Excel (.xlsx)</span>
                    </a>
                    <a
                      href={`/api/lead-research/${selectedJob.id}/export?format=csv`}
                      className="h-9 px-3 rounded-lg bg-[#f5f3f0] text-[#1b1c1a] hover:bg-[#eae8e5] border border-[#e5e5e0] transition-all flex items-center gap-1.5 font-label-sm text-xs font-medium"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>CSV</span>
                    </a>
                  </div>
                </div>

                {/* Brief & Parameters Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-space-md text-xs">
                  <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0]">
                    <span className="text-[#5c5e63] uppercase tracking-wider block font-semibold mb-1">
                      {locale === 'en' ? 'Brief Scope' : 'Perimetro Brief'}
                    </span>
                    <p className="text-[#1b1c1a] leading-relaxed line-clamp-3">
                      {selectedJob.initial_brief}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0]">
                    <span className="text-[#5c5e63] uppercase tracking-wider block font-semibold mb-1">
                      {locale === 'en' ? 'Service Specs' : 'Specifiche Pacchetto'}
                    </span>
                    <p className="text-[#1b1c1a]">
                      Prezzo: <strong>${(selectedJob.price_cents / 100).toFixed(2)} USD</strong>
                    </p>
                    <p className="text-[#5c5e63] mt-0.5">
                      {selectedJob.sku === 'AD_HOC'
                        ? 'SLA 24h dal team umano'
                        : `Limite API: $${((selectedJob.api_budget_micro_usd || 0) / 1_000_000).toFixed(2)} USD`}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0]">
                    <span className="text-[#5c5e63] uppercase tracking-wider block font-semibold mb-1">
                      {locale === 'en' ? 'Consumption / Delivery' : 'Consumo / Consegna'}
                    </span>
                    {selectedJob.sku === 'AD_HOC' ? (
                      <div>
                        <p className="text-[#036e13] font-semibold">
                          {selectedJob.due_at
                            ? `Consegna prevista: ${new Date(selectedJob.due_at).toLocaleString()}`
                            : 'In attesa di accettazione staff'}
                        </p>
                        <p className="text-[#5c5e63] text-[11px] mt-0.5">Controllo operatore 100%</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[#1b1c1a]">
                          Spesi:{' '}
                          <strong>
                            ${((selectedJob.api_spent_micro_usd || 0) / 1_000_000).toFixed(3)} USD
                          </strong>
                        </p>
                        <p className="text-[#5c5e63] text-[11px] mt-0.5">
                          Tetto massimo: $
                          {((selectedJob.api_budget_micro_usd || 0) / 1_000_000).toFixed(2)} USD
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Results Table Section */}
              <div className="p-space-lg rounded-xl bg-white border border-[#e5e5e0] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mb-space-md">
                  <div>
                    <h3 className="font-headline-sm text-lg text-[#1b1c1a] font-bold">
                      {locale === 'en' ? 'Extracted Companies & Contacts' : 'Aziende e Contatti Individuati'}
                    </h3>
                    <p className="font-body-md text-xs text-[#5c5e63]">
                      {filteredResults.length} {locale === 'en' ? 'results matching filters' : 'risultati'}
                    </p>
                  </div>

                  {/* Search filter in table */}
                  <div className="relative min-w-[240px]">
                    <span className="material-symbols-outlined text-[18px] text-[#a2a59e] absolute left-3 top-2.5">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder={locale === 'en' ? 'Filter by company, city, email...' : 'Filtra per azienda, città, email...'}
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0] text-xs text-[#1b1c1a] focus:bg-white focus:outline-none focus:border-[#1b1c1a]"
                    />
                  </div>
                </div>

                {/* Table */}
                {isLoadingResults ? (
                  <div className="p-12 text-center text-[#5c5e63]">
                    <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
                    <p className="text-xs">{locale === 'en' ? 'Loading contacts...' : 'Caricamento contatti...'}</p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="p-12 rounded-xl bg-[#faf8f5] text-center border border-[#e5e5e0]/60">
                    <span className="material-symbols-outlined text-3xl text-[#a2a59e] mb-2">contact_page</span>
                    <p className="font-title-sm text-sm text-[#1b1c1a]">
                      {selectedJob.status === 'in_progress'
                        ? locale === 'en'
                          ? 'Extraction in progress...'
                          : 'Estrazione dati in corso...'
                        : locale === 'en'
                        ? 'No leads matching current search.'
                        : 'Nessun lead disponibile per i filtri selezionati.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[#e5e5e0]">
                    <table className="w-full text-left text-xs text-[#1b1c1a]">
                      <thead className="bg-[#faf8f5] text-[#5c5e63] font-label-sm uppercase tracking-wider text-[11px] border-b border-[#e5e5e0]">
                        <tr>
                          <th className="py-2.5 px-3">Azienda / Studio</th>
                          <th className="py-2.5 px-3">Città / Sede</th>
                          <th className="py-2.5 px-3">Email Principale</th>
                          <th className="py-2.5 px-3">Telefono</th>
                          <th className="py-2.5 px-3">Sito Web</th>
                          <th className="py-2.5 px-3">Referente</th>
                          <th className="py-2.5 px-3">Stato Verifica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e5e0]/60 bg-white">
                        {filteredResults.map((r) => (
                          <tr key={r.id} className="hover:bg-[#faf8f5] transition-colors">
                            <td className="py-3 px-3 font-semibold text-[#1b1c1a]">
                              {r.company_name}
                            </td>
                            <td className="py-3 px-3 text-[#5c5e63]">
                              {r.city || r.region || '—'}
                            </td>
                            <td className="py-3 px-3">
                              {r.email ? (
                                <a
                                  href={`mailto:${r.email}`}
                                  className="text-[#036e13] font-medium hover:underline flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">mail</span>
                                  {r.email}
                                </a>
                              ) : (
                                <span className="text-[#a2a59e] italic">null (non presente)</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-[#5c5e63]">
                              {r.phone || '—'}
                            </td>
                            <td className="py-3 px-3">
                              {r.website ? (
                                <a
                                  href={r.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#5c5e63] hover:text-[#1b1c1a] flex items-center gap-1 truncate max-w-[140px]"
                                >
                                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                  {r.website.replace(/^https?:\/\//, '')}
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-3 text-[#5c5e63]">
                              {r.contact_person ? (
                                <span>
                                  {r.contact_person}
                                  {r.contact_role && ` (${r.contact_role})`}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {r.human_verified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecf8eb] text-[#036e13] font-semibold text-[10px]">
                                  <span className="material-symbols-outlined text-[12px]">verified</span>
                                  Umano
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f5f3f0] text-[#5c5e63] font-medium text-[10px]">
                                  <span className="material-symbols-outlined text-[12px]">public</span>
                                  Web Fonte
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-16 rounded-xl bg-white border border-[#e5e5e0] text-center">
              <span className="material-symbols-outlined text-4xl text-[#a2a59e] mb-3">person_search</span>
              <h3 className="font-headline-sm text-lg text-[#1b1c1a]">
                {locale === 'en' ? 'Select or start a Lead Research' : 'Seleziona o avvia una Ricerca Leads'}
              </h3>
              <p className="font-body-md text-xs text-[#5c5e63] mt-1 max-w-md mx-auto">
                {locale === 'en'
                  ? 'Describe the companies and professional contacts you need. Automated M/XL or dedicated AD-HOC with 24h delivery.'
                  : 'Descrivi le aziende o i professionisti che cerchi. Scegli tra Ricerca M ($19), Ricerca XL ($49) o Ricerca AD-HOC ($89) con consegna in 24 ore.'}
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-space-md h-10 px-space-lg rounded-lg bg-[#30312f] text-white hover:bg-[#5c5e63] transition-all font-label-md text-sm font-semibold"
              >
                + {locale === 'en' ? 'New Request' : 'Nuova Richiesta'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NEW REQUEST MODAL / DRAWER */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#e5e5e0] shadow-2xl p-space-lg flex flex-col max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-space-md border-b border-[#e5e5e0]">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f5f3f0] flex items-center justify-center text-[#1b1c1a]">
                  <span className="material-symbols-outlined text-[22px]">person_search</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-lg text-[#1b1c1a] font-bold">
                    {locale === 'en' ? 'New Lead Research' : 'Nuova Ricerca Leads'}
                  </h3>
                  <span className="font-label-sm text-xs text-[#5c5e63]">
                    {locale === 'en' ? 'Select package and define your brief' : 'Scegli il servizio e definisci il brief'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#a2a59e] hover:text-[#1b1c1a] p-1.5 rounded-lg hover:bg-[#f5f3f0] transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-[#fdeeed] text-[#b82525] text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateJob} className="flex flex-col gap-space-md mt-space-md">
              {/* Package Selector */}
              <div>
                <label className="font-label-sm text-xs uppercase tracking-wider text-[#5c5e63] font-semibold block mb-2">
                  {locale === 'en' ? '1. Select Service Package (USD)' : '1. Seleziona il Servizio (USD)'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option M */}
                  <div
                    onClick={() => setSku('M')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      sku === 'M'
                        ? 'border-[#1b1c1a] bg-[#faf8f5] shadow-xs'
                        : 'border-[#e5e5e0] hover:border-[#a2a59e] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-title-sm text-sm font-bold text-[#1b1c1a]">Ricerca M</span>
                      <span className="font-headline-sm text-base font-bold text-[#1b1c1a]">$19 USD</span>
                    </div>
                    <p className="font-body-md text-xs text-[#5c5e63] mt-1">
                      Automazione standard OpenAI + Tavily. Tetto massimo API: <strong>$5.00 USD</strong>.
                    </p>
                  </div>

                  {/* Option XL */}
                  <div
                    onClick={() => setSku('XL')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      sku === 'XL'
                        ? 'border-[#1b1c1a] bg-[#faf8f5] shadow-xs'
                        : 'border-[#e5e5e0] hover:border-[#a2a59e] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-title-sm text-sm font-bold text-[#1b1c1a]">Ricerca XL</span>
                      <span className="font-headline-sm text-base font-bold text-[#1b1c1a]">$49 USD</span>
                    </div>
                    <p className="font-body-md text-xs text-[#5c5e63] mt-1">
                      Scansione multi-step approfondita. Tetto massimo API: <strong>$15.00 USD</strong>.
                    </p>
                  </div>

                  {/* Option AD-HOC */}
                  <div
                    onClick={() => setSku('AD_HOC')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      sku === 'AD_HOC'
                        ? 'border-[#036e13] bg-[#ecf8eb]/40 shadow-xs'
                        : 'border-[#e5e5e0] hover:border-[#a2a59e] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-title-sm text-sm font-bold text-[#036e13]">AD-HOC</span>
                      <span className="font-headline-sm text-base font-bold text-[#036e13]">$89 USD</span>
                    </div>
                    <p className="font-body-md text-xs text-[#3f4a3c] mt-1 font-medium">
                      Ricerca condotta dal nostro team. Consegna entro 24 ore dall’accettazione.
                    </p>
                  </div>
                </div>
              </div>

              {/* Brief Input */}
              <div>
                <label className="font-label-sm text-xs uppercase tracking-wider text-[#5c5e63] font-semibold block mb-1.5">
                  {locale === 'en' ? '2. Search Brief' : '2. Descrizione e Obiettivo della Ricerca'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={
                    locale === 'en'
                      ? 'e.g., Search email, address, phone and website of luxury architecture and interior design studios in Milan and Rome...'
                      : 'es. Ricercami email, indirizzi, telefono e sito degli studi di architettura e contract d’alta gamma in Lombardia e Veneto...'
                  }
                  className="w-full p-3 rounded-xl bg-[#faf8f5] border border-[#e5e5e0] text-xs text-[#1b1c1a] focus:bg-white focus:outline-none focus:border-[#1b1c1a] leading-relaxed"
                />
              </div>

              {/* Optional Refinements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-xs text-[#5c5e63] font-medium block mb-1">
                    {locale === 'en' ? 'Territory / Target Cities' : 'Territorio / Città target'}
                  </label>
                  <input
                    type="text"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    placeholder="es. Italia, Milano, Roma"
                    className="w-full h-9 px-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0] text-xs text-[#1b1c1a] focus:bg-white focus:outline-none focus:border-[#1b1c1a]"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-xs text-[#5c5e63] font-medium block mb-1">
                    {locale === 'en' ? 'Sector / Industry' : 'Settore / Categoria'}
                  </label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="es. Architettura, Hotellerie, Luxury"
                    className="w-full h-9 px-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0] text-xs text-[#1b1c1a] focus:bg-white focus:outline-none focus:border-[#1b1c1a]"
                  />
                </div>
              </div>

              {/* Exclusions */}
              <div>
                <label className="font-label-sm text-xs text-[#5c5e63] font-medium block mb-1">
                  {locale === 'en' ? 'Exclusions (comma-separated)' : 'Esclusioni (separate da virgola)'}
                </label>
                <input
                  type="text"
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="es. portali di annunci, marketplace, freelance junior"
                  className="w-full h-9 px-3 rounded-lg bg-[#faf8f5] border border-[#e5e5e0] text-xs text-[#1b1c1a] focus:bg-white focus:outline-none focus:border-[#1b1c1a]"
                />
              </div>

              {/* Transparent Summary Notice */}
              <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#e5e5e0] text-xs text-[#5c5e63] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#036e13] flex-shrink-0 mt-0.5">
                  info
                </span>
                <p className="leading-relaxed">
                  <strong>Trasparenza contrattuale:</strong> Nessun numero di email è garantito a priori.
                  I contatti provengono esclusivamente da fonti web aperte. Nessun invio email o iscrizione
                  automatica a campagne viene effettuata da questo modulo.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-[#e5e5e0]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="h-10 px-space-md rounded-lg text-[#5c5e63] hover:text-[#1b1c1a] text-xs font-semibold"
                >
                  {locale === 'en' ? 'Cancel' : 'Annulla'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-space-lg rounded-lg bg-[#30312f] text-white hover:bg-[#5c5e63] transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                      <span>{locale === 'en' ? 'Creating...' : 'Creazione in corso...'}</span>
                    </>
                  ) : (
                    <span>
                      {locale === 'en' ? 'Confirm and Start Research' : 'Conferma e Avvia Ricerca'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#5c5e63] font-label-sm">
          <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
          <p>Caricamento console ricerca leads...</p>
        </div>
      }
    >
      <LeadResearchContent />
    </Suspense>
  );
}

