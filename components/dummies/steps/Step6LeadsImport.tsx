'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, AlertCircle, Users, Loader2, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { validateAndDeduplicateLeads, ValidatedLead } from '@/lib/csv/validate-lead';

export interface LeadsState {
  rawRows: Record<string, string>[];
  headers: string[];
  companyColumn: string;
  emailColumn: string;
  validLeads: ValidatedLead[];
  duplicatesCount: number;
  invalidRows: { row: number; email: string; reason: string }[];
  fileName?: string;
  isReady: boolean;
}

interface Step6LeadsImportProps {
  data: LeadsState;
  onUpdate: (data: Partial<LeadsState>) => void;
}

export default function Step6LeadsImport({ data, onUpdate }: Step6LeadsImportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorList, setShowErrorList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processRowsWithMapping = (
    rows: Record<string, string>[],
    emailCol: string,
    companyCol: string
  ) => {
    const prepared = rows.map((r) => ({
      email: r[emailCol] || '',
      company_name: companyCol ? r[companyCol] : '',
    }));

    const result = validateAndDeduplicateLeads(prepared);

    onUpdate({
      emailColumn: emailCol,
      companyColumn: companyCol,
      validLeads: result.valid,
      duplicatesCount: result.duplicates,
      invalidRows: result.invalid,
      isReady: result.valid.length > 0,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/leads/parse-file', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Impossibile leggere il file');
      }

      const headers: string[] = resData.headers || [];
      const rows: Record<string, string>[] = resData.rows || [];

      // Auto-detect columns
      const lower = headers.map((h) => h.toLowerCase());
      const emailIdx = lower.findIndex((h) => h.includes('email') || h.includes('mail'));
      const companyIdx = lower.findIndex((h) =>
        h.includes('azienda') || h.includes('company') || h.includes('ragione') || h.includes('nome') || h.includes('studio')
      );

      const detectedEmailCol = emailIdx !== -1 ? headers[emailIdx] : headers[0] || '';
      const detectedCompanyCol = companyIdx !== -1 ? headers[companyIdx] : '';

      onUpdate({
        fileName: file.name,
        headers,
        rawRows: rows,
      });

      processRowsWithMapping(rows, detectedEmailCol, detectedCompanyCol);
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento del file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEmailColChange = (newCol: string) => {
    processRowsWithMapping(data.rawRows, newCol, data.companyColumn);
  };

  const handleCompanyColChange = (newCol: string) => {
    processRowsWithMapping(data.rawRows, data.emailColumn, newCol);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1B1C1A]">6. Carica l'elenco dei contatti (Destinatari)</h3>
        <p className="text-xs text-[#5C5E63] mt-1">
          Supporta file Excel (<strong>.xlsx</strong>) e file <strong>.csv</strong>. Individuiamo automaticamente le colonne giuste.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white p-5 rounded-xl border border-[#D8D2C8] shadow-xs space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#D8D2C8] hover:border-[#036E13] rounded-xl p-8 text-center cursor-pointer bg-[#FAF9F6] hover:bg-[#F5F3F0] transition-colors"
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-xs text-[#5C5E63]">
              <Loader2 className="w-8 h-8 animate-spin text-[#036E13]" />
              <span className="font-semibold text-[#1B1C1A]">Lettura file in corso...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#E4E2DF] flex items-center justify-center text-[#036E13]">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-[#1B1C1A]">
                {data.fileName ? `File caricato: ${data.fileName}` : 'Clicca per scegliere o trascina qui il file dei contatti'}
              </div>
              <p className="text-xs text-[#5C5E63]">
                Formati supportati: <strong>Excel (.xlsx)</strong> e <strong>CSV (.csv)</strong>
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Column Mapping (if file loaded) */}
        {data.headers.length > 0 && (
          <div className="pt-4 border-t border-[#E5E5E0] space-y-3">
            <span className="text-xs font-semibold text-[#1B1C1A] uppercase tracking-wider block">
              Associazione colonne rilevate:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#5C5E63] font-medium mb-1">
                  Colonna con l'Indirizzo Email <span className="text-rose-600">*</span>
                </label>
                <select
                  value={data.emailColumn}
                  onChange={(e) => handleEmailColChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D8D2C8] rounded-lg font-medium text-[#1B1C1A] focus:outline-none focus:ring-1 focus:ring-[#036E13]"
                >
                  {data.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#5C5E63] font-medium mb-1">
                  Colonna con Nome Azienda (opzionale)
                </label>
                <select
                  value={data.companyColumn}
                  onChange={(e) => handleCompanyColChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D8D2C8] rounded-lg font-medium text-[#1B1C1A] focus:outline-none focus:ring-1 focus:ring-[#036E13]"
                >
                  <option value="">-- Nessuna colonna (solo email) --</option>
                  {data.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Results Summary */}
        {data.rawRows.length > 0 && (
          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[#5C5E63] block font-medium">Contatti validi pronti:</span>
                <span className="text-lg font-bold text-emerald-800">{data.validLeads.length}</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[#5C5E63] block font-medium">Duplicati esclusi:</span>
                <span className="text-lg font-bold text-amber-800">{data.duplicatesCount}</span>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-[#5C5E63] block font-medium">Indirizzi errati / scartati:</span>
                <span className="text-lg font-bold text-rose-800">{data.invalidRows.length}</span>
              </div>
            </div>

            {/* Invalid rows inspection */}
            {data.invalidRows.length > 0 && (
              <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#E5E5E0] text-xs">
                <button
                  type="button"
                  onClick={() => setShowErrorList(!showErrorList)}
                  className="flex items-center justify-between w-full font-semibold text-[#1B1C1A] hover:underline"
                >
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Visualizza dettagli dei {data.invalidRows.length} contatti scartati</span>
                  </span>
                  {showErrorList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showErrorList && (
                  <div className="mt-2.5 max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] pt-2 border-t border-[#E5E5E0]">
                    {data.invalidRows.slice(0, 50).map((inv, idx) => (
                      <div key={idx} className="flex justify-between text-[#5C5E63] py-0.5">
                        <span>Riga {inv.row}: &quot;{inv.email || '(vuoto)'}&quot;</span>
                        <span className="text-rose-600 font-sans">{inv.reason}</span>
                      </div>
                    ))}
                    {data.invalidRows.length > 50 && (
                      <div className="text-neutral-400 italic">...altri {data.invalidRows.length - 50} errori omessi per brevità</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
