'use client';

import React, { useState } from 'react';
import { parseCsvString } from '@/lib/csv/parse';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader2, X, Users } from 'lucide-react';

interface NewsletterCsvImporterProps {
  newsletterId: string;
  onImportCompleted: () => void;
  onClose?: () => void;
}

export default function NewsletterCsvImporter({
  newsletterId,
  onImportCompleted,
  onClose,
}: NewsletterCsvImporterProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState<string>('');
  const [emailColumn, setEmailColumn] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Seleziona un file con estensione .csv');
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsvString(text);

      if (parsed.headers.length === 0) {
        setError('Nessuna colonna rilevata nel file CSV');
        return;
      }

      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Heuristic auto-mapping
      const lower = parsed.headers.map((h) => h.toLowerCase());
      const emailIdx = lower.findIndex((h) => h.includes('email') || h.includes('mail'));
      const nameIdx = lower.findIndex((h) => h.includes('nome') || h.includes('name') || h.includes('iscritto') || h.includes('contatto'));

      if (emailIdx !== -1) setEmailColumn(parsed.headers[emailIdx]);
      if (nameIdx !== -1) setNameColumn(parsed.headers[nameIdx]);

      setStep(2);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    if (!emailColumn) {
      setError('Seleziona la colonna corrispondente all’indirizzo email');
      return;
    }

    setLoading(true);
    setError(null);

    const subscribers = rawRows.map((row) => ({
      email: row[emailColumn]?.trim() || '',
      name: nameColumn ? row[nameColumn]?.trim() : undefined,
    }));

    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribers }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore durante l’importazione');
      }

      const resData = await res.json();
      setResult(resData);
      setStep(3);
      onImportCompleted();
    } catch (err: any) {
      setError(err.message || 'Errore di importazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#D8D2C8] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
        <div className="flex items-center space-x-2">
          <UploadCloud className="w-5 h-5 text-[#1A1A1E]" />
          <h3 className="text-sm font-bold text-[#1A1A1E]">Importa Iscritti da file CSV</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-[#666666] hover:text-[#1A1A1E] rounded hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="border-2 border-dashed border-[#D8D2C8] rounded-xl p-8 text-center bg-[#F7F5F0]/30 hover:bg-[#F7F5F0]/60 transition-colors">
          <Users className="w-10 h-10 text-[#666666] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#1A1A1E]">Trascina qui il file CSV degli iscritti</p>
          <p className="text-xs text-[#666666] mt-1 mb-4">Supporta separatore virgola (,) o punto e virgola (;)</p>
          <label className="inline-flex items-center px-4 py-2 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer">
            <span>Sfoglia file...</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-xs text-[#666666]">
            File caricato: <span className="font-semibold text-[#1A1A1E]">{rawRows.length} righe</span> rilevate. Associa le colonne corrispondenti:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                Colonna Email <span className="text-rose-500">*</span>
              </label>
              <select
                value={emailColumn}
                onChange={(e) => setEmailColumn(e.target.value)}
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              >
                <option value="">-- Seleziona colonna email --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1E] mb-1">
                Colonna Nome (Opzionale)
              </label>
              <select
                value={nameColumn}
                onChange={(e) => setNameColumn(e.target.value)}
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              >
                <option value="">-- Nessuna (solo email) --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F0EBE1]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3 py-1.5 text-xs text-[#666666] hover:text-[#1A1A1E]"
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={loading || !emailColumn}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Importa Iscritti</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result Summary */}
      {step === 3 && result && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Importazione completata con successo!</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-[#1A1A1E]">
              <div>
                <span className="font-semibold text-emerald-700">{result.imported}</span> iscritti importati
              </div>
              <div>
                <span className="font-semibold text-amber-700">{result.duplicates}</span> duplicati saltati
              </div>
              <div>
                <span className="font-semibold text-rose-700">{result.invalid}</span> email non valide
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                else setStep(1);
              }}
              className="px-4 py-2 rounded-lg bg-[#1A1A1E] text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
