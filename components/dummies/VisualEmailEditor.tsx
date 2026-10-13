'use client';

import React, { useRef, useEffect } from 'react';
import { sanitizeEmailHtml, escapeHtml, sanitizeUrl } from '@/lib/security/sanitize-html';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Tag,
  Eraser,
} from 'lucide-react';

interface VisualEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function VisualEmailEditor({
  value,
  onChange,
  placeholder = 'Scrivi qui il corpo della tua email...',
  disabled = false,
}: VisualEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef<boolean>(false);

  // Sync incoming value to DOM only if it changed externally, applying sanitization
  useEffect(() => {
    if (editorRef.current) {
      const sanitized = sanitizeEmailHtml(value || '');
      if (!isInternalChangeRef.current && editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized;
      }
      isInternalChangeRef.current = false;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChangeRef.current = true;
      const html = sanitizeEmailHtml(editorRef.current.innerHTML);
      onChange(html);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInsertLink = () => {
    if (disabled) return;
    const url = window.prompt('Inserisci il link (URL):', 'https://');
    if (url && url !== 'https://') {
      const safe = sanitizeUrl(url);
      if (safe && safe !== '#') {
        executeCommand('createLink', safe);
      }
    }
  };

  const handleInsertPlaceholder = (placeholderTag: string) => {
    if (disabled) return;
    executeCommand('insertText', placeholderTag);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Robust sanitization on paste: escapes HTML characters to prevent XSS injection
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    // Convert double linebreaks into paragraphs with escaped HTML content
    const paragraphs = text
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6;">${escapeHtml(p).replace(/\r?\n/g, '<br/>')}</p>`)
      .join('');

    executeCommand('insertHTML', paragraphs || escapeHtml(text));
  };

  return (
    <div className="border border-[#D8D2C8] rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-[#036E13]/30 transition-all">
      {/* Toolbar */}
      <div className="bg-[#F5F3F0] border-b border-[#E5E5E0] px-3 py-2 flex flex-wrap items-center gap-1.5 select-none">
        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Titolo Principale"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Sottotitolo"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('formatBlock', '<p>')}
          className="px-2 py-1 text-xs font-semibold rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Testo Normale"
        >
          Testo
        </button>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('bold')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Grassetto (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('italic')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Corsivo (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('underline')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Sottolineato (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Elenco Puntato"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Elenco Numerato"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleInsertLink}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#1B1C1A] disabled:opacity-40 transition-colors"
          title="Inserisci Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[#D8D2C8] mx-1" />

        {/* Placeholders chips */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#5C5E63] font-medium hidden sm:inline">Personalizza:</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleInsertPlaceholder('{{azienda}}')}
            className="px-2 py-0.5 text-[11px] font-semibold bg-[#E4E2DF] hover:bg-[#D8D2C8] text-[#1B1C1A] rounded-full border border-[#D8D2C8] flex items-center gap-1 transition-colors"
            title="Inserisce il nome dell'azienda del destinatario"
          >
            <Tag className="w-3 h-3 text-[#036E13]" />
            <span>Nome Azienda</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleInsertPlaceholder('{{email}}')}
            className="px-2 py-0.5 text-[11px] font-semibold bg-[#E4E2DF] hover:bg-[#D8D2C8] text-[#1B1C1A] rounded-full border border-[#D8D2C8] flex items-center gap-1 transition-colors"
            title="Inserisce l'indirizzo email del destinatario"
          >
            <Tag className="w-3 h-3 text-[#036E13]" />
            <span>Email</span>
          </button>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 rounded hover:bg-[#EAE8E5] text-[#5C5E63] disabled:opacity-40 transition-colors"
          title="Rimuovi Formattazione"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="min-h-[220px] max-h-[420px] overflow-y-auto p-4 text-sm text-[#1B1C1A] font-sans leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#A2A59E] empty:before:pointer-events-none"
      />
    </div>
  );
}
