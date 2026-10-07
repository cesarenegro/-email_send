'use client';

import React, { useState } from 'react';
import { parseCsvString } from '@/lib/csv/parse';
import { UploadCloud, CheckCircle, AlertCircle, ArrowRight, Loader2, X } from 'lucide-react';

interface CsvImporterProps {
  campaignId: string;
  onImportCompleted: () => void;
  onClose?: () => void;
}

export default function CsvImporter({ campaignId, onImportCompleted, onClose }: CsvImporterProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [companyColumn, setCompanyColumn] = useState<string>('');
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
    setFile(selected);

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
      const companyIdx = lower.findIndex((h) => h.includes('azienda') || h.includes('company') || h.includes('nome') || h.includes('ragione'));

      if (emailIdx !== -1) setEmailColumn(parsed.headers[emailIdx]);
      if (companyIdx !== -1) setCompanyColumn(parsed.headers[companyIdx]);

      setStep(2);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleStartImport = async () => {
    if (!emailColumn) {
      setError('Seleziona la colonna corrispondente all’email');
      return;
    }

    setLoading(true);
    setError(null);

    const mappedLeads = rawRows.map((row) => ({
      company_name: companyColumn ? row[companyColumn] : '',
      email: row[emailColumn] || '',
    }));

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: mappedLeads }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l’importazione');
      }

      setResult(data);
      setStep(3);
      onImportCompleted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D2C8] rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-[#D8D2C8] mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1E]">Importazione Contatti da CSV</h3>
          <p className="text-sm text-[#666666]">Carica i lead associando il nome azienda all&apos;indirizzo email</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#666666] hover:text-[#1A1A1E]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="border-2 border-dashed border-[#D8D2C8] rounded-lg p-8 text-center bg-[#F7F5F0]">
          <UploadCloud className="w-12 h-12 text-[#666666] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1A1A1E] mb-1">Seleziona o trascina un file CSV</p>
          <p className="text-xs text-[#666666] mb-4">Supporta delimitatori virgola, punto e virgola, UTF-8</p>
          <label className="inline-flex items-center px-4 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded cursor-pointer hover:bg-[#333333] transition-colors">
            <span>Scegli file CSV</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      {/* STEP 2: Mapping & Preview */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
                Colonna Nome Azienda <span className="text-xs text-[#666666]">(opzionale)</span>
              </label>
              <select
                value={companyColumn}
                onChange={(e) => setCompanyColumn(e.target.value)}
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded bg-white text-sm text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              >
                <option value="">-- Seleziona o ignora --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1E] mb-1">
                Colonna Email <span className="text-rose-600">*</span>
              </label>
              <select
                value={emailColumn}
                onChange={(e) => setEmailColumn(e.target.value)}
                className="w-full px-3 py-2 border border-[#D8D2C8] rounded bg-white text-sm text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
              >
                <option value="">-- Seleziona colonna email --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2">
              Anteprima prime 10 righe ({rawRows.length} totali lette)
            </h4>
            <div className="border border-[#D8D2C8] rounded overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F0] border-b border-[#D8D2C8]">
                  <tr>
                    <th className="px-3 py-2 font-medium text-[#1A1A1E]">#</th>
                    <th className="px-3 py-2 font-medium text-[#1A1A1E]">Azienda ({companyColumn || 'Nessuna'})</th>
                    <th className="px-3 py-2 font-medium text-[#1A1A1E]">Email ({emailColumn || 'Nessuna'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D2C8]">
                  {rawRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F7F5F0]">
                      <td className="px-3 py-1.5 text-[#666666]">{idx + 1}</td>
                      <td className="px-3 py-1.5 text-[#1A1A1E]">{companyColumn ? row[companyColumn] || '-' : '-'}</td>
                      <td className="px-3 py-1.5 font-mono text-[#1A1A1E]">{emailColumn ? row[emailColumn] || '-' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#D8D2C8]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-[#666666] hover:text-[#1A1A1E]"
            >
              Cambia file
            </button>
            <button
              type="button"
              disabled={loading || !emailColumn}
              onClick={handleStartImport}
              className="flex items-center space-x-2 px-5 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importazione...</span>
                </>
              ) : (
                <>
                  <span>Importa {rawRows.length} Contatti</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Result Summary */}
      {step === 3 && result && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-800">Importazione Completata</h4>
              <p className="text-xs text-emerald-700 mt-1">
                Righe lette: <strong>{result.totalRead}</strong> | Importati con successo:{' '}
                <strong>{result.imported}</strong> | Duplicati ignorati: <strong>{result.duplicates}</strong> | Email
                non valide: <strong>{result.invalid.length}</strong>
              </p>
            </div>
          </div>

          {result.invalid.length > 0 && (
            <div className="border border-[#D8D2C8] rounded p-3">
              <h5 className="text-xs font-semibold text-[#1A1A1E] mb-2">Righe scartate ({result.invalid.length}):</h5>
              <div className="max-h-36 overflow-y-auto text-xs space-y-1 text-[#666666]">
                {result.invalid.map((inv: any, i: number) => (
                  <div key={i} className="flex justify-between border-b border-[#D8D2C8] py-1">
                    <span>Riga {inv.row}: &ldquo;{inv.email}&rdquo;</span>
                    <span className="text-rose-600">{inv.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-[#D8D2C8]">
            <button
              onClick={() => {
                if (onClose) onClose();
                else {
                  setStep(1);
                  setResult(null);
                }
              }}
              className="px-4 py-2 bg-[#1A1A1E] text-white text-sm font-medium rounded hover:bg-[#333333]"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
