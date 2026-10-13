'use client';

import React, { useState, useRef } from 'react';
import VisualEmailEditor from '@/components/dummies/VisualEmailEditor';
import { UploadCloud, FileText, Loader2, AlertCircle, CheckCircle2, ClipboardPaste, Sparkles } from 'lucide-react';

interface Step4BodyEditorProps {
  value: string;
  onChange: (html: string) => void;
  onSubjectSuggested?: (subject: string) => void;
  onContentModified: () => void;
}

export default function Step4BodyEditor({
  value,
  onChange,
  onSubjectSuggested,
  onContentModified,
}: Step4BodyEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditorChange = (newHtml: string) => {
    onChange(newHtml);
    onContentModified();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setImportNotice(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const fileName = file.name.toLowerCase();

      // PDF
      if (fileName.endsWith('.pdf')) {
        const res = await fetch('/api/email-import/parse-pdf', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.message || 'Impossibile importare questo PDF.');
        }
        if (data.isScanned || !data.success) {
          setImportNotice({
            type: 'warn',
            message: data.message || 'Questo PDF non contiene testo selezionabile (sembra una scansione). Incolla il testo manualmente nell\'editor.',
          });
        } else if (data.html) {
          onChange(data.html);
          onContentModified();
          setImportNotice({
            type: 'success',
            message: `Testo recuperato da ${file.name}! Rivedilo e aggiustalo nell'editor qui sotto prima di confermare.`,
          });
        }
      }
      // EML, HTML, TXT
      else if (fileName.endsWith('.eml') || fileName.endsWith('.msg') || fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.txt')) {
        const res = await fetch('/api/email-import/parse', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.html) {
            onChange(data.html);
            onContentModified();
          }
          if (data.subject && onSubjectSuggested) {
            onSubjectSuggested(data.subject);
          }
          setImportNotice({
            type: 'success',
            message: `Email "${file.name}" importata con successo! Controlla e correggi il testo nell'editor.`,
          });
        } else {
          setImportNotice({
            type: 'error',
            message: data.error || 'Impossibile importare questo file.',
          });
        }
      } else {
        setImportNotice({
          type: 'error',
          message: 'Formato file non supportato. Puoi caricare file .eml, .html, .txt o .pdf.',
        });
      }
    } catch (err: any) {
      setImportNotice({
        type: 'error',
        message: err.message || 'Errore durante la lettura del file.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-[#1B1C1A]">4. Scrivi o importa il messaggio</h3>
          <p className="text-xs text-[#5C5E63] mt-1">
            Usa l'editor visivo senza toccare codice HTML, oppure carica un'email o un PDF già pronti.
          </p>
        </div>

        {/* Import file button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,.msg,.html,.htm,.txt,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-[#F5F3F0] hover:bg-[#EAE8E5] text-[#1B1C1A] text-xs font-semibold rounded-lg border border-[#D8D2C8] flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importazione...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-[#036E13]" />
                <span>Importa File (.eml / .pdf / .html)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Import Feedback Banner */}
      {importNotice && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            importNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : importNotice.type === 'warn'
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {importNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">{importNotice.message}</div>
        </div>
      )}

      {/* Visual WYSIWYG Editor */}
      <div>
        <VisualEmailEditor
          value={value}
          onChange={handleEditorChange}
          placeholder="Buongiorno {{azienda}},\n\nVi scriviamo per presentarvi la nostra nuova proposta..."
        />
      </div>

      {/* Formatting & Guidance Footer */}
      <div className="bg-[#FAF9F6] p-3.5 rounded-lg border border-[#E5E5E0] text-xs text-[#5C5E63] space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-[#1B1C1A]">
          <Sparkles className="w-3.5 h-3.5 text-[#036E13]" />
          <span>Consigli per un'email efficace:</span>
        </div>
        <p className="leading-relaxed">
          Puoi incollare testo già formattato da Word o da un'altra email: i collegamenti e i paragrafi verranno conservati puliti. 
          Ricorda che le variabili come <strong>{'{{azienda}}'}</strong> verranno sostituite automaticamente per ciascun destinatario prima della spedizione.
        </p>
      </div>
    </div>
  );
}
